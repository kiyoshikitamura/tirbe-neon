-- Clean-database compatibility: direct-message read receipts are used by the
-- client and by mark_direct_message_read.

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS direct_messages_recipient_unread_idx
  ON public.direct_messages (recipient_id, created_at DESC)
  WHERE is_read = false;
