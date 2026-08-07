-- QA-only visual fixture. Access is restricted server-side to the approved
-- test account so the client cannot grant cosmetics to arbitrary players.
CREATE OR REPLACE FUNCTION public.provision_qa_cosmetic_fixture()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email_hash text := encode(extensions.digest(COALESCE(auth.jwt() ->> 'email', ''), 'sha256'), 'hex');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF v_email_hash <> 'b1156b68faa1f7fed72d56b19a3953967ce93cc0e73e80605769a74af87b82fa' THEN
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

REVOKE ALL ON FUNCTION public.provision_qa_cosmetic_fixture() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_qa_cosmetic_fixture() TO authenticated;
