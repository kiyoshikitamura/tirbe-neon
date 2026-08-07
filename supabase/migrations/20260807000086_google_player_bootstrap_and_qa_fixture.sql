-- Google OAuth users must always have a game-profile row before any gameplay
-- data is read or written.  The QA fixture is deliberately restricted to the
-- approved test account and is atomic, so it cannot leave partial loadouts.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    v_name := 'user_' || substring(replace(v_user_id::text, '-', '') from 1 for 4);
    INSERT INTO public.users (id, username, current_base_id, favorite_character_id)
    VALUES (v_user_id, v_name, 'neon_tower', '11111111-1111-1111-1111-111111111111')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_current_player_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_current_player_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.provision_qa_fixture()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email_hash text := encode(extensions.digest(lower(coalesce(auth.jwt() ->> 'email', '')), 'sha256'), 'hex');
BEGIN
  IF v_email_hash <> 'ec4caf39b8c3a960f9287ac282badc8fe2ab3f03326455d4274e8bfd2de53f42' THEN
    RAISE EXCEPTION 'QA fixture is not available for this account';
  END IF;

  v_user_id := public.ensure_current_player_profile();

  INSERT INTO public.user_characters (user_id, character_id, level, awakening_level)
  VALUES
    (v_user_id, '11111111-1111-1111-1111-111111111111', 35, 3),
    (v_user_id, '22222222-2222-2222-2222-222222222222', 32, 2),
    (v_user_id, '33333333-3333-3333-3333-333333333333', 29, 1)
  ON CONFLICT (user_id, character_id) DO UPDATE
  SET level = EXCLUDED.level, awakening_level = EXCLUDED.awakening_level;

  DELETE FROM public.user_equipments WHERE user_id = v_user_id;
  DELETE FROM public.user_skills WHERE user_id = v_user_id;

  INSERT INTO public.user_equipments (user_id, equipment_id, level, plus_val, equipped_character_id, slot_index, random_options)
  SELECT v_user_id, equipment_id, level, plus_val, character_id, slot_index, '[]'::jsonb
  FROM (
    SELECT 'WEAPON_001'::text equipment_id, 30 level, 3 plus_val, id::text character_id, 0 slot_index FROM public.user_characters WHERE user_id = v_user_id ORDER BY level DESC LIMIT 1
  ) seed;

  INSERT INTO public.user_skills (user_id, skill_card_id, plus_val, equipped_character_id, slot_index)
  SELECT v_user_id, skill_card_id, plus_val, id::text, slot_index
  FROM public.user_characters, LATERAL (VALUES ('SKILL_001'::text, 2, 0), ('SKILL_002'::text, 1, 1)) AS skill(skill_card_id, plus_val, slot_index)
  WHERE user_id = v_user_id;

  INSERT INTO public.user_items (user_id, item_id, quantity)
  VALUES
    (v_user_id, 'TRAINING_MANUAL', 50),
    (v_user_id, 'EQUIP_EXP_M', 80),
    (v_user_id, 'LAW_OF_STRIFE', 20)
  ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now();

  UPDATE public.users
  SET cash = 500000, neon_diamonds = 3000,
      favorite_character_id = '11111111-1111-1111-1111-111111111111'
  WHERE id = v_user_id;

  RETURN jsonb_build_object('status', 'success', 'user_id', v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.provision_qa_fixture() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_qa_fixture() TO authenticated;
