CREATE OR REPLACE FUNCTION public.find_gvg_match_opponent(
  p_session_key TEXT,
  p_guild_id UUID
)
RETURNS TABLE(guild_id UUID, rating INTEGER, total_power BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rating INTEGER; v_power BIGINT;
BEGIN
  SELECT COALESCE(rating_row.rating, 1000) INTO v_rating
  FROM public.guilds guild LEFT JOIN public.gvg_guild_ratings rating_row ON rating_row.guild_id = guild.id
  WHERE guild.id = p_guild_id;
  SELECT COALESCE(SUM(power.total_power), 0) INTO v_power
  FROM public.guild_members member LEFT JOIN public.user_power_rankings power ON power.user_id = member.user_id
  WHERE member.guild_id = p_guild_id;

  RETURN QUERY
  WITH active_guilds AS (
    SELECT session.guild_a_id AS id FROM public.gvg_match_sessions session
    WHERE session.session_key = p_session_key AND session.status IN ('MATCHING', 'CONFIRMED', 'ACTIVE')
    UNION
    SELECT session.guild_b_id AS id FROM public.gvg_match_sessions session
    WHERE session.session_key = p_session_key AND session.status IN ('MATCHING', 'CONFIRMED', 'ACTIVE')
  ), candidates AS (
    SELECT guild.id,
      COALESCE(rating_row.rating, 1000) AS candidate_rating,
      COALESCE(SUM(power.total_power), 0)::BIGINT AS candidate_power
    FROM public.guilds guild
    JOIN public.guild_members member ON member.guild_id = guild.id
    LEFT JOIN public.gvg_guild_ratings rating_row ON rating_row.guild_id = guild.id
    LEFT JOIN public.user_power_rankings power ON power.user_id = member.user_id
    WHERE guild.id <> p_guild_id
      AND NOT EXISTS (SELECT 1 FROM active_guilds active WHERE active.id = guild.id)
    GROUP BY guild.id, rating_row.rating
  )
  SELECT candidates.id, candidates.candidate_rating, candidates.candidate_power
  FROM candidates
  ORDER BY
    ABS(candidates.candidate_rating - v_rating),
    ABS(candidates.candidate_power - v_power)::NUMERIC / GREATEST(1, v_power),
    candidates.id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_gvg_match_opponent(TEXT, UUID) FROM PUBLIC;
