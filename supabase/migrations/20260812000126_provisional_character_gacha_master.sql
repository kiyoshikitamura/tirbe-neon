-- Open Beta M4 provisional 60-character release master.
-- Replace rows in character_release_master after the final art-quality review;
-- gacha pools and battle master can then be regenerated from that table.

CREATE TABLE IF NOT EXISTS public.character_release_master (
  character_id text PRIMARY KEY,
  display_name text NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'SSR')),
  alignment text NOT NULL CHECK (alignment IN ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS')),
  growth_pattern_id text NOT NULL REFERENCES public.character_growth_patterns(pattern_id),
  asset_path text NOT NULL,
  display_order integer NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  is_provisional boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_release_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS character_release_master_read ON public.character_release_master;
CREATE POLICY character_release_master_read ON public.character_release_master
  FOR SELECT TO anon, authenticated USING (is_enabled);
REVOKE ALL ON TABLE public.character_release_master FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.character_release_master TO anon, authenticated;

WITH seed(character_id, display_name, rarity, asset_path, display_order, alignment, growth_pattern_id) AS (
  VALUES
    ('11111111-1111-1111-1111-111111111111', 'レイジ', 'SSR', '/characters/reiji_transparent_asset.png', 1, 'ORDER', 'BALANCED'),
    ('33333333-3333-3333-3333-333333333333', 'ルイ', 'SSR', '/characters/rui_transparent_asset.png', 2, 'CHAOS', 'SPEEDSTER'),
    ('22222222-2222-2222-2222-222222222222', 'チャン', 'SSR', '/characters/chang_transparent_asset.png', 3, 'EVIL', 'ATTACKER'),
    ('char_go_01', 'ゴウ', 'SR', '/characters/go_transparent_asset.png', 4, 'ORDER', 'HP_TANK'),
    ('char_kengo_01', 'ケンゴ', 'SR', '/characters/kengo_transparent_asset.png', 5, 'CHAOS', 'SPEEDSTER'),
    ('char_mio_01', 'ミオ', 'SR', '/characters/mio_transparent_asset.png', 6, 'CHAOS', 'ATTACKER'),
    ('char_naoto_01', 'ナオト', 'SR', '/characters/naoto_transparent_asset.png', 7, 'JUSTICE', 'ATTACKER'),
    ('char_rin_01', 'リン', 'SR', '/characters/rin_transparent_asset.png', 8, 'ORDER', 'BALANCED'),
    ('char_serika_01', 'セリカ', 'SR', '/characters/serika_transparent_asset.png', 9, 'EVIL', 'LUCKY_STAR'),
    ('char_shin_01', 'シン', 'SR', '/characters/shin_transparent_asset.png', 10, 'EVIL', 'SPEEDSTER'),
    ('char_tetsu_01', 'テツ', 'SR', '/characters/tetsu_transparent_asset.png', 11, 'JUSTICE', 'DEFENDER'),
    ('char_yuji_01', 'ユウジ', 'N', '/characters/yuuji_transparent_asset.png', 12, 'CHAOS', 'BALANCED'),
    ('char_ageha_01', 'アゲハ', 'SSR', '/characters/ageha_transparent_asset.png', 13, NULL, NULL),
    ('char_alice_01', 'アリス', 'SSR', '/characters/alice_transparent_asset.png', 14, NULL, NULL),
    ('char_aoi_01', 'アオイ', 'SR', '/characters/aoi_transparent_asset.png', 15, NULL, NULL),
    ('char_cecile_01', 'セシル', 'SR', '/characters/cecile_transparent_asset.png', 16, NULL, NULL),
    ('char_daimon_01', 'ダイモン', 'SR', '/characters/daimon_transparent_asset.png', 17, NULL, NULL),
    ('char_genji_01', 'ゲンジ', 'SR', '/characters/genji_transparent_asset.png', 18, NULL, NULL),
    ('char_gou_01', 'ゴウ', 'SR', '/characters/gou_transparent_asset.png', 19, NULL, NULL),
    ('char_jihoon_01', 'ジフン', 'SR', '/characters/jihoon_transparent_asset.png', 20, NULL, NULL),
    ('char_joe_01', 'ジョー', 'SR', '/characters/joe_transparent_asset.png', 21, NULL, NULL),
    ('char_kaede_01', 'カエデ', 'SR', '/characters/kaede_transparent_asset.png', 22, NULL, NULL),
    ('char_kageyama_01', 'カゲヤマ', 'SR', '/characters/kageyama_transparent_asset.png', 23, NULL, NULL),
    ('char_kaito_01', 'カイト', 'SSR', '/characters/kaito_transparent_asset.png', 24, NULL, NULL),
    ('char_karen_01', 'カレン', 'SR', '/characters/karen_transparent_asset.png', 25, NULL, NULL),
    ('char_koharu_01', 'コハル', 'SSR', '/characters/koharu_transparent_asset.png', 26, NULL, NULL),
    ('char_kenji_01', 'ケンジ', 'N', '/characters/kenji_transparent_asset.png', 27, NULL, NULL),
    ('char_leo_01', 'レオ', 'SR', '/characters/leo_transparent_asset.png', 28, NULL, NULL),
    ('char_leon_01', 'レオン', 'SSR', '/characters/leon_transparent_asset.png', 29, NULL, NULL),
    ('char_long_01', 'ロン', 'SR', '/characters/long_transparent_asset.png', 30, NULL, NULL),
    ('char_lucas_01', 'ルーカス', 'R', '/characters/lucas_transparent_asset.png', 31, NULL, NULL),
    ('char_makoto_01', 'マコト', 'R', '/characters/makoto_transparent_asset.png', 32, NULL, NULL),
    ('char_mark_01', 'マーク', 'R', '/characters/mark_transparent_asset.png', 33, NULL, NULL),
    ('char_martina_01', 'マルティナ', 'R', '/characters/martina_transparent_asset.png', 34, NULL, NULL),
    ('char_masato_01', 'マサト', 'R', '/characters/masato_transparent_asset.png', 35, NULL, NULL),
    ('char_maya_01', 'マヤ', 'R', '/characters/maya_transparent_asset.png', 36, NULL, NULL),
    ('char_mei_01', 'メイ', 'R', '/characters/mei_transparent_asset.png', 37, NULL, NULL),
    ('char_minami_01', 'ミナミ', 'R', '/characters/minami_transparent_asset.png', 38, NULL, NULL),
    ('char_miyabi_01', 'ミヤビ', 'R', '/characters/miyabi_transparent_asset.png', 39, NULL, NULL),
    ('char_momoko_01', 'モモコ', 'R', '/characters/momoko_transparent_asset.png', 40, NULL, NULL),
    ('char_noa_01', 'ノア', 'R', '/characters/noa_transparent_asset.png', 41, NULL, NULL),
    ('char_reina_01', 'レイナ', 'R', '/characters/reina_transparent_asset.png', 42, NULL, NULL),
    ('char_ren_male_01', 'レン', 'R', '/characters/ren_male_transparent_asset.png', 43, NULL, NULL),
    ('char_ren_01', 'レン', 'R', '/characters/ren_transparent_asset.png', 44, NULL, NULL),
    ('char_riki_01', 'リキ', 'R', '/characters/riki_transparent_asset.png', 45, NULL, NULL),
    ('char_sakura_01', 'サクラ', 'SSR', '/characters/sakura_transparent_asset.png', 46, NULL, NULL),
    ('char_sawat_01', 'サワット', 'R', '/characters/sawat_transparent_asset.png', 47, NULL, NULL),
    ('char_seiya_01', 'セイヤ', 'R', '/characters/seiya_transparent_asset.png', 48, NULL, NULL),
    ('char_shion_01', 'シオン', 'R', '/characters/shion_transparent_asset.png', 49, NULL, NULL),
    ('char_shun_01', 'シュン', 'R', '/characters/shun_transparent_asset.png', 50, NULL, NULL),
    ('char_sora_01', 'ソラ', 'R', '/characters/sora_transparent_asset.png', 51, NULL, NULL),
    ('char_souta_01', 'ソウタ', 'N', '/characters/souta_transparent_asset.png', 52, NULL, NULL),
    ('char_taiga_01', 'タイガ', 'N', '/characters/taiga_transparent_asset.png', 53, NULL, NULL),
    ('char_takeshi_01', 'タケシ', 'N', '/characters/takeshi_transparent_asset.png', 54, NULL, NULL),
    ('char_takuro_01', 'タクロウ', 'N', '/characters/takuro_transparent_asset.png', 55, NULL, NULL),
    ('char_tatsuya_01', 'タツヤ', 'N', '/characters/tatsuya_transparent_asset.png', 56, NULL, NULL),
    ('char_tomoya_01', 'トモヤ', 'N', '/characters/tomoya_transparent_asset.png', 57, NULL, NULL),
    ('char_yoshihiko_01', 'ヨシヒコ', 'N', '/characters/yoshihiko_transparent_asset.png', 58, NULL, NULL),
    ('char_yuki_01', 'ユウキ', 'SSR', '/characters/yuki_transparent_asset.png', 59, NULL, NULL),
    ('char_yukina_01', 'ユキナ', 'N', '/characters/yukina_transparent_asset.png', 60, NULL, NULL)
), normalized AS (
  SELECT character_id, display_name, rarity, asset_path, display_order,
         COALESCE(alignment, (ARRAY['ORDER','CHAOS','JUSTICE','EVIL']::text[])[mod(display_order - 13, 4) + 1]) AS alignment,
         COALESCE(growth_pattern_id, (ARRAY['BALANCED','ATTACKER','DEFENDER','SPEEDSTER','LUCKY_STAR','HP_TANK']::text[])[mod(display_order - 13, 6) + 1]) AS growth_pattern_id
  FROM seed
)
INSERT INTO public.character_release_master (
  character_id, display_name, rarity, alignment, growth_pattern_id,
  asset_path, display_order, is_enabled, is_provisional, updated_at
)
SELECT character_id, display_name, rarity, alignment, growth_pattern_id,
       asset_path, display_order, true, true, now()
FROM normalized
ON CONFLICT (character_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  rarity = EXCLUDED.rarity,
  alignment = EXCLUDED.alignment,
  growth_pattern_id = EXCLUDED.growth_pattern_id,
  asset_path = EXCLUDED.asset_path,
  display_order = EXCLUDED.display_order,
  is_enabled = true,
  is_provisional = true,
  updated_at = now();

INSERT INTO public.character_battle_master (
  character_id, display_name, alignment, growth_pattern_id, rarity_multiplier
)
SELECT character_id, display_name, alignment, growth_pattern_id,
       CASE rarity WHEN 'N' THEN 0.80 WHEN 'R' THEN 0.90 WHEN 'SR' THEN 1.00 ELSE 1.10 END
FROM public.character_release_master
WHERE is_enabled
ON CONFLICT (character_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  alignment = EXCLUDED.alignment,
  growth_pattern_id = EXCLUDED.growth_pattern_id,
  rarity_multiplier = EXCLUDED.rarity_multiplier;

INSERT INTO public.gacha_masters (id, name, gacha_type, cost_cash, cost_diamond)
VALUES
  ('CHAR_NORMAL', 'Normal Character Scout', 'CHARACTER', 1000, 100),
  ('CHAR_SPECIAL', 'Special Character Scout', 'CHARACTER', 3000, 300)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  gacha_type = EXCLUDED.gacha_type,
  cost_cash = EXCLUDED.cost_cash,
  cost_diamond = EXCLUDED.cost_diamond;

DELETE FROM public.gacha_items_master WHERE gacha_id IN ('CHAR_NORMAL', 'CHAR_SPECIAL');

INSERT INTO public.gacha_items_master (id, gacha_id, item_type, item_id, rarity, weight, is_pickup)
SELECT 'CHAR_NORMAL:' || character_id, 'CHAR_NORMAL', 'CHARACTER', character_id, rarity,
       CASE rarity WHEN 'N' THEN 50 WHEN 'R' THEN 20 ELSE 5 END,
       false
FROM public.character_release_master
WHERE is_enabled AND rarity IN ('N', 'R', 'SR');

INSERT INTO public.gacha_items_master (id, gacha_id, item_type, item_id, rarity, weight, is_pickup)
SELECT 'CHAR_SPECIAL:' || character_id, 'CHAR_SPECIAL', 'CHARACTER', character_id, rarity,
       CASE rarity WHEN 'R' THEN 60 WHEN 'SR' THEN 35 ELSE 10 END,
       false
FROM public.character_release_master
WHERE is_enabled AND rarity IN ('R', 'SR', 'SSR');
