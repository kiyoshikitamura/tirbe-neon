CREATE OR REPLACE FUNCTION public.provision_qa_cosmetic_fixture()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email_hash text := encode(extensions.digest(lower(COALESCE(auth.jwt() ->> 'email', '')), 'sha256'), 'hex');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF v_email_hash <> 'ec4caf39b8c3a960f9287ac282badc8fe2ab3f03326455d4274e8bfd2de53f42' THEN
    RAISE EXCEPTION 'qa fixture is not available for this account';
  END IF;

  PERFORM public.unlock_eligible_user_cosmetics();
  INSERT INTO public.user_cosmetics (user_id, cosmetic_id, source_type, source_reference)
  SELECT v_user_id, id, 'QA_FIXTURE', 'HOME_PRESENTATION_REVIEW'
  FROM public.cosmetic_master
  WHERE owner_scope = 'USER' AND active
  ON CONFLICT (user_id, cosmetic_id) DO NOTHING;

  RETURN jsonb_build_object('status', 'success');
END;
$$;
