CREATE OR REPLACE FUNCTION public.get_public_profiles(p_user_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(profile))
    FROM (
      SELECT
        user_row.id,
        user_row.id AS user_id,
        user_row.username,
        user_row.avatar_url,
        user_row.bio,
        user_row.favorite_character_id,
        user_row.level,
        user_row.xp,
        user_row.title_equipped,
        COALESCE(title_master.name, user_row.title_equipped) AS title_name,
        guild_member.guild_id,
        guild.name AS guild_name
      FROM public.users user_row
      LEFT JOIN public.title_master title_master ON title_master.id = user_row.title_equipped
      LEFT JOIN public.guild_members guild_member ON guild_member.user_id = user_row.id
      LEFT JOIN public.guilds guild ON guild.id = guild_member.guild_id
      WHERE user_row.id = ANY(p_user_ids)
    ) profile
  ), '[]'::jsonb);
END;
$$;
