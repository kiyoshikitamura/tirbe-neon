-- =================================================================
-- TRIBE: NEON REIGN - Master Data Seed Script
-- Migration: 20260731000002_seed_master_data.sql
-- =================================================================

-- 1. Character Growth Patterns
INSERT INTO public.character_growth_patterns (pattern_id, name, hp_gain, atk_gain, def_gain, spd_gain, luk_gain, base_hp, base_atk, base_def, base_spd, base_luk) VALUES
('BALANCED', 'バランス型', 15.0, 2.5, 2.0, 0.5, 0.2, 120, 15, 12, 10, 5),
('ATTACKER', '攻撃特化型', 12.0, 3.8, 1.2, 0.8, 0.3, 100, 22, 8, 12, 6),
('DEFENDER', '防御特化型', 22.0, 1.5, 3.5, 0.3, 0.1, 150, 10, 20, 8, 4),
('SPEEDSTER', '速度特化型', 10.0, 2.2, 1.5, 1.8, 0.4, 90, 14, 10, 18, 8),
('LUCKY_STAR', '幸運・技術型', 13.0, 2.0, 1.8, 1.0, 1.5, 110, 13, 11, 12, 15)
ON CONFLICT (pattern_id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Character Awakening Master
INSERT INTO public.character_awakening_master (awakening_level, hp_bonus, atk_bonus, def_bonus, spd_bonus, luk_bonus, required_cash) VALUES
(1, 100, 10, 10, 2, 2, 5000),
(2, 250, 25, 25, 5, 5, 15000),
(3, 500, 50, 50, 10, 10, 35000),
(4, 850, 85, 85, 15, 15, 75000),
(5, 1300, 130, 130, 25, 25, 150000)
ON CONFLICT (awakening_level) DO UPDATE SET required_cash = EXCLUDED.required_cash;

-- 3. User Level Master
INSERT INTO public.user_level_master (level, next_xp) VALUES
(1, 100), (2, 200), (3, 350), (4, 550), (5, 800), (6, 1150), (7, 1600), (8, 2200), (9, 2900), (10, 3700)
ON CONFLICT (level) DO UPDATE SET next_xp = EXCLUDED.next_xp;

-- 4. Quest Towns
INSERT INTO public.quest_towns (id, name, desc_text, bg_image) VALUES
('shinjuku', '新宿', '歌舞伎町のネオン街。アウトローたちの最大拠点。', '/bg/bg_street_shinjuku.png'),
('shibuya', '渋谷', 'スクランブル交差点と若者カルチャーの裏に蠢く派閥。', '/bg/bg_street_shibuya.png'),
('ikebukuro', '池袋', '冷徹な組組織が暗躍する闇取引の街。', '/bg/bg_street_ikebukuro.png'),
('roppongi', '六本木', 'ハイエンドなクラブと外資系シンジケートの領域。', '/bg/bg_street_roppongi.png'),
('akihabara', '秋葉原', '電脳と密輸ギアが飛び交う電気街の裏社会。', '/bg/bg_street_akihabara.png'),
('kawasaki', '川崎', '臨海工業地帯を根城にする爆走グループの縄張り。', '/bg/bg_street_kawasaki.png'),
('yokohama', '横浜', '港町のアジトをベースにする国際 smuggling 組織。', '/bg/bg_street_yokohama.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. Quests
INSERT INTO public.quests (id, town_id, level_type, name, duration_seconds, cost_vitality, cash_reward, exp_reward) VALUES
('q_shinjuku_1', 'shinjuku', 'EASY', '歌舞伎町 夜間見回り', 60, 5, 200, 30),
('q_shinjuku_2', 'shinjuku', 'NORMAL', '闇取引ルートの警護', 180, 10, 500, 80),
('q_shinjuku_3', 'shinjuku', 'HARD', '敵対組織アジト強襲', 300, 15, 1200, 180),
('q_shibuya_1', 'shibuya', 'EASY', 'センター街 情報収集', 60, 5, 220, 35),
('q_shibuya_2', 'shibuya', 'NORMAL', '違法クラブのみかじめ回収', 180, 10, 550, 90),
('q_shibuya_3', 'shibuya', 'HARD', 'スカウト狩り撃退戦', 300, 15, 1300, 200),
('q_ikebukuro_1', 'ikebukuro', 'EASY', '西口公園 の警戒', 60, 5, 210, 32),
('q_ikebukuro_2', 'ikebukuro', 'NORMAL', '闇金融の取り立て補助', 180, 10, 520, 85),
('q_ikebukuro_3', 'ikebukuro', 'HARD', '中華街ルートの奪還', 300, 15, 1250, 190),
('q_roppongi_1', 'roppongi', 'EASY', 'VIPクラブのボディーガード', 60, 5, 250, 40),
('q_roppongi_2', 'roppongi', 'NORMAL', '外資シンジケートとの取引警護', 180, 10, 600, 100),
('q_roppongi_3', 'roppongi', 'HARD', 'ヒルズ裏ルート制圧', 300, 15, 1500, 220),
('q_akihabara_1', 'akihabara', 'EASY', 'ジャンク街の密売ルート確認', 60, 5, 230, 38),
('q_akihabara_2', 'akihabara', 'NORMAL', '不正パーツルートの解体', 180, 10, 580, 95),
('q_akihabara_3', 'akihabara', 'HARD', 'ハッカー集団のアジト摘発', 300, 15, 1400, 210),
('q_kawasaki_1', 'kawasaki', 'EASY', '工場地帯の夜間哨戒', 60, 5, 200, 30),
('q_kawasaki_2', 'kawasaki', 'NORMAL', '湾岸ルートの密輸防衛', 180, 10, 510, 80),
('q_kawasaki_3', 'kawasaki', 'HARD', '暴走グループ総長とのタイマン', 300, 15, 1200, 180),
('q_yokohama_1', 'yokohama', 'EASY', '元町通り の見張り', 60, 5, 240, 38),
('q_yokohama_2', 'yokohama', 'NORMAL', 'コンテナ埠頭の荷揚げ警戒', 180, 10, 590, 98),
('q_yokohama_3', 'yokohama', 'HARD', '国際マフィア船上防衛', 300, 15, 1450, 215)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 6. Login Bonus Master
INSERT INTO public.login_bonus_master (day_number, item_id, quantity, item_name) VALUES
(1, 'CASH', 5000, '5,000 Cash'),
(2, 'CHAR_EXP_S', 5, 'キャラ強化素材(S) x5'),
(3, 'DIAMOND', 50, 'ダイヤ x50'),
(4, 'ENERGY_DRINK', 2, 'エナジードリンク x2'),
(5, 'EQUIP_EXP_S', 5, '装備強化素材(S) x5'),
(6, 'VIP_PASS', 3, 'PvP VIPパス x3'),
(7, 'DIAMOND', 150, 'ダイヤ x150')
ON CONFLICT (day_number) DO UPDATE SET item_name = EXCLUDED.item_name;

-- 7. Guild Level Master
INSERT INTO public.guild_level_master (level, next_xp, max_members, member_buff_atk, member_buff_hp) VALUES
(1, 1000, 15, 0.0, 0.0),
(2, 3000, 17, 2.0, 2.0),
(3, 7000, 20, 4.0, 4.0),
(4, 15000, 22, 6.0, 6.0),
(5, 30000, 25, 10.0, 10.0)
ON CONFLICT (level) DO UPDATE SET next_xp = EXCLUDED.next_xp;

-- 8. Guild Base Controls Initial Data
INSERT INTO public.guild_base_controls (base_id, daily_points, is_controlling, total_seasonal_days) VALUES
('neon_tower', 0, false, 0),
('deep_dock', 0, false, 0),
('junk_bazaar', 0, false, 0),
('kitakura_gate', 0, false, 0)
ON CONFLICT (base_id) DO NOTHING;

-- 9. GvG Season Status Initial Record
INSERT INTO public.gvg_season_status (id, current_day) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;
