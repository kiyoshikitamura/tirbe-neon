CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL CHECK (step_id IN (
    'WORLD_INTRO',
    'FREE_GACHA',
    'AUTO_FORMATION',
    'DISPATCH',
    'FREE_INSTANT',
    'TUTORIAL_BATTLE',
    'RULE_GUIDE',
    'COMPLETE',
    'AUTHENTICATION'
  )),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own tutorial progress" ON public.tutorial_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.start_tutorial_progress()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Player profile is required';
  END IF;
  INSERT INTO public.tutorial_progress (user_id, step_id)
  VALUES (v_user_id, 'WORLD_INTRO')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN COALESCE((SELECT step_id FROM public.tutorial_progress WHERE user_id = v_user_id), 'WORLD_INTRO');
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_tutorial_progress(
  p_expected_step TEXT,
  p_next_step TEXT
)
RETURNS TEXT
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
    ('RULE_GUIDE', 'COMPLETE'),
    ('COMPLETE', 'AUTHENTICATION')
  ) THEN
    RAISE EXCEPTION 'Invalid tutorial transition';
  END IF;
  UPDATE public.tutorial_progress
  SET step_id = p_next_step,
      updated_at = now(),
      completed_at = CASE WHEN p_next_step = 'COMPLETE' THEN now() ELSE completed_at END
  WHERE user_id = v_user_id;
  RETURN p_next_step;
END;
$$;

REVOKE ALL ON FUNCTION public.start_tutorial_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_tutorial_progress(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_tutorial_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_tutorial_progress(TEXT, TEXT) TO authenticated;
