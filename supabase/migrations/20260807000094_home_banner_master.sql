CREATE TABLE IF NOT EXISTS public.home_banner_master (
  id text PRIMARY KEY,
  title text NOT NULL,
  image_url text NOT NULL,
  destination_type text NOT NULL,
  destination_value text,
  priority integer NOT NULL DEFAULT 0,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_banner_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read active home banners" ON public.home_banner_master FOR SELECT USING (active AND start_at <= now() AND (end_at IS NULL OR end_at > now()));

INSERT INTO public.home_banner_master (id, title, image_url, destination_type, destination_value, priority, start_at, end_at)
VALUES
  ('vip_pass', 'VIP PASS｜毎日ログインでダイヤを獲得', '/gacha/bg_gacha_ssr.png', 'TAB', 'shop:LIMITED', 100, '2026-01-01T00:00:00Z', '2030-01-01T00:00:00Z'),
  ('gvg_season_02', '【GvG抗争】第2シーズン 覇権争奪戦 開幕', '/gacha/bg_gacha_ssr.png', 'TAB', 'gvg', 90, '2026-01-01T00:00:00Z', '2030-01-01T00:00:00Z'),
  ('pickup_ssr_go', '【ピックアップガチャ】SSR「剛」新登場！', '/gacha/bg_gacha_sr.png', 'TAB', 'gacha', 80, '2026-01-01T00:00:00Z', '2030-01-01T00:00:00Z'),
  ('raid_raijin', '【レイドイベント】強敵「雷神」襲来中！', '/gacha/bg_gacha_normal.png', 'TAB', 'raid', 70, '2026-01-01T00:00:00Z', '2030-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, image_url = EXCLUDED.image_url, destination_type = EXCLUDED.destination_type, destination_value = EXCLUDED.destination_value, priority = EXCLUDED.priority, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, active = true;
