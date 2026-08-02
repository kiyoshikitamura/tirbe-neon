UPDATE public.users SET current_base_id = 'shinjuku' WHERE current_base_id = 'neon_tower';
UPDATE public.users SET current_base_id = 'shibuya' WHERE current_base_id = 'deep_dock';
UPDATE public.users SET current_base_id = 'ikebukuro' WHERE current_base_id = 'junk_bazar';
UPDATE public.users SET current_base_id = 'roppongi' WHERE current_base_id = 'kitakura_gate';

UPDATE public.guild_base_controls SET base_id = 'shinjuku' WHERE base_id = 'neon_tower';
UPDATE public.guild_base_controls SET base_id = 'shibuya' WHERE base_id = 'deep_dock';
UPDATE public.guild_base_controls SET base_id = 'ikebukuro' WHERE base_id = 'junk_bazar';
UPDATE public.guild_base_controls SET base_id = 'roppongi' WHERE base_id = 'kitakura_gate';

INSERT INTO public.guild_base_controls (base_id) VALUES ('akihabara') ON CONFLICT (base_id) DO NOTHING;
