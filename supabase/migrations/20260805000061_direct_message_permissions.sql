CREATE OR REPLACE FUNCTION public.send_direct_message(p_recipient_id UUID, p_message TEXT)
RETURNS public.direct_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_exists BOOLEAN;
  v_message public.direct_messages;
BEGIN
  IF auth.uid() IS NULL OR p_recipient_id IS NULL OR p_recipient_id = auth.uid() OR p_message IS NULL OR char_length(trim(p_message)) = 0 OR char_length(p_message) > 140 THEN
    RAISE EXCEPTION 'Invalid direct message';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_recipient_id
  ) INTO v_recipient_exists;
  IF NOT v_recipient_exists THEN
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
CREATE POLICY direct_messages_select_participants ON public.direct_messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY direct_messages_block_direct_insert ON public.direct_messages
  FOR INSERT WITH CHECK (FALSE);

REVOKE ALL ON FUNCTION public.send_direct_message(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_direct_message(UUID, TEXT) TO authenticated;
