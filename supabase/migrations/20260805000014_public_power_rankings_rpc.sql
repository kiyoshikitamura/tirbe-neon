CREATE OR REPLACE FUNCTION public.get_public_power_rankings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(x) ORDER BY x.current_power DESC) FROM (
      SELECT r.user_id, r.current_power, r.updated_at,
             u.username, u.avatar_url,
             gm.guild_id, g.name AS guild_name
      FROM public.user_power_rankings r
      LEFT JOIN public.users u ON u.id = r.user_id
      LEFT JOIN public.guild_members gm ON gm.user_id = r.user_id
      LEFT JOIN public.guilds g ON g.id = gm.guild_id
    ) x
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_power_rankings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_power_rankings() TO authenticated;
