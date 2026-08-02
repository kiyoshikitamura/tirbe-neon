ALTER TABLE public.users ADD COLUMN IF NOT EXISTS raid_attempts_today INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS raid_attempts_reset_at TIMESTAMPTZ DEFAULT now();
