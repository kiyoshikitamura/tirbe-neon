-- Open Beta M6-1: server-authoritative chat cooldowns, unread state, and RLS.

CREATE TABLE IF NOT EXISTS public.chat_read_states (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('GLOBAL', 'GUILD')),
  target_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

ALTER TABLE public.chat_read_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_read_states_owner_read ON public.chat_read_states;
DROP POLICY IF EXISTS chat_read_states_block_direct_write ON public.chat_read_states;
CREATE POLICY chat_read_states_owner_read
  ON public.chat_read_states FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.chat_read_states FROM anon, authenticated;
REVOKE ALL ON public.chat_read_states FROM anon;
GRANT SELECT ON public.chat_read_states TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_chat_channel_read(p_target_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  IF auth.uid() IS NULL OR p_target_type NOT IN ('GLOBAL', 'GUILD') THEN
    RAISE EXCEPTION 'Invalid chat channel';
  END IF;

  IF p_target_type = 'GUILD' THEN
    SELECT guild_id INTO v_target_id
    FROM public.guild_members
    WHERE user_id = auth.uid();

    IF v_target_id IS NULL THEN
      RAISE EXCEPTION 'Guild membership required';
    END IF;
  END IF;

  INSERT INTO public.chat_read_states (user_id, target_type, target_id, last_read_at)
  VALUES (auth.uid(), p_target_type, v_target_id, clock_timestamp())
  ON CONFLICT (user_id, target_type, target_id)
  DO UPDATE SET last_read_at = EXCLUDED.last_read_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_chat_unread_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_guild_id uuid;
  v_global_target uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_global_read_at timestamptz;
  v_guild_read_at timestamptz;
  v_global_count integer := 0;
  v_guild_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.chat_read_states (user_id, target_type, target_id, last_read_at)
  VALUES (v_user_id, 'GLOBAL', v_global_target, clock_timestamp())
  ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

  SELECT last_read_at INTO v_global_read_at
  FROM public.chat_read_states
  WHERE user_id = v_user_id
    AND target_type = 'GLOBAL'
    AND target_id = v_global_target;

  SELECT count(*)::integer INTO v_global_count
  FROM public.board_posts
  WHERE target_type = 'GLOBAL'
    AND created_at > v_global_read_at
    AND COALESCE(user_id, author_id) IS DISTINCT FROM v_user_id;

  SELECT guild_id INTO v_guild_id
  FROM public.guild_members
  WHERE user_id = v_user_id;

  IF v_guild_id IS NOT NULL THEN
    INSERT INTO public.chat_read_states (user_id, target_type, target_id, last_read_at)
    VALUES (v_user_id, 'GUILD', v_guild_id, clock_timestamp())
    ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

    SELECT last_read_at INTO v_guild_read_at
    FROM public.chat_read_states
    WHERE user_id = v_user_id
      AND target_type = 'GUILD'
      AND target_id = v_guild_id;

    SELECT count(*)::integer INTO v_guild_count
    FROM public.board_posts
    WHERE target_type = 'GUILD'
      AND target_id = v_guild_id
      AND created_at > v_guild_read_at
      AND COALESCE(user_id, author_id) IS DISTINCT FROM v_user_id;
  END IF;

  RETURN jsonb_build_object('GLOBAL', v_global_count, 'GUILD', v_guild_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_chat_message(p_target_type text, p_content text)
RETURNS public.board_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id uuid;
  v_username text;
  v_avatar_url text;
  v_message public.board_posts;
  v_cooldown interval;
  v_last_sent_at timestamptz;
BEGIN
  IF auth.uid() IS NULL
    OR p_target_type NOT IN ('GLOBAL', 'GUILD')
    OR p_content IS NULL
    OR char_length(trim(p_content)) NOT BETWEEN 1 AND 140 THEN
    RAISE EXCEPTION 'Invalid chat message';
  END IF;

  IF p_target_type = 'GUILD' THEN
    SELECT guild_id INTO v_target_id
    FROM public.guild_members
    WHERE user_id = auth.uid();
    IF v_target_id IS NULL THEN
      RAISE EXCEPTION 'Guild membership required';
    END IF;
    v_cooldown := interval '3 seconds';
  ELSE
    v_cooldown := interval '10 seconds';
  END IF;

  -- Serialize messages from the same account so simultaneous requests cannot
  -- bypass the canonical cooldown.
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));

  SELECT max(created_at) INTO v_last_sent_at
  FROM public.board_posts
  WHERE COALESCE(user_id, author_id) = auth.uid()
    AND target_type = p_target_type
    AND (p_target_type = 'GLOBAL' OR target_id = v_target_id);

  IF v_last_sent_at IS NOT NULL AND clock_timestamp() < v_last_sent_at + v_cooldown THEN
    RAISE EXCEPTION 'Chat cooldown is active';
  END IF;

  SELECT username, avatar_url INTO v_username, v_avatar_url
  FROM public.users
  WHERE id = auth.uid();

  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Player profile required';
  END IF;

  INSERT INTO public.board_posts (
    title, content, author_id, user_id, author_name, author_avatar_url,
    target_type, target_id, is_system
  ) VALUES (
    '', trim(p_content), auth.uid(), auth.uid(), v_username, v_avatar_url,
    p_target_type, v_target_id, false
  )
  RETURNING * INTO v_message;

  RETURN v_message;
END;
$$;

DROP POLICY IF EXISTS "Allow all access to board_posts" ON public.board_posts;
DROP POLICY IF EXISTS board_posts_chat_read ON public.board_posts;
DROP POLICY IF EXISTS board_posts_block_direct_insert ON public.board_posts;
CREATE POLICY board_posts_chat_read
  ON public.board_posts FOR SELECT TO authenticated
  USING (
    target_type = 'GLOBAL'
    OR (
      target_type = 'GUILD'
      AND EXISTS (
        SELECT 1
        FROM public.guild_members
        WHERE guild_id = board_posts.target_id
          AND user_id = auth.uid()
      )
    )
  );

REVOKE ALL ON public.board_posts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.board_posts FROM authenticated;
GRANT SELECT ON public.board_posts TO authenticated;

-- Legacy user_chats is unused by the current client. Close its original
-- permissive policy so it cannot become a parallel RLS bypass.
DROP POLICY IF EXISTS "Allow all access to user_chats" ON public.user_chats;
REVOKE ALL ON public.user_chats FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.send_chat_message(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_chat_channel_read(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_chat_unread_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_chat_channel_read(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_counts() TO authenticated;
