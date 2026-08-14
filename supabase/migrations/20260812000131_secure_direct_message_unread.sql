-- Open Beta M6-3: close direct DM writes and expose scoped unread summaries.

CREATE INDEX IF NOT EXISTS direct_messages_recipient_sender_unread_idx
  ON public.direct_messages (recipient_id, sender_id, created_at DESC)
  WHERE is_read = false;

CREATE OR REPLACE FUNCTION public.get_direct_message_unread_counts()
RETURNS TABLE(sender_id uuid, sender_name text, unread_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT dm.sender_id, u.username AS sender_name, count(*)::bigint AS unread_count
  FROM public.direct_messages dm
  JOIN public.users u ON u.id = dm.sender_id
  WHERE dm.recipient_id = auth.uid()
    AND dm.is_read = false
  GROUP BY dm.sender_id, u.username
  ORDER BY max(dm.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.send_direct_message(p_recipient_id uuid, p_message text)
RETURNS public.direct_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message public.direct_messages;
BEGIN
  IF auth.uid() IS NULL
    OR p_recipient_id IS NULL
    OR p_recipient_id = auth.uid()
    OR p_message IS NULL
    OR char_length(trim(p_message)) NOT BETWEEN 1 AND 140 THEN
    RAISE EXCEPTION 'Invalid direct message';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Player profile required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_recipient_id) THEN
    RAISE EXCEPTION 'The direct-message recipient does not exist';
  END IF;

  INSERT INTO public.direct_messages (sender_id, recipient_id, message)
  VALUES (auth.uid(), p_recipient_id, trim(p_message))
  RETURNING * INTO v_message;
  RETURN v_message;
END;
$$;

DROP POLICY IF EXISTS "Allow all access to direct_messages" ON public.direct_messages;
DROP POLICY IF EXISTS direct_messages_select_participants ON public.direct_messages;
DROP POLICY IF EXISTS direct_messages_block_direct_insert ON public.direct_messages;
DROP POLICY IF EXISTS "Users can view their own direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can insert direct messages as sender" ON public.direct_messages;

CREATE POLICY direct_messages_participant_read
  ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

REVOKE ALL ON public.direct_messages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.direct_messages FROM authenticated;
GRANT SELECT ON public.direct_messages TO authenticated;

REVOKE ALL ON FUNCTION public.send_direct_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_direct_message_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_direct_message_unread_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_direct_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_direct_message_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_message_unread_counts() TO authenticated;
