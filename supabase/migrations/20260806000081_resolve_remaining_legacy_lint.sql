-- Alias fields keep the remaining season-reset RPCs compatible with the
-- canonical master tables used by the clean database.

ALTER TABLE public.pvp_rewards_master
  ADD COLUMN IF NOT EXISTS reward_item_id TEXT NOT NULL DEFAULT 'DIAMOND',
  ADD COLUMN IF NOT EXISTS reward_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.raid_rewards_master
  ADD COLUMN IF NOT EXISTS reward_item_id TEXT,
  ADD COLUMN IF NOT EXISTS reward_quantity INTEGER NOT NULL DEFAULT 0;

UPDATE public.raid_rewards_master
SET reward_item_id = COALESCE(reward_item_id, item_id),
    reward_quantity = CASE WHEN reward_quantity = 0 THEN COALESCE(quantity, 1) ELSE reward_quantity END;

ALTER TABLE public.gvg_matches ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE VIEW public.missions_master AS
SELECT id, category FROM public.missions;

ALTER TABLE public.user_missions
  ADD COLUMN IF NOT EXISTS progress_val INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS raid_attempts_today INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
