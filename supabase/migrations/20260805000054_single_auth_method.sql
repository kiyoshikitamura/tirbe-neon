CREATE TABLE IF NOT EXISTS public.user_account_auth_methods (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('EMAIL', 'GOOGLE')),
  authenticated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_account_auth_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own account auth method" ON public.user_account_auth_methods
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.advance_tutorial_progress(
  p_expected_step TEXT,
  p_next_step TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid(); v_current_step TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  SELECT step_id INTO v_current_step FROM public.tutorial_progress WHERE user_id = v_user_id FOR UPDATE;
  IF v_current_step IS NULL THEN RAISE EXCEPTION 'Tutorial has not started'; END IF;
  IF v_current_step <> p_expected_step THEN RAISE EXCEPTION 'Unexpected tutorial step'; END IF;
  IF (p_expected_step, p_next_step) NOT IN (
    ('WORLD_INTRO', 'FREE_GACHA'),
    ('FREE_GACHA', 'AUTO_FORMATION'),
    ('AUTO_FORMATION', 'DISPATCH'),
    ('DISPATCH', 'FREE_INSTANT'),
    ('FREE_INSTANT', 'TUTORIAL_BATTLE'),
    ('TUTORIAL_BATTLE', 'RULE_GUIDE'),
    ('RULE_GUIDE', 'COMPLETE')
  ) THEN RAISE EXCEPTION 'Invalid tutorial transition'; END IF;
  UPDATE public.tutorial_progress SET step_id = p_next_step, updated_at = now(),
    completed_at = CASE WHEN p_next_step = 'COMPLETE' THEN now() ELSE completed_at END
  WHERE user_id = v_user_id;
  RETURN p_next_step;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_tutorial_authentication(p_auth_method TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF p_auth_method NOT IN ('EMAIL', 'GOOGLE') THEN RAISE EXCEPTION 'Unsupported authentication method'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = v_user_id AND provider = lower(p_auth_method)
  ) THEN RAISE EXCEPTION 'Requested authentication identity is not linked'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.tutorial_progress WHERE user_id = v_user_id AND step_id = 'COMPLETE'
  ) THEN RAISE EXCEPTION 'Tutorial completion is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_account_auth_methods WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'An authentication method is already linked';
  END IF;
  INSERT INTO public.user_account_auth_methods (user_id, auth_method)
  VALUES (v_user_id, p_auth_method);
  UPDATE public.tutorial_progress
  SET step_id = 'AUTHENTICATION', updated_at = now()
  WHERE user_id = v_user_id;
  RETURN 'AUTHENTICATION';
END;
$$;

REVOKE ALL ON FUNCTION public.complete_tutorial_authentication(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_tutorial_authentication(TEXT) TO authenticated;
