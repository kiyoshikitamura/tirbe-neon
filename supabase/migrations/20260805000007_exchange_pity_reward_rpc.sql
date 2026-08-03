CREATE OR REPLACE FUNCTION public.exchange_pity_reward(
  p_user_id uuid,
  p_reward_type text,
  p_reward_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_exists boolean;
  v_awaken integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_reward_type NOT IN ('CHARACTER','SKILL','EQUIPMENT') OR p_reward_id IS NULL OR p_reward_id = '' THEN
    RAISE EXCEPTION 'invalid pity reward';
  END IF;

  SELECT current_points INTO v_points
  FROM public.user_gacha_pity_points
  WHERE user_id = p_user_id AND pity_master_id = 'pity_special_common'
  FOR UPDATE;
  IF COALESCE(v_points, 0) < 200 THEN
    RAISE EXCEPTION 'insufficient pity points';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.gacha_items_master
    WHERE item_id = p_reward_id
      AND gacha_id LIKE CASE p_reward_type WHEN 'CHARACTER' THEN 'CHAR_%' WHEN 'SKILL' THEN 'SKILL_%' ELSE 'EQUIP_%' END
  ) INTO v_exists;
  IF NOT v_exists THEN RAISE EXCEPTION 'invalid pity reward'; END IF;

  UPDATE public.user_gacha_pity_points
  SET current_points = v_points - 200, updated_at = now()
  WHERE user_id = p_user_id AND pity_master_id = 'pity_special_common';

  IF p_reward_type = 'CHARACTER' THEN
    SELECT awakening_level INTO v_awaken FROM public.user_characters
    WHERE user_id = p_user_id AND character_id = p_reward_id ORDER BY id LIMIT 1 FOR UPDATE;
    IF v_awaken IS NULL THEN
      INSERT INTO public.user_characters (user_id, character_id, level, awakening_level) VALUES (p_user_id, p_reward_id, 1, 0);
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'new');
    ELSIF v_awaken >= 5 THEN
      INSERT INTO public.user_items (user_id, item_id, quantity) VALUES (p_user_id, 'LAW_OF_STRIFE', 1)
      ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 1;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'converted');
    ELSE
      UPDATE public.user_characters SET awakening_level = v_awaken + 1 WHERE user_id = p_user_id AND character_id = p_reward_id;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'awakening');
    END IF;
  ELSIF p_reward_type = 'SKILL' THEN
    SELECT plus_val INTO v_awaken FROM public.user_skills WHERE user_id = p_user_id AND skill_card_id = p_reward_id ORDER BY id LIMIT 1 FOR UPDATE;
    IF v_awaken IS NULL THEN
      INSERT INTO public.user_skills (user_id, skill_card_id, plus_val) VALUES (p_user_id, p_reward_id, 0);
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'new');
    ELSIF v_awaken >= 10 THEN
      INSERT INTO public.user_items (user_id, item_id, quantity) VALUES (p_user_id, 'TRAINING_MANUAL', 2)
      ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 2;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'converted');
    ELSE
      UPDATE public.user_skills SET plus_val = v_awaken + 1 WHERE user_id = p_user_id AND skill_card_id = p_reward_id;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'limit_break');
    END IF;
  ELSE
    INSERT INTO public.user_equipments (user_id, equipment_id, level, plus_val, random_options) VALUES (p_user_id, p_reward_id, 1, 0, '[]'::jsonb);
    RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'new');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.exchange_pity_reward(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exchange_pity_reward(uuid,text,text) TO authenticated;
