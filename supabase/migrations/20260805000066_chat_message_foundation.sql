ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.board_posts ALTER COLUMN title SET DEFAULT '';

CREATE INDEX IF NOT EXISTS board_posts_chat_target_created_at_idx ON public.board_posts (target_type, target_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.send_chat_message(p_target_type TEXT, p_content TEXT)
RETURNS public.board_posts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target_id UUID;
  v_username TEXT;
  v_avatar_url TEXT;
  v_message public.board_posts;
BEGIN
  IF auth.uid() IS NULL OR p_target_type NOT IN ('GLOBAL', 'GUILD') OR p_content IS NULL OR char_length(trim(p_content)) NOT BETWEEN 1 AND 140 THEN
    RAISE EXCEPTION 'Invalid chat message';
  END IF;
  IF p_target_type = 'GUILD' THEN
    SELECT guild_id INTO v_target_id FROM public.guild_members WHERE user_id = auth.uid();
    IF v_target_id IS NULL THEN RAISE EXCEPTION 'Guild membership required'; END IF;
  END IF;
  SELECT username, avatar_url INTO v_username, v_avatar_url FROM public.users WHERE id = auth.uid();
  INSERT INTO public.board_posts (title, content, author_id, user_id, author_name, author_avatar_url, target_type, target_id, is_system)
  VALUES ('', trim(p_content), auth.uid(), auth.uid(), COALESCE(v_username, 'Player'), v_avatar_url, p_target_type, v_target_id, FALSE)
  RETURNING * INTO v_message;
  RETURN v_message;
END;
$$;

DROP POLICY IF EXISTS "Allow all access to board_posts" ON public.board_posts;
DROP POLICY IF EXISTS board_posts_chat_read ON public.board_posts;
DROP POLICY IF EXISTS board_posts_block_direct_insert ON public.board_posts;
CREATE POLICY board_posts_chat_read ON public.board_posts FOR SELECT USING (
  target_type = 'GLOBAL'
  OR (target_type = 'GUILD' AND EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = board_posts.target_id AND user_id = auth.uid()
  ))
);
CREATE POLICY board_posts_block_direct_insert ON public.board_posts FOR INSERT WITH CHECK (FALSE);

REVOKE ALL ON FUNCTION public.send_chat_message(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_chat_message(TEXT, TEXT) TO authenticated;
