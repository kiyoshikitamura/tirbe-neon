CREATE OR REPLACE FUNCTION public.get_public_leader_characters(p_user_ids uuid[])
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
      SELECT DISTINCT ON (c.user_id) c.user_id, c.id, c.character_id, c.level
      FROM public.user_characters c
      WHERE c.user_id = ANY(p_user_ids)
      ORDER BY c.user_id, c.level DESC, c.awakening_level DESC, c.id
    ) x
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_leader_characters(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_leader_characters(uuid[]) TO authenticated;
