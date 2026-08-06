-- Remove the legacy permissive policy. Its presence overrides the narrower
-- sender/recipient policies and exposes every direct message to every user.
DROP POLICY IF EXISTS "Allow all access to direct_messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can view their own direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can insert direct messages as sender" ON public.direct_messages;

CREATE POLICY "Users can view their own direct messages"
  ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert direct messages as sender"
  ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

CREATE OR REPLACE FUNCTION public.mark_direct_message_read(p_message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.direct_messages
  SET is_read = true
  WHERE id = p_message_id
    AND recipient_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the recipient can mark this message as read';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_direct_message_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_direct_message_read(UUID) TO authenticated;
