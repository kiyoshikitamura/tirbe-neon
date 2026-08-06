-- The baseline still contains this UUID-character overload. It references the
-- pre-baseline user_invitations column names (inviter_id/invitee_id), so schema
-- lint fails even though the current text-character implementation is the one
-- used by the application. Keeping both overloads also makes PostgREST RPC
-- resolution needlessly ambiguous.
DROP FUNCTION IF EXISTS public.initialize_new_user(
  UUID,
  TEXT,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);
