CREATE OR REPLACE FUNCTION public.equip_user_cosmetic(p_slot text, p_cosmetic_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_cosmetics uc JOIN public.cosmetic_master cm ON cm.id = uc.cosmetic_id WHERE uc.user_id = v_user_id AND uc.cosmetic_id = p_cosmetic_id AND cm.slot = p_slot AND (uc.expires_at IS NULL OR uc.expires_at > now())) THEN
    RAISE EXCEPTION 'cosmetic is not owned or is unavailable';
  END IF;
  INSERT INTO public.equipped_cosmetics (user_id, slot, cosmetic_id) VALUES (v_user_id, p_slot, p_cosmetic_id)
  ON CONFLICT (user_id, slot) DO UPDATE SET cosmetic_id = EXCLUDED.cosmetic_id, equipped_at = now();
  IF p_slot = 'HOME_BACKGROUND' THEN UPDATE public.users SET selected_bg_mode = p_cosmetic_id WHERE id = v_user_id; END IF;
  IF p_slot = 'HOME_FOREGROUND' THEN UPDATE public.users SET equipped_front_effect = p_cosmetic_id WHERE id = v_user_id; END IF;
  IF p_slot = 'HOME_INTERIOR' THEN UPDATE public.users SET interior_item = p_cosmetic_id WHERE id = v_user_id; END IF;
  RETURN jsonb_build_object('status', 'success');
END; $$;
REVOKE ALL ON FUNCTION public.equip_user_cosmetic(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.equip_user_cosmetic(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_legacy_user_cosmetics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_user public.users%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT * INTO v_user FROM public.users WHERE id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'player profile not found'; END IF;
  INSERT INTO public.user_cosmetics (user_id, cosmetic_id, source_type)
  SELECT v_user_id, id, 'LEGACY' FROM public.cosmetic_master WHERE id IN (COALESCE(v_user.selected_bg_mode, 'bg_default'), COALESCE(v_user.equipped_front_effect, 'effect_none'), CASE WHEN v_user.interior_item = 'none' THEN 'interior_none' ELSE v_user.interior_item END)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.equipped_cosmetics (user_id, slot, cosmetic_id)
  VALUES (v_user_id, 'HOME_BACKGROUND', COALESCE(v_user.selected_bg_mode, 'bg_default')), (v_user_id, 'HOME_FOREGROUND', COALESCE(v_user.equipped_front_effect, 'effect_none')), (v_user_id, 'HOME_INTERIOR', CASE WHEN v_user.interior_item = 'none' THEN 'interior_none' ELSE v_user.interior_item END)
  ON CONFLICT (user_id, slot) DO NOTHING;
  RETURN jsonb_build_object('status','success');
END; $$;
REVOKE ALL ON FUNCTION public.sync_legacy_user_cosmetics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_legacy_user_cosmetics() TO authenticated;
