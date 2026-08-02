ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_shown_guild_dialog BOOLEAN DEFAULT false;
