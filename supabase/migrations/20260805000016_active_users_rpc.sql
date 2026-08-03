CREATE OR REPLACE FUNCTION public.sync_active_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.users SET last_active_at = now() WHERE id = auth.uid();
  SELECT count(*) INTO v_count FROM public.users WHERE last_active_at >= now() - interval '5 minutes';
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_active_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_active_users() TO authenticated;
