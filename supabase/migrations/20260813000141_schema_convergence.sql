-- Production Foundation: converge the repository replay with the hardened
-- Development contracts while removing UI-review-only drift.

BEGIN;

-- UI review migration 00103 was authored against the retired pvp_tickets
-- schema. Restore the canonical pvp_points implementation.
CREATE OR REPLACE FUNCTION public.sync_and_recover_vitality_and_pvp_points(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%rowtype;
  v_now timestamptz := now();
  v_vitality_recovered integer;
  v_pvp_recovered integer;
  v_out_vitality integer;
  v_out_pvp_points integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found'; END IF;
  v_vitality_recovered := floor(extract(epoch FROM (v_now - coalesce(v_user.vitality_last_recovered_at, v_now))) / 300);
  v_pvp_recovered := floor(extract(epoch FROM (v_now - coalesce(v_user.pvp_points_last_recovered_at, v_now))) / 3600);
  UPDATE public.users SET
    vitality = least(100, vitality + greatest(v_vitality_recovered, 0)),
    vitality_last_recovered_at = CASE WHEN v_vitality_recovered > 0 THEN v_now ELSE vitality_last_recovered_at END,
    pvp_points = least(5, pvp_points + greatest(v_pvp_recovered, 0)),
    pvp_points_last_recovered_at = CASE WHEN v_pvp_recovered > 0 THEN v_now ELSE pvp_points_last_recovered_at END
  WHERE id = p_user_id
  RETURNING vitality, pvp_points INTO v_out_vitality, v_out_pvp_points;
  RETURN jsonb_build_object('out_vitality', v_out_vitality, 'out_pvp_points', v_out_pvp_points);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_pvp_point(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_points integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT pvp_points INTO v_points FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF v_points IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF v_points < 1 THEN RAISE EXCEPTION 'insufficient pvp points'; END IF;
  UPDATE public.users SET pvp_points = pvp_points - 1,
    pvp_points_last_recovered_at = CASE WHEN pvp_points = 5 THEN now() ELSE pvp_points_last_recovered_at END
  WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Keep one unambiguous text[] loadout contract. It accepts both owned-row IDs
-- and stable master IDs and was already verified in Development.
DROP FUNCTION IF EXISTS public.save_pvp_defense_deck(uuid[], text);
DROP FUNCTION IF EXISTS public.save_gvg_defense_deck(uuid[]);

-- Restore the established JSONB ranking contract. PostgREST cannot safely
-- replace its return type without an explicit drop.
DROP FUNCTION IF EXISTS public.get_public_power_rankings();
CREATE FUNCTION public.get_public_power_rankings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(ranking_row) ORDER BY ranking_row.current_power DESC)
    FROM (
      SELECT ranking.user_id, ranking.total_power AS current_power, ranking.updated_at,
             player.username, player.avatar_url,
             member.guild_id, guild.name AS guild_name
      FROM public.user_power_rankings ranking
      LEFT JOIN public.users player ON player.id = ranking.user_id
      LEFT JOIN public.guild_members member ON member.user_id = ranking.user_id
      LEFT JOIN public.guilds guild ON guild.id = member.guild_id
    ) ranking_row
  ), '[]'::jsonb);
END;
$$;

-- Current username validation is eight characters. The old Development body
-- generated a nine-character fallback (user_ + 4), so converge on u + 7.
CREATE OR REPLACE FUNCTION public.ensure_current_player_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT username INTO v_name FROM public.users WHERE id = v_user_id;
  IF v_name IS NULL THEN
    v_name := 'u' || substring(replace(v_user_id::text, '-', '') FROM 1 FOR 7);
    INSERT INTO public.users (id, username, current_base_id, favorite_character_id)
    VALUES (v_user_id, v_name, 'neon_tower', '11111111-1111-1111-1111-111111111111')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN v_user_id;
END;
$$;

-- Only players with a saved defense deck are valid PvP opponents.
CREATE OR REPLACE FUNCTION public.get_pvp_opponents(p_user_id uuid, p_my_points integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(candidate.row_data), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'opponent_user_id', player.id,
      'opponent_username', player.username,
      'opponent_guild_name', coalesce(guild.name, '無所属'),
      'opponent_points', coalesce(rank.rank_points, 1000),
      'tactic', coalesce(deck.tactic, 'BALANCED'),
      'opponent_guild_main_alignment', 'NEUTRAL',
      'opponent_guild_sub_alignment', 'NEUTRAL',
      'defense_character_ids', to_jsonb(array_remove(array[
        deck.character_1_id, deck.character_2_id, deck.character_3_id,
        deck.character_4_id, deck.character_5_id
      ]::text[], NULL))
    ) AS row_data
    FROM public.users player
    JOIN public.pvp_defense_decks deck ON deck.user_id = player.id
    LEFT JOIN public.pvp_ranks rank ON rank.user_id = player.id
    LEFT JOIN public.guild_members member ON member.user_id = player.id
    LEFT JOIN public.guilds guild ON guild.id = member.guild_id
    WHERE player.id <> p_user_id
      AND (p_my_points IS NULL OR abs(coalesce(rank.rank_points, 1000) - p_my_points) <= 300)
    ORDER BY abs(coalesce(rank.rank_points, 1000) - coalesce(p_my_points, 1000)), player.id
    LIMIT 5
  ) candidate;
  RETURN v_result;
END;
$$;

-- UI-review fixture policies were never part of the verified Development
-- contract and expose more GvG state than the current client needs.
DROP POLICY IF EXISTS "authenticated read gvg match sessions" ON public.gvg_match_sessions;
DROP POLICY IF EXISTS "authenticated read gvg snapshots" ON public.gvg_match_member_snapshots;
DROP POLICY IF EXISTS "owner read gvg attack logs" ON public.gvg_attack_logs;

-- Canonical battle/progression masters are server-only. RLS provides a second
-- boundary in addition to revoked table privileges.
ALTER TABLE public.character_battle_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_battle_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_level_up_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_battle_master ENABLE ROW LEVEL SECURITY;

-- Idempotent Production QA exclusion for Development convergence as well.
DROP FUNCTION IF EXISTS public.provision_qa_fixture();
DROP FUNCTION IF EXISTS public.provision_qa_cosmetic_fixture();
DROP FUNCTION IF EXISTS public.provision_qa_character_cosmetic_fixture();
DROP FUNCTION IF EXISTS public.provision_qa_ui1_fixture();
DROP FUNCTION IF EXISTS public.apply_qa_ui1_fixture(uuid);

REVOKE ALL ON FUNCTION public.sync_and_recover_vitality_and_pvp_points(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_pvp_point(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_power_rankings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_current_player_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_pvp_opponents(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_and_recover_vitality_and_pvp_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_pvp_point(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_power_rankings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_current_player_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pvp_opponents(uuid, integer) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
