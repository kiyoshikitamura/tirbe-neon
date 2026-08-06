-- Compatibility fields required by retained guild, mission, and season RPCs.

CREATE TABLE IF NOT EXISTS public.guild_decorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  decoration_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, decoration_id)
);

ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS equipped_decoration TEXT,
  ADD COLUMN IF NOT EXISTS equipped_banner TEXT;

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS reward_quantity INTEGER NOT NULL DEFAULT 1;

UPDATE public.missions
SET reward_quantity = COALESCE(reward_qty, 1)
WHERE reward_quantity = 1;

ALTER TABLE public.pvp_rewards_master
  ADD COLUMN IF NOT EXISTS threshold_points INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.raid_damage_logs
  ADD COLUMN IF NOT EXISTS raid_boss_id TEXT,
  ADD COLUMN IF NOT EXISTS damage_dealt BIGINT NOT NULL DEFAULT 0;

UPDATE public.raid_damage_logs
SET raid_boss_id = COALESCE(raid_boss_id, boss_id),
    damage_dealt = CASE WHEN damage_dealt = 0 THEN COALESCE(damage, 0) ELSE damage_dealt END;
