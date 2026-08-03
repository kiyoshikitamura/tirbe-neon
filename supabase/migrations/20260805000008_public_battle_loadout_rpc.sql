CREATE OR REPLACE FUNCTION public.get_public_battle_loadout(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_char record;
  v_equips jsonb;
  v_skills jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT username INTO v_user FROM public.users WHERE id = p_target_user_id;
  SELECT id, character_id, level, awakening_level INTO v_char
  FROM public.user_characters
  WHERE user_id = p_target_user_id
  ORDER BY level DESC, awakening_level DESC, id
  LIMIT 1;
  IF v_char.id IS NULL THEN
    RETURN jsonb_build_object('username', v_user.username, 'character', null, 'equipments', '[]'::jsonb, 'skills', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'equipment_id', equipment_id, 'level', level, 'plus_val', plus_val, 'slot_index', slot_index, 'random_options', random_options
  )), '[]'::jsonb) INTO v_equips
  FROM public.user_equipments WHERE user_id = p_target_user_id AND equipped_character_id = v_char.id::text;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'skill_card_id', skill_card_id, 'plus_val', plus_val, 'slot_index', slot_index
  )), '[]'::jsonb) INTO v_skills
  FROM public.user_skills WHERE user_id = p_target_user_id AND equipped_character_id = v_char.id::text;

  RETURN jsonb_build_object(
    'username', v_user.username,
    'character', jsonb_build_object('id', v_char.id, 'character_id', v_char.character_id, 'level', v_char.level, 'awakening_level', v_char.awakening_level),
    'equipments', v_equips,
    'skills', v_skills
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_battle_loadout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_battle_loadout(uuid) TO authenticated;
