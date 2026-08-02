CREATE TABLE IF NOT EXISTS public.gacha_banner_master (
  id TEXT PRIMARY KEY,
  banner_type TEXT NOT NULL,       -- 'PICKUP' | 'LIMITED'
  gacha_category TEXT NOT NULL,    -- 'CHARACTER' | 'SKILL' | 'EQUIPMENT'
  target_item_ids JSONB NOT NULL,
  pickup_rate REAL DEFAULT 0.025,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  banner_image_url TEXT,
  description TEXT
);

-- seed data
INSERT INTO public.gacha_banner_master (id, banner_type, gacha_category, target_item_ids, start_at, end_at, banner_image_url, description)
VALUES (
  'banner_pickup_char_01', 
  'PICKUP', 
  'CHARACTER', 
  '["char_akira", "char_shin"]', 
  now() - interval '1 day', 
  now() + interval '14 days', 
  '/gacha/banner_pickup_char.png', 
  '【ピックアップ構成員】アキラ＆シン'
) ON CONFLICT (id) DO NOTHING;
