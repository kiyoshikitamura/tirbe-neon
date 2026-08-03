-- Development reconciliation: PvP opponent lookup.

CREATE OR REPLACE FUNCTION public.get_pvp_opponents(
  p_user_id UUID,
  p_my_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'user_id', u.id,
      'username', u.username,
      'rank_points', COALESCE(r.rank_points, 1000),
      'defense_character_ids', to_jsonb(array_remove(ARRAY[
        d.character_1_id,
        d.character_2_id,
        d.character_3_id,
        d.character_4_id,
        d.character_5_id
      ]::TEXT[], NULL))
    ) AS row_data
    FROM public.users u
    LEFT JOIN public.pvp_ranks r ON r.user_id = u.id
    LEFT JOIN public.pvp_defense_decks d ON d.user_id = u.id
    WHERE u.id <> p_user_id
      AND (p_my_points IS NULL OR ABS(COALESCE(r.rank_points, 1000) - p_my_points) <= 300)
    ORDER BY ABS(COALESCE(r.rank_points, 1000) - COALESCE(p_my_points, 1000)), u.id
    LIMIT 5
  ) candidates;

  RETURN v_result;
END;
$$;
