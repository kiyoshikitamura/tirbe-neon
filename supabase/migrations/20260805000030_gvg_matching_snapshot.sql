-- Freeze GvG defense decks and power at match confirmation.
ALTER TABLE public.gvg_defense_decks
  ADD COLUMN IF NOT EXISTS guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS gvg_defense_decks_guild_user_idx
  ON public.gvg_defense_decks (guild_id, user_id);

UPDATE public.gvg_defense_decks deck
SET guild_id = member.guild_id
FROM public.guild_members member
WHERE deck.user_id = member.user_id AND deck.guild_id IS NULL;

CREATE OR REPLACE FUNCTION public.snapshot_gvg_match_members(p_match_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.gvg_match_sessions%ROWTYPE;
  v_member RECORD;
  v_side TEXT;
  v_deck JSONB;
  v_power BIGINT;
BEGIN
  SELECT * INTO v_match FROM public.gvg_match_sessions
  WHERE id = p_match_session_id FOR UPDATE;
  IF NOT FOUND OR v_match.status NOT IN ('MATCHING', 'CONFIRMED') THEN
    RAISE EXCEPTION 'GvG match cannot be snapshotted';
  END IF;
  DELETE FROM public.gvg_match_member_snapshots WHERE match_session_id = p_match_session_id;

  FOR v_member IN
    SELECT member.guild_id, member.user_id FROM public.guild_members member
    WHERE member.guild_id = v_match.guild_a_id OR member.guild_id = v_match.guild_b_id
  LOOP
    v_side := CASE WHEN v_member.guild_id = v_match.guild_a_id THEN 'A' ELSE 'B' END;
    SELECT to_jsonb(array_remove(ARRAY[
      deck.character_1_id, deck.character_2_id, deck.character_3_id, deck.character_4_id, deck.character_5_id
    ], NULL)) INTO v_deck
    FROM public.gvg_defense_decks deck
    WHERE deck.user_id = v_member.user_id AND deck.guild_id = v_member.guild_id;
    SELECT COALESCE(ranking.total_power, 0) INTO v_power
    FROM public.user_power_rankings ranking WHERE ranking.user_id = v_member.user_id;
    INSERT INTO public.gvg_match_member_snapshots (
      match_session_id, side, guild_id, user_id, defense_deck, defense_is_npc, npc_power
    ) VALUES (
      p_match_session_id, v_side, v_member.guild_id, v_member.user_id,
      COALESCE(v_deck, '[]'::jsonb), COALESCE(jsonb_array_length(v_deck), 0) = 0,
      CASE WHEN COALESCE(jsonb_array_length(v_deck), 0) = 0 THEN GREATEST(1, COALESCE(v_power, 0)) ELSE NULL END
    );
  END LOOP;

  IF v_match.is_npc_match THEN
    INSERT INTO public.gvg_match_member_snapshots (
      match_session_id, side, defense_deck, defense_is_npc, npc_power
    ) VALUES (p_match_session_id, 'B', '[]'::jsonb, true, 1);
  END IF;
  UPDATE public.gvg_match_sessions SET status = 'CONFIRMED', matched_at = now()
  WHERE id = p_match_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_gvg_match_members(UUID) FROM PUBLIC;
