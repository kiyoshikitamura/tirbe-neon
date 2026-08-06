ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_username_changed_on DATE,
  ADD COLUMN IF NOT EXISTS last_bio_changed_on DATE;

CREATE OR REPLACE FUNCTION public.guard_daily_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_today DATE := (now() AT TIME ZONE 'Asia/Tokyo')::DATE;
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF OLD.last_username_changed_on = v_today THEN RAISE EXCEPTION 'Username can only be changed once per day'; END IF;
    NEW.last_username_changed_on := v_today;
  END IF;
  IF NEW.bio IS DISTINCT FROM OLD.bio THEN
    IF OLD.last_bio_changed_on = v_today THEN RAISE EXCEPTION 'Bio can only be changed once per day'; END IF;
    NEW.last_bio_changed_on := v_today;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_daily_profile_changes_trigger ON public.users;
CREATE TRIGGER guard_daily_profile_changes_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.guard_daily_profile_changes();
