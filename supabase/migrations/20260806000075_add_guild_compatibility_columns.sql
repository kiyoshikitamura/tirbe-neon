-- Clean-database compatibility for guild RPCs retained by the current client.

ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_icon TEXT NOT NULL DEFAULT 'guild_icon_default.png',
  ADD COLUMN IF NOT EXISTS color_theme TEXT NOT NULL DEFAULT 'red',
  ADD COLUMN IF NOT EXISTS cash BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_kick_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS unlocked_decorations JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS guild_id UUID REFERENCES public.guilds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_guild_id_idx ON public.users (guild_id);
