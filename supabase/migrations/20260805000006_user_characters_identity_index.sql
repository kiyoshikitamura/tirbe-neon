-- Required by initialize_new_user's idempotent starter-character insert.
CREATE UNIQUE INDEX IF NOT EXISTS user_characters_user_character_uidx
  ON public.user_characters (user_id, character_id);
