CREATE OR REPLACE FUNCTION public.snapshot_gvg_match_members(p_match_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_match public.gvg_match_sessions%ROWTYPE; v_member RECORD; v_side TEXT;
  v_character_ids JSONB; v_defense JSONB; v_power BIGINT;
BEGIN
  SELECT * INTO v_match FROM public.gvg_match_sessions WHERE id = p_match_session_id FOR UPDATE;
  IF NOT FOUND OR v_match.status NOT IN ('MATCHING', 'CONFIRMED') THEN RAISE EXCEPTION 'GvG match cannot be snapshotted'; END IF;
  DELETE FROM public.gvg_match_member_snapshots WHERE match_session_id = p_match_session_id;
  FOR v_member IN
    SELECT member.guild_id, member.user_id FROM public.guild_members member
    WHERE member.guild_id = v_match.guild_a_id OR member.guild_id = v_match.guild_b_id
  LOOP
    v_side := CASE WHEN v_member.guild_id = v_match.guild_a_id THEN 'A' ELSE 'B' END;
    SELECT to_jsonb(array_remove(ARRAY[deck.character_1_id, deck.character_2_id, deck.character_3_id, deck.character_4_id, deck.character_5_id], NULL))
    INTO v_character_ids FROM public.gvg_defense_decks deck
    WHERE deck.user_id = v_member.user_id AND deck.guild_id = v_member.guild_id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', character.id, 'character_id', character.character_id, 'level', character.level, 'awakening_level', character.awakening_level,
      'equipments', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', equipment.id, 'equipment_id', equipment.equipment_id, 'level', equipment.level, 'plus_val', equipment.plus_val, 'slot_index', equipment.slot_index) ORDER BY equipment.slot_index)
        FROM public.user_equipments equipment WHERE equipment.user_id = v_member.user_id AND equipment.equipped_character_id = character.id), '[]'::jsonb),
      'skills', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', skill.id, 'skill_card_id', skill.skill_card_id, 'plus_val', skill.plus_val, 'slot_index', skill.slot_index) ORDER BY skill.slot_index)
        FROM public.user_skills skill WHERE skill.user_id = v_member.user_id AND skill.equipped_character_id = character.id), '[]'::jsonb)
    )), '[]'::jsonb) INTO v_defense
    FROM public.user_characters character
    WHERE character.user_id = v_member.user_id
      AND character.id::TEXT IN (SELECT jsonb_array_elements_text(COALESCE(v_character_ids, '[]'::jsonb)));
    SELECT COALESCE(ranking.total_power, 0) INTO v_power FROM public.user_power_rankings ranking WHERE ranking.user_id = v_member.user_id;
    INSERT INTO public.gvg_match_member_snapshots (match_session_id, side, guild_id, user_id, defense_deck, defense_is_npc, npc_power)
    VALUES (p_match_session_id, v_side, v_member.guild_id, v_member.user_id, v_defense,
      jsonb_array_length(v_defense) = 0, CASE WHEN jsonb_array_length(v_defense) = 0 THEN GREATEST(1, COALESCE(v_power, 0)) ELSE NULL END);
  END LOOP;
  IF v_match.is_npc_match THEN
    INSERT INTO public.gvg_match_member_snapshots (match_session_id, side, defense_deck, defense_is_npc, npc_power)
    VALUES (p_match_session_id, 'B', '[]'::jsonb, true, 1);
  END IF;
  UPDATE public.gvg_match_sessions SET status = 'CONFIRMED', matched_at = now() WHERE id = p_match_session_id;
END;
$$;
