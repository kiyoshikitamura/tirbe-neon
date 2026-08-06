CREATE OR REPLACE FUNCTION public.equip_owned_title(p_title_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_titles owned WHERE owned.user_id = v_user_id AND owned.title_id = p_title_id) THEN
    RAISE EXCEPTION 'Title is not owned';
  END IF;
  UPDATE public.users SET title_equipped = p_title_id WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.equip_owned_title(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.equip_owned_title(TEXT) TO authenticated;
