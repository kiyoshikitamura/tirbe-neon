CREATE TABLE IF NOT EXISTS public.bbs_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('RECRUIT', 'STRATEGY_CHAT')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 50),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bbs_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.bbs_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bbs_threads_category_updated_at_idx ON public.bbs_threads (category, updated_at DESC);
CREATE INDEX IF NOT EXISTS bbs_posts_thread_created_at_idx ON public.bbs_posts (thread_id, created_at ASC);

ALTER TABLE public.bbs_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbs_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bbs_threads_public_read ON public.bbs_threads;
DROP POLICY IF EXISTS bbs_threads_block_direct_write ON public.bbs_threads;
DROP POLICY IF EXISTS bbs_posts_public_read ON public.bbs_posts;
DROP POLICY IF EXISTS bbs_posts_block_direct_write ON public.bbs_posts;
CREATE POLICY bbs_threads_public_read ON public.bbs_threads FOR SELECT USING (TRUE);
CREATE POLICY bbs_threads_block_direct_write ON public.bbs_threads FOR INSERT WITH CHECK (FALSE);
CREATE POLICY bbs_posts_public_read ON public.bbs_posts FOR SELECT USING (TRUE);
CREATE POLICY bbs_posts_block_direct_write ON public.bbs_posts FOR INSERT WITH CHECK (FALSE);

CREATE OR REPLACE FUNCTION public.create_bbs_thread(p_category TEXT, p_title TEXT, p_content TEXT)
RETURNS public.bbs_threads
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_thread public.bbs_threads;
  v_username TEXT;
  v_avatar_url TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_category NOT IN ('RECRUIT', 'STRATEGY_CHAT') OR p_title IS NULL OR p_content IS NULL OR char_length(trim(p_title)) NOT BETWEEN 1 AND 50 OR char_length(trim(p_content)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid BBS thread';
  END IF;
  SELECT username, avatar_url INTO v_username, v_avatar_url FROM public.users WHERE id = auth.uid();
  INSERT INTO public.bbs_threads (category, title, content, user_id, author_name, author_avatar_url)
  VALUES (p_category, trim(p_title), trim(p_content), auth.uid(), COALESCE(v_username, 'Player'), v_avatar_url)
  RETURNING * INTO v_thread;
  RETURN v_thread;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_bbs_post(p_thread_id UUID, p_content TEXT)
RETURNS public.bbs_posts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post public.bbs_posts;
  v_username TEXT;
  v_avatar_url TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_thread_id IS NULL OR p_content IS NULL OR char_length(trim(p_content)) NOT BETWEEN 1 AND 200 OR NOT EXISTS (SELECT 1 FROM public.bbs_threads WHERE id = p_thread_id) THEN
    RAISE EXCEPTION 'Invalid BBS post';
  END IF;
  SELECT username, avatar_url INTO v_username, v_avatar_url FROM public.users WHERE id = auth.uid();
  INSERT INTO public.bbs_posts (thread_id, user_id, author_name, author_avatar_url, content)
  VALUES (p_thread_id, auth.uid(), COALESCE(v_username, 'Player'), v_avatar_url, trim(p_content))
  RETURNING * INTO v_post;
  UPDATE public.bbs_threads SET updated_at = now() WHERE id = p_thread_id;
  RETURN v_post;
END;
$$;

REVOKE ALL ON FUNCTION public.create_bbs_thread(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_bbs_post(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bbs_thread(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_bbs_post(UUID, TEXT) TO authenticated;
