CREATE OR REPLACE FUNCTION public.start_patrol_v2(
  p_user_id UUID,
  p_course_id TEXT,
  p_character_id TEXT,
  p_duration_seconds INTEGER,
  p_cost_vitality INTEGER,
  p_battle_chance NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_vitality INTEGER;
  v_new_id UUID;
  v_has_battle BOOLEAN;
  v_is_tutorial_dispatch BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT vitality INTO v_vitality FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF v_vitality < p_cost_vitality THEN
    RETURN jsonb_build_object('error', 'Insufficient vitality');
  END IF;
  SELECT step_id = 'DISPATCH' INTO v_is_tutorial_dispatch
  FROM public.tutorial_progress WHERE user_id = p_user_id;
  v_has_battle := CASE WHEN COALESCE(v_is_tutorial_dispatch, false) THEN true
    ELSE random() <= COALESCE(p_battle_chance, 0.2) END;
  INSERT INTO public.user_patrols (
    user_id, course_id, character_id, started_at, expires_at,
    status, has_battle_event, battle_resolved
  ) VALUES (
    p_user_id, p_course_id, p_character_id, now(),
    now() + (p_duration_seconds * interval '1 second'),
    'ONGOING', v_has_battle, false
  ) RETURNING id INTO v_new_id;
  UPDATE public.users SET vitality = vitality - p_cost_vitality WHERE id = p_user_id;
  RETURN jsonb_build_object('status', 'success', 'patrol_id', v_new_id, 'has_battle', v_has_battle);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
