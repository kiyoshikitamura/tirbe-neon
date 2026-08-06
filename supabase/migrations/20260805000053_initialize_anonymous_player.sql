CREATE OR REPLACE FUNCTION public.initialize_new_user(
  p_user_id UUID,
  p_username TEXT,
  p_character_id TEXT,
  p_area_id TEXT,
  p_gift_code TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_hair_id TEXT DEFAULT NULL,
  p_face_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF char_length(trim(p_username)) NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'Username must contain 1 to 8 characters';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE username = trim(p_username) AND id <> p_user_id) THEN
    RAISE EXCEPTION 'Username is already in use';
  END IF;

  INSERT INTO public.users (
    id, username, current_base_id, favorite_character_id, gift_code
  ) VALUES (
    p_user_id, trim(p_username), COALESCE(NULLIF(p_area_id, ''), 'neon_tower'),
    COALESCE(NULLIF(p_character_id, ''), '11111111-1111-1111-1111-111111111111'),
    NULLIF(trim(COALESCE(p_gift_code, '')), '')
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_characters (user_id, character_id, level, awakening_level)
  VALUES (
    p_user_id,
    COALESCE(NULLIF(p_character_id, ''), '11111111-1111-1111-1111-111111111111'),
    1,
    0
  ) ON CONFLICT (user_id, character_id) DO NOTHING;

  RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.initialize_new_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.initialize_new_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
