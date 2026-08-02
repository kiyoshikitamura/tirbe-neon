CREATE OR REPLACE FUNCTION public.consume_vitality_for_gvg(p_user_id UUID, p_cost INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vitality INTEGER;
BEGIN
    SELECT vitality INTO v_vitality FROM public.users WHERE id = p_user_id FOR UPDATE;

    IF v_vitality < p_cost THEN
        RAISE EXCEPTION '行動力が不足しています。';
    END IF;

    UPDATE public.users
    SET vitality = vitality - p_cost
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'consumed', p_cost);
END;
$$;
