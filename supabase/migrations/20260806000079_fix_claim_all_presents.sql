CREATE OR REPLACE FUNCTION public.claim_all_presents(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_present public.presents%ROWTYPE; v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  FOR v_present IN SELECT * FROM public.presents WHERE user_id = p_user_id AND status = 'UNCLAIMED' FOR UPDATE LOOP
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
    UPDATE public.presents SET status = 'CLAIMED', claimed_at = now() WHERE id = v_present.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('status', 'success', 'claimed_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_all_presents(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_all_presents(UUID) TO authenticated;
