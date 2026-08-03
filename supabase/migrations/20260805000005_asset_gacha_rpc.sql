-- Development reconciliation: server-side skill/equipment gacha draw.

CREATE OR REPLACE FUNCTION public.execute_asset_gacha(
  p_user_id UUID,
  p_gacha_id TEXT,
  p_pull_count INTEGER,
  p_currency_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gacha RECORD;
  v_user RECORD;
  v_item_id TEXT;
  v_existing RECORD;
  v_result JSONB := '[]'::jsonb;
  v_cost INTEGER;
  v_today DATE := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  v_index INTEGER;
  v_is_skill BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_pull_count IS NULL OR p_pull_count < 1 OR p_pull_count > 10 THEN
    RAISE EXCEPTION 'invalid pull count';
  END IF;
  IF p_currency_type = 'free' AND p_pull_count <> 10 THEN
    RAISE EXCEPTION 'free gacha requires 10 pulls';
  END IF;

  SELECT id, gacha_type, cost_cash, cost_diamond
  INTO v_gacha
  FROM public.gacha_masters
  WHERE id = p_gacha_id AND gacha_type IN ('SKILL', 'EQUIPMENT');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'asset gacha not found';
  END IF;
  v_is_skill := v_gacha.gacha_type = 'SKILL';

  IF p_currency_type = 'free' THEN
    INSERT INTO public.user_daily_gacha_claims (user_id, gacha_type, last_claimed_date)
    VALUES (p_user_id, v_gacha.gacha_type, v_today)
    ON CONFLICT (user_id, gacha_type) DO UPDATE
      SET last_claimed_date = EXCLUDED.last_claimed_date, updated_at = now()
      WHERE public.user_daily_gacha_claims.last_claimed_date < v_today;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'daily free gacha already claimed';
    END IF;
  ELSIF p_currency_type = 'cash' OR p_currency_type = 'diamonds' THEN
    v_cost := CASE WHEN p_currency_type = 'cash' THEN v_gacha.cost_cash ELSE v_gacha.cost_diamond END * p_pull_count;
    IF p_currency_type = 'cash' THEN
      UPDATE public.users SET cash = cash - v_cost
      WHERE id = p_user_id AND cash >= v_cost;
    ELSE
      UPDATE public.users SET neon_diamonds = neon_diamonds - v_cost
      WHERE id = p_user_id AND neon_diamonds >= v_cost;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient gacha currency';
    END IF;
  ELSIF p_currency_type = 'ticket' THEN
    UPDATE public.user_items SET quantity = quantity - p_pull_count
    WHERE user_id = p_user_id AND item_id = 'GACHA_TICKET' AND quantity >= p_pull_count;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient gacha tickets';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid currency type';
  END IF;

  FOR v_index IN 1..p_pull_count LOOP
    SELECT item_id INTO v_item_id
    FROM public.gacha_items_master
    WHERE gacha_id = p_gacha_id
    ORDER BY -ln(random()) / GREATEST(weight, 1)
    LIMIT 1;
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'gacha pool is empty';
    END IF;

    IF v_is_skill THEN
      SELECT id, plus_val INTO v_existing
      FROM public.user_skills
      WHERE user_id = p_user_id AND skill_card_id = v_item_id
      FOR UPDATE;
      IF FOUND AND COALESCE(v_existing.plus_val, 0) < 10 THEN
        UPDATE public.user_skills SET plus_val = COALESCE(plus_val, 0) + 1 WHERE id = v_existing.id;
        v_result := v_result || jsonb_build_array(jsonb_build_object('type', 'SKILL', 'item_id', v_item_id, 'outcome', 'limit_break'));
      ELSIF FOUND THEN
        INSERT INTO public.user_items (user_id, item_id, quantity)
        VALUES (p_user_id, 'TRAINING_MANUAL', 2)
        ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 2;
        v_result := v_result || jsonb_build_array(jsonb_build_object('type', 'SKILL', 'item_id', v_item_id, 'outcome', 'converted'));
      ELSE
        INSERT INTO public.user_skills (user_id, skill_card_id, plus_val)
        VALUES (p_user_id, v_item_id, 0);
        v_result := v_result || jsonb_build_array(jsonb_build_object('type', 'SKILL', 'item_id', v_item_id, 'outcome', 'new'));
      END IF;
    ELSE
      INSERT INTO public.user_equipments (user_id, equipment_id, level, plus_val, random_options)
      VALUES (p_user_id, v_item_id, 1, 0, '[]'::jsonb);
      v_result := v_result || jsonb_build_array(jsonb_build_object('type', 'EQUIPMENT', 'item_id', v_item_id, 'outcome', 'new'));
    END IF;
  END LOOP;

  IF p_currency_type <> 'free' AND p_gacha_id IN ('SKILL_SPECIAL', 'EQUIP_SPECIAL') THEN
    INSERT INTO public.user_gacha_pity_points (user_id, pity_master_id, current_points)
    VALUES (p_user_id, 'pity_special_common', p_pull_count)
    ON CONFLICT (user_id, pity_master_id) DO UPDATE
      SET current_points = public.user_gacha_pity_points.current_points + p_pull_count, updated_at = now();
  END IF;

  SELECT cash, neon_diamonds INTO v_user FROM public.users WHERE id = p_user_id;
  RETURN jsonb_build_object('status', 'success', 'results', v_result, 'cash', v_user.cash, 'diamonds', v_user.neon_diamonds);
END;
$$;
