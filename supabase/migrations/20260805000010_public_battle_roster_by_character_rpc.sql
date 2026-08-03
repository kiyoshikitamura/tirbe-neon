CREATE OR REPLACE FUNCTION public.get_public_battle_roster_by_character_ids(p_character_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roster jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_character_ids IS NULL OR cardinality(p_character_ids) = 0 THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'character_id', c.character_id, 'level', c.level, 'awakening_level', c.awakening_level,
    'equipments', COALESCE((SELECT jsonb_agg(jsonb_build_object('equipment_id', e.equipment_id, 'level', e.level, 'plus_val', e.plus_val, 'slot_index', e.slot_index, 'random_options', e.random_options)) FROM public.user_equipments e WHERE e.user_id = c.user_id AND e.equipped_character_id = c.id::text), '[]'::jsonb),
    'skills', COALESCE((SELECT jsonb_agg(jsonb_build_object('skill_card_id', s.skill_card_id, 'plus_val', s.plus_val, 'slot_index', s.slot_index)) FROM public.user_skills s WHERE s.user_id = c.user_id AND s.equipped_character_id = c.id::text), '[]'::jsonb)
  ) ORDER BY array_position(p_character_ids, c.id)), '[]'::jsonb) INTO v_roster
  FROM public.user_characters c WHERE c.id = ANY(p_character_ids);
  RETURN v_roster;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_battle_roster_by_character_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_battle_roster_by_character_ids(uuid[]) TO authenticated;
