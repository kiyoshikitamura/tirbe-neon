CREATE OR REPLACE FUNCTION public.get_user_setup_status()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_user_setup_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_setup_status() TO authenticated;
