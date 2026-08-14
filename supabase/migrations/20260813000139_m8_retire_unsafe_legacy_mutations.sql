-- Open Beta M8-2b: close legacy client-authoritative mutation functions found
-- by the live Development DB inventory. Current M1-M7 canonical RPCs remain.

BEGIN;

DO $$
DECLARE
  v_signature text;
  v_function regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.accept_friend_request(uuid,uuid)',
    'public.add_user_xp(uuid,integer)',
    'public.apply_user_xp(uuid,integer)',
    'public.claim_battle_rewards(uuid,integer,integer,jsonb)',
    'public.claim_gvg_base(uuid,text)',
    'public.complete_patrol_instant(uuid,uuid,integer)',
    'public.complete_patrol_v2(uuid,uuid,bigint,integer,text,text,integer,boolean,boolean,text,integer)',
    'public.consume_raid_attempt(uuid,text,integer)',
    'public.consume_vitality_for_gvg(uuid,integer)',
    'public.distribute_ranking_rewards()',
    'public.initialize_new_user(uuid,text)',
    'public.kick_guild_member(uuid,uuid)',
    'public.leave_guild(uuid,uuid,boolean,boolean)',
    'public.limit_break_gear(uuid,uuid,integer,integer)',
    'public.limit_break_skill(uuid,uuid,integer,integer)',
    'public.process_gvg_battle_result(uuid,uuid,text,boolean,boolean)',
    'public.process_gvg_battle_result_v2(uuid,uuid,text,boolean,boolean)',
    'public.process_pvp_match_result(uuid,uuid,boolean,integer,integer)',
    'public.process_pvp_match_result_v2(uuid,boolean,integer,integer)',
    'public.record_raid_boss_damage(uuid,text,integer)',
    'public.record_raid_boss_damage_v2(uuid,text,integer)',
    'public.remove_friend(uuid,uuid)',
    'public.send_friend_request(uuid,uuid)',
    'public.set_guild_member_role(uuid,uuid,text)',
    'public.sync_and_evaluate_raid_timeout(uuid)',
    'public.use_inventory_item(uuid,text,integer,integer)'
  ]
  LOOP
    v_function := to_regprocedure(v_signature);
    IF v_function IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        v_function
      );
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_function);
    END IF;
  END LOOP;
END;
$$;

-- Preserve equipment selling through a server-priced, owner-only replacement.
CREATE OR REPLACE FUNCTION public.sell_owned_equipment(p_equipment_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested integer;
  v_sellable integer;
  v_sold integer;
  v_earned_cash bigint;
  v_cash bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING errcode = '42501';
  END IF;
  v_requested := coalesce(cardinality(p_equipment_ids), 0);
  IF v_requested < 1 OR v_requested > 100 THEN
    RAISE EXCEPTION 'invalid equipment count' USING errcode = '22023';
  END IF;
  IF (SELECT count(DISTINCT equipment_id) FROM unnest(p_equipment_ids) equipment_id) <> v_requested THEN
    RAISE EXCEPTION 'duplicate equipment id' USING errcode = '22023';
  END IF;

  SELECT count(*) INTO v_sellable
  FROM public.user_equipments
  WHERE user_id = v_user_id
    AND id = ANY(p_equipment_ids)
    AND equipped_character_id IS NULL;
  IF v_sellable <> v_requested THEN
    RAISE EXCEPTION 'equipment is not owned or is currently equipped' USING errcode = '42501';
  END IF;

  DELETE FROM public.user_equipments
  WHERE user_id = v_user_id
    AND id = ANY(p_equipment_ids)
    AND equipped_character_id IS NULL;
  GET DIAGNOSTICS v_sold = ROW_COUNT;

  v_earned_cash := v_sold * 500;
  UPDATE public.users
  SET cash = cash + v_earned_cash
  WHERE id = v_user_id
  RETURNING cash INTO v_cash;

  RETURN jsonb_build_object(
    'status', 'success',
    'sold_count', v_sold,
    'earned_cash', v_earned_cash,
    'cash', v_cash
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sell_gear_bulk(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sell_gear_bulk(uuid,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.sell_owned_equipment(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sell_owned_equipment(uuid[]) TO authenticated, service_role;

-- Inventory and owned-skill rows are granted only through canonical gacha,
-- reward, progression and loadout RPCs.
REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.user_items FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.user_skills FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_items TO authenticated;
GRANT SELECT ON TABLE public.user_skills TO authenticated;
GRANT ALL ON TABLE public.user_items TO service_role;
GRANT ALL ON TABLE public.user_skills TO service_role;

-- This still supports the current client contract, but now rejects substituted
-- user ids and uses a fixed search path.
CREATE OR REPLACE FUNCTION public.generate_user_gift_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean := true;
  v_chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  SELECT gift_code INTO v_code
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player profile is not initialized' USING errcode = 'P0002';
  END IF;
  IF v_code IS NOT NULL AND v_code <> '' THEN
    RETURN v_code;
  END IF;

  WHILE v_exists LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    END LOOP;
    SELECT EXISTS (SELECT 1 FROM public.users WHERE gift_code = v_code) INTO v_exists;
  END LOOP;

  UPDATE public.users SET gift_code = v_code WHERE id = p_user_id;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_user_gift_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_user_gift_code(uuid) TO authenticated, service_role;

-- Reassert the consumer boundary for maintained caller-id contracts. These
-- functions validate auth.uid() (or intentionally read a target's public
-- battle roster) and retain their current client signatures.
DO $$
DECLARE
  v_signature text;
  v_function regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.complete_patrol_instantly(uuid,uuid,text)',
    'public.consume_pvp_point(uuid)',
    'public.create_guild_v2(uuid,text,integer)',
    'public.donate_to_guild(uuid,uuid,integer)',
    'public.exchange_pity_reward(uuid,text,text)',
    'public.execute_asset_gacha(uuid,text,integer,text)',
    'public.execute_character_gacha(uuid,text,integer,text)',
    'public.generate_user_gift_code(uuid)',
    'public.get_public_battle_loadout(uuid)',
    'public.get_public_battle_roster(uuid)',
    'public.get_pvp_opponents(uuid,integer)',
    'public.sell_owned_equipment(uuid[])',
    'public.sync_and_recover_vitality_and_pvp_points(uuid)'
  ]
  LOOP
    v_function := to_regprocedure(v_signature);
    IF v_function IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_function);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', v_function);
    END IF;
  END LOOP;
END;
$$;

-- Development-only QA helpers retain their internal account allow-list, while
-- removing the mutable caller search path reported by the audit.
ALTER FUNCTION public.provision_qa_character_cosmetic_fixture()
  SET search_path = public;
ALTER FUNCTION public.provision_qa_cosmetic_fixture()
  SET search_path = public;

COMMIT;
