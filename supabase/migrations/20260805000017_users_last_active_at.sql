ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE INDEX IF NOT EXISTS users_last_active_at_idx
  ON public.users (last_active_at);
