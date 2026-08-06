CREATE OR REPLACE FUNCTION public.guard_equipped_title_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.title_equipped IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_titles AS owned
    WHERE owned.user_id = NEW.id
      AND owned.title_id = NEW.title_equipped
  ) THEN
    RAISE EXCEPTION 'Equipped title must be owned by the user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_equipped_title_ownership ON public.users;
CREATE TRIGGER enforce_equipped_title_ownership
  BEFORE UPDATE OF title_equipped ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_equipped_title_ownership();
