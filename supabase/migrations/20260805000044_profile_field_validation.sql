CREATE OR REPLACE FUNCTION public.guard_daily_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_today DATE := (now() AT TIME ZONE 'Asia/Tokyo')::DATE;
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF char_length(btrim(NEW.username)) = 0 OR char_length(NEW.username) > 8 THEN
      RAISE EXCEPTION 'Username must be between 1 and 8 characters';
    END IF;
    IF OLD.last_username_changed_on = v_today THEN RAISE EXCEPTION 'Username can only be changed once per day'; END IF;
    NEW.last_username_changed_on := v_today;
  END IF;
  IF NEW.bio IS DISTINCT FROM OLD.bio THEN
    IF char_length(COALESCE(NEW.bio, '')) > 200 THEN RAISE EXCEPTION 'Bio must be 200 characters or fewer'; END IF;
    IF OLD.last_bio_changed_on = v_today THEN RAISE EXCEPTION 'Bio can only be changed once per day'; END IF;
    NEW.last_bio_changed_on := v_today;
  END IF;
  RETURN NEW;
END;
$$;
