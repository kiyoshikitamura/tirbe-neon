CREATE OR REPLACE FUNCTION public.consume_raid_attempt(p_user_id UUID, p_cost_type TEXT, p_cost_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users%ROWTYPE;
    v_today DATE := CURRENT_DATE;
    v_reset_date DATE;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
    
    IF v_user.id IS NULL THEN
        RAISE EXCEPTION 'ユーザーが見つかりません。';
    END IF;

    IF p_cost_type = 'CASH' AND v_user.cash < p_cost_amount THEN
        RAISE EXCEPTION 'Cashが不足しています。';
    END IF;

    IF p_cost_type = 'DIAMOND' AND v_user.diamonds < p_cost_amount THEN
        RAISE EXCEPTION 'ダイヤが不足しています。';
    END IF;

    IF p_cost_type = 'CASH' THEN
        UPDATE public.users SET cash = cash - p_cost_amount WHERE id = p_user_id;
    END IF;
    IF p_cost_type = 'DIAMOND' THEN
        UPDATE public.users SET diamonds = diamonds - p_cost_amount WHERE id = p_user_id;
    END IF;

    v_reset_date := v_user.raid_attempts_reset_at::DATE;
    
    IF v_reset_date IS DISTINCT FROM v_today THEN
        UPDATE public.users SET raid_attempts_today = 1, raid_attempts_reset_at = now() WHERE id = p_user_id;
    ELSE
        UPDATE public.users SET raid_attempts_today = COALESCE(raid_attempts_today, 0) + 1 WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
