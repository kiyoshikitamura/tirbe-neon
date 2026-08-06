-- Clean-database compatibility for the current progression and reward RPCs.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS diamonds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitality_last_recovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_date DATE;

ALTER TABLE public.presents
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.user_equipments
  ADD COLUMN IF NOT EXISTS equipment_master_id TEXT;

ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS unlocked_banners JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.user_gacha_pity_points (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pity_master_id TEXT NOT NULL,
  current_points INTEGER NOT NULL DEFAULT 0 CHECK (current_points >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pity_master_id)
);
