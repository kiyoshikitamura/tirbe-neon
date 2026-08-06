CREATE OR REPLACE FUNCTION public.complete_patrol_instantly(
  p_user_id UUID,
  p_patrol_id UUID,
  p_currency TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash BIGINT;
  v_diamonds INTEGER;
  v_tutorial_step TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_patrols WHERE id = p_patrol_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Patrol not found';
  END IF;

  IF p_currency = 'FREE_TUTORIAL' THEN
    SELECT step_id INTO v_tutorial_step
    FROM public.tutorial_progress
    WHERE user_id = p_user_id
    FOR UPDATE;
    IF v_tutorial_step <> 'FREE_INSTANT' THEN
      RAISE EXCEPTION 'Tutorial free instant completion is unavailable';
    END IF;
  ELSIF p_currency = 'CASH' THEN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id FOR UPDATE;
    IF COALESCE(v_cash, 0) < 1000 THEN RAISE EXCEPTION 'Cash insufficient'; END IF;
    UPDATE public.users SET cash = cash - 1000 WHERE id = p_user_id;
  ELSIF p_currency = 'DIAMOND' THEN
    SELECT neon_diamonds INTO v_diamonds FROM public.users WHERE id = p_user_id FOR UPDATE;
    IF COALESCE(v_diamonds, 0) < 50 THEN RAISE EXCEPTION 'Diamond insufficient'; END IF;
    UPDATE public.users SET neon_diamonds = neon_diamonds - 50 WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid patrol instant completion currency';
  END IF;

  UPDATE public.user_patrols
  SET status = 'CLAIMABLE', expires_at = now()
  WHERE id = p_patrol_id AND user_id = p_user_id;

  RETURN jsonb_build_object('status', 'success');
END;
$$;
