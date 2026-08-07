-- Shared cosmetic ownership foundation. Legacy profile/guild columns remain
-- readable during the staged UI migration.
CREATE TABLE IF NOT EXISTS public.cosmetic_master (
  id text PRIMARY KEY,
  owner_scope text NOT NULL CHECK (owner_scope IN ('USER', 'CHARACTER', 'GUILD')),
  slot text NOT NULL,
  rarity text NOT NULL DEFAULT 'COMMON',
  display_name text NOT NULL,
  asset_key text,
  preview_key text,
  source_type text NOT NULL DEFAULT 'SYSTEM',
  source_reference text,
  expires_enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_cosmetics (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cosmetic_id text NOT NULL REFERENCES public.cosmetic_master(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source_type text,
  source_reference text,
  PRIMARY KEY (user_id, cosmetic_id)
);

CREATE TABLE IF NOT EXISTS public.character_cosmetics (
  user_character_id uuid NOT NULL REFERENCES public.user_characters(id) ON DELETE CASCADE,
  cosmetic_id text NOT NULL REFERENCES public.cosmetic_master(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  PRIMARY KEY (user_character_id, cosmetic_id)
);

CREATE TABLE IF NOT EXISTS public.guild_cosmetics (
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  cosmetic_id text NOT NULL REFERENCES public.cosmetic_master(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source_type text,
  source_reference text,
  PRIMARY KEY (guild_id, cosmetic_id)
);

CREATE TABLE IF NOT EXISTS public.equipped_cosmetics (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slot text NOT NULL,
  cosmetic_id text NOT NULL REFERENCES public.cosmetic_master(id) ON DELETE CASCADE,
  equipped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS public.guild_equipped_cosmetics (
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  slot text NOT NULL,
  cosmetic_id text NOT NULL REFERENCES public.cosmetic_master(id) ON DELETE CASCADE,
  equipped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guild_id, slot)
);

ALTER TABLE public.cosmetic_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipped_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_equipped_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read active cosmetics" ON public.cosmetic_master FOR SELECT USING (active);
CREATE POLICY "Read own cosmetics" ON public.user_cosmetics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Read own equipped cosmetics" ON public.equipped_cosmetics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Read own character cosmetics" ON public.character_cosmetics FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_characters c WHERE c.id = user_character_id AND c.user_id = auth.uid()));
CREATE POLICY "Read guild cosmetics" ON public.guild_cosmetics FOR SELECT USING (EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = guild_cosmetics.guild_id AND gm.user_id = auth.uid()));
CREATE POLICY "Read equipped guild cosmetics" ON public.guild_equipped_cosmetics FOR SELECT USING (EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = guild_equipped_cosmetics.guild_id AND gm.user_id = auth.uid()));

INSERT INTO public.cosmetic_master (id, owner_scope, slot, rarity, display_name, asset_key, source_type)
VALUES
  ('bg_default', 'USER', 'HOME_BACKGROUND', 'COMMON', '現在地に合わせる', 'bg_default', 'SYSTEM'),
  ('effect_none', 'USER', 'HOME_FOREGROUND', 'COMMON', 'エフェクトなし', 'effect_none', 'SYSTEM'),
  ('interior_none', 'USER', 'HOME_INTERIOR', 'COMMON', '内装なし', 'none', 'SYSTEM'),
  ('interior_neon_sign', 'USER', 'HOME_INTERIOR', 'RARE', 'ネオン看板', 'interior_neon_sign', 'EVENT'),
  ('interior_trophy_case', 'USER', 'HOME_INTERIOR', 'EPIC', '戦績ケース', 'interior_trophy_case', 'GVG'),
  ('interior_speaker_stack', 'USER', 'HOME_INTERIOR', 'RARE', 'スピーカー', 'interior_speaker_stack', 'SHOP')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, asset_key = EXCLUDED.asset_key;
