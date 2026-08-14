-- Open Beta M6-2: authenticated BBS reads and server-side per-thread read state.

CREATE TABLE IF NOT EXISTS public.bbs_read_states (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.bbs_threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_id)
);

ALTER TABLE public.bbs_read_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bbs_read_states_owner_read ON public.bbs_read_states;
CREATE POLICY bbs_read_states_owner_read
  ON public.bbs_read_states FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.bbs_read_states FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.bbs_read_states FROM authenticated;
GRANT SELECT ON public.bbs_read_states TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_bbs_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_thread_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.bbs_threads WHERE id = p_thread_id
  ) THEN
    RAISE EXCEPTION 'Invalid BBS thread';
  END IF;

  INSERT INTO public.bbs_read_states (user_id, thread_id, last_read_at)
  VALUES (auth.uid(), p_thread_id, clock_timestamp())
  ON CONFLICT (user_id, thread_id)
  DO UPDATE SET last_read_at = EXCLUDED.last_read_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bbs_unread_counts()
RETURNS TABLE(thread_id uuid, unread_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH current_player AS (
    SELECT id, created_at
    FROM public.users
    WHERE id = auth.uid()
  ), activities AS (
    SELECT t.id AS thread_id, t.created_at AS activity_at
    FROM public.bbs_threads t
    WHERE t.user_id <> auth.uid()
    UNION ALL
    SELECT p.thread_id, p.created_at
    FROM public.bbs_posts p
    WHERE p.user_id <> auth.uid()
  )
  SELECT t.id AS thread_id, count(a.activity_at)::bigint AS unread_count
  FROM public.bbs_threads t
  CROSS JOIN current_player cp
  LEFT JOIN public.bbs_read_states rs
    ON rs.user_id = cp.id AND rs.thread_id = t.id
  JOIN activities a
    ON a.thread_id = t.id
   AND a.activity_at > COALESCE(rs.last_read_at, cp.created_at)
  GROUP BY t.id
  HAVING count(a.activity_at) > 0
  ORDER BY t.id;
$$;

DROP POLICY IF EXISTS bbs_threads_public_read ON public.bbs_threads;
DROP POLICY IF EXISTS bbs_threads_block_direct_write ON public.bbs_threads;
DROP POLICY IF EXISTS bbs_posts_public_read ON public.bbs_posts;
DROP POLICY IF EXISTS bbs_posts_block_direct_write ON public.bbs_posts;

CREATE POLICY bbs_threads_authenticated_read
  ON public.bbs_threads FOR SELECT TO authenticated
  USING (true);
CREATE POLICY bbs_posts_authenticated_read
  ON public.bbs_posts FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON public.bbs_threads FROM anon;
REVOKE ALL ON public.bbs_posts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.bbs_threads FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bbs_posts FROM authenticated;
GRANT SELECT ON public.bbs_threads TO authenticated;
GRANT SELECT ON public.bbs_posts TO authenticated;

REVOKE ALL ON FUNCTION public.mark_bbs_thread_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_bbs_unread_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_bbs_thread_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bbs_unread_counts() TO authenticated;

-- Reassert the existing mutation RPC trust boundary.
REVOKE ALL ON FUNCTION public.create_bbs_thread(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_bbs_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_bbs_thread(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_bbs_post(uuid, text) TO authenticated;
