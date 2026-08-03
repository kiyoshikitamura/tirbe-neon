-- Development reconciliation: atomic gacha currency charge.
-- Reward generation/granting remains a separate follow-up migration.

CREATE OR REPLACE FUNCTION public.execute_gacha(
  p_user_id UUID,
  p_currency_type TEXT,
  p_currency_cost INTEGER,
  p_results JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash BIGINT;
  v_diamonds BIGINT;
  v_tickets INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_currency_cost IS NULL OR p_currency_cost <= 0 OR p_currency_cost > 1000000 THEN
    RAISE EXCEPTION 'invalid gacha cost';
  END IF;
  IF p_results IS NOT NULL AND jsonb_array_length(p_results) <> 0 THEN
    RAISE EXCEPTION 'client supplied gacha results are not accepted';
  END IF;

  IF p_currency_type = 'cash' THEN
    UPDATE public.users
    SET cash = cash - p_currency_cost
    WHERE id = p_user_id AND cash >= p_currency_cost
    RETURNING cash INTO v_cash;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient cash';
    END IF;
    RETURN jsonb_build_object('status', 'charged', 'cash', v_cash);
  ELSIF p_currency_type = 'diamonds' THEN
    UPDATE public.users
    SET neon_diamonds = neon_diamonds - p_currency_cost
    WHERE id = p_user_id AND neon_diamonds >= p_currency_cost
    RETURNING neon_diamonds INTO v_diamonds;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient diamonds';
    END IF;
    RETURN jsonb_build_object('status', 'charged', 'diamonds', v_diamonds);
  ELSIF p_currency_type = 'ticket' THEN
    UPDATE public.user_items
    SET quantity = quantity - p_currency_cost
    WHERE user_id = p_user_id
      AND item_id = 'GACHA_TICKET'
      AND quantity >= p_currency_cost
    RETURNING quantity INTO v_tickets;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient gacha tickets';
    END IF;
    RETURN jsonb_build_object('status', 'charged', 'tickets', v_tickets);
  ELSE
    RAISE EXCEPTION 'invalid currency type';
  END IF;
END;
$$;
