-- Open Beta M7-2a follow-up: make the revoked mission evaluator usable by
-- trusted server RPCs, including actions performed on behalf of another user
-- (for example, a guild master approving an applicant).

CREATE OR REPLACE FUNCTION public.normalize_user_mission_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target integer;
BEGIN
  SELECT target_value INTO v_target
  FROM public.missions
  WHERE id = NEW.mission_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Mission master not found';
  END IF;

  NEW.current_progress := LEAST(GREATEST(COALESCE(NEW.current_progress, 0), 0), v_target);
  NEW.progress_val := NEW.current_progress;
  IF NEW.status = 'PROGRESS' AND NEW.current_progress >= v_target THEN
    NEW.status := 'CLEAR';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_user_mission_progress_trigger ON public.user_missions;
CREATE TRIGGER normalize_user_mission_progress_trigger
BEFORE INSERT OR UPDATE OF current_progress, progress_val, status
ON public.user_missions
FOR EACH ROW
EXECUTE FUNCTION public.normalize_user_mission_progress();

-- Normalize retained rows once so the compatibility progress column cannot
-- remain stale after the trigger is installed.
UPDATE public.user_missions
SET current_progress = current_progress;

CREATE OR REPLACE FUNCTION public.evaluate_mission_progress(
  p_user_id uuid,
  p_trigger_type text,
  p_progress_increment integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This dispatcher is deliberately not executable by API roles. The caller
  -- is a hardened server RPC, which may legitimately update a target user.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Mission event authentication required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Mission event user not found';
  END IF;
  IF p_trigger_type IS NULL OR btrim(p_trigger_type) = ''
     OR p_progress_increment NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Invalid mission progress event';
  END IF;

  UPDATE public.user_missions um
  SET current_progress = LEAST(m.target_value, um.current_progress + p_progress_increment),
      progress_val = LEAST(m.target_value, um.current_progress + p_progress_increment),
      status = CASE
        WHEN um.current_progress + p_progress_increment >= m.target_value THEN 'CLEAR'
        ELSE 'PROGRESS'
      END,
      updated_at = clock_timestamp()
  FROM public.missions m
  WHERE um.user_id = p_user_id
    AND um.mission_id = m.id
    AND m.is_enabled
    AND m.trigger_type = p_trigger_type
    AND um.status = 'PROGRESS';
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_user_mission_progress() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_mission_progress(uuid, text, integer) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
