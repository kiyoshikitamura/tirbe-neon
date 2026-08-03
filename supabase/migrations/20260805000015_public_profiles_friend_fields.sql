CREATE OR REPLACE FUNCTION public.get_public_profiles(p_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(x)) FROM (
      SELECT id AS user_id, username, avatar_url, bio, favorite_character_id, 1 AS level, NULL::text AS title_equipped
      FROM public.users WHERE id = ANY(p_user_ids)
    ) x
  ), '[]'::jsonb);
END;
$$;
