ALTER TABLE public.presents
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.claim_present(UUID, BIGINT);

CREATE FUNCTION public.claim_present(p_user_id UUID, p_present_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_present public.presents%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO v_present FROM public.presents WHERE id = p_present_id AND user_id = p_user_id AND status = 'UNCLAIMED' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'present not found or already claimed'); END IF;
  IF v_present.item_id = 'CASH' THEN
    UPDATE public.users SET cash = cash + v_present.quantity WHERE id = p_user_id;
  ELSIF v_present.item_id IN ('DIA', 'DIAMOND') THEN
    UPDATE public.users SET neon_diamonds = neon_diamonds + v_present.quantity WHERE id = p_user_id;
  ELSIF v_present.item_id LIKE 'EQUIP_%' THEN
    INSERT INTO public.user_equipments (user_id, equipment_id, equipment_master_id, level, plus_val)
    VALUES (p_user_id, v_present.item_id, v_present.item_id, 1, 0);
  ELSE
    INSERT INTO public.user_items (user_id, item_id, quantity) VALUES (p_user_id, v_present.item_id, v_present.quantity)
    ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + EXCLUDED.quantity;
  END IF;
  UPDATE public.presents SET status = 'CLAIMED', claimed_at = now() WHERE id = p_present_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.claim_present(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_present(UUID, UUID) TO authenticated;
