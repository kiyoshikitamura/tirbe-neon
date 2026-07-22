-- ====================================================================
-- TRIBE: NEON REIGN - キャラクター成長・覚醒マスタ化、エネミーマスタ新設、60キャラ定義マイグレーション
-- ====================================================================

-- 1. ステータス成長パターンマスタの作成
CREATE TABLE IF NOT EXISTS character_growth_patterns (
    pattern_id TEXT PRIMARY KEY,
    base_hp INT NOT NULL DEFAULT 1500,
    base_atk INT NOT NULL DEFAULT 100,
    base_def INT NOT NULL DEFAULT 80,
    base_spd INT NOT NULL DEFAULT 100,
    base_luk INT NOT NULL DEFAULT 10,
    hp_gain INT NOT NULL DEFAULT 50,
    atk_gain INT NOT NULL DEFAULT 5,
    def_gain INT NOT NULL DEFAULT 4,
    spd_gain NUMERIC NOT NULL DEFAULT 0.2,
    luk_gain NUMERIC NOT NULL DEFAULT 0.1
);

-- 成長パターンデータのシードインサート
INSERT INTO character_growth_patterns (pattern_id, base_hp, base_atk, base_def, base_spd, base_luk, hp_gain, atk_gain, def_gain, spd_gain, luk_gain) VALUES
('BALANCED', 1500, 100, 80, 100, 10, 50, 5, 4, 0.2, 0.1),
('HP_TANK', 2000, 80, 100, 90, 8, 70, 4, 5, 0.15, 0.08),
('ATTACKER', 1200, 130, 60, 110, 12, 40, 7, 3, 0.25, 0.12),
('DEFENDER', 1600, 75, 110, 85, 10, 55, 3.5, 6, 0.1, 0.1),
('SPEEDSTER', 1100, 90, 70, 130, 15, 35, 4.5, 3.5, 0.4, 0.15),
('LUCKY_STAR', 1300, 85, 75, 105, 25, 45, 4, 4, 0.2, 0.3)
ON CONFLICT (pattern_id) DO UPDATE SET
    base_hp = EXCLUDED.base_hp, base_atk = EXCLUDED.base_atk, base_def = EXCLUDED.base_def,
    base_spd = EXCLUDED.base_spd, base_luk = EXCLUDED.base_luk, hp_gain = EXCLUDED.hp_gain,
    atk_gain = EXCLUDED.atk_gain, def_gain = EXCLUDED.def_gain, spd_gain = EXCLUDED.spd_gain,
    luk_gain = EXCLUDED.luk_gain;

-- 2. キャラクター覚醒マスタの作成
CREATE TABLE IF NOT EXISTS character_awakening_master (
    awakening_level INT PRIMARY KEY,
    required_cash INT NOT NULL,
    hp_bonus INT NOT NULL,
    atk_bonus INT NOT NULL,
    def_bonus INT NOT NULL,
    spd_bonus INT NOT NULL,
    luk_bonus INT NOT NULL
);

-- 覚醒マスタデータのシードインサート (レベル1〜5のステータス上昇累積値)
INSERT INTO character_awakening_master (awakening_level, required_cash, hp_bonus, atk_bonus, def_bonus, spd_bonus, luk_bonus) VALUES
(1, 3000, 200, 20, 15, 2, 1),
(2, 6000, 400, 40, 30, 4, 2),
(3, 9000, 600, 60, 45, 6, 3),
(4, 12000, 800, 80, 60, 8, 4),
(5, 15000, 1000, 100, 75, 10, 5)
ON CONFLICT (awakening_level) DO UPDATE SET
    required_cash = EXCLUDED.required_cash,
    hp_bonus = EXCLUDED.hp_bonus,
    atk_bonus = EXCLUDED.atk_bonus,
    def_bonus = EXCLUDED.def_bonus,
    spd_bonus = EXCLUDED.spd_bonus,
    luk_bonus = EXCLUDED.luk_bonus;

-- 3. エネミーマスタの作成
CREATE TABLE IF NOT EXISTS enemies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level INT NOT NULL DEFAULT 70,
    hp INT NOT NULL,
    atk INT NOT NULL,
    def INT NOT NULL,
    spd INT NOT NULL,
    luk INT NOT NULL,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    enemy_type TEXT NOT NULL CHECK (enemy_type IN ('PVP_DUMMY', 'GVG_NPC_DEFENSE'))
);

-- エネミーマスタデータのシードインサート
-- PvPダミーエネミー (5体)
INSERT INTO enemies (id, name, level, hp, atk, def, spd, luk, skills, enemy_type) VALUES
('pvp_dummy_0', 'リュウ', 70, 1200, 90, 80, 95, 10, '[{"id":"e_skill_0_1","name":"通常攻撃","ap_cost":1,"power":40,"effect_type":"ATTACK"},{"id":"e_skill_0_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'PVP_DUMMY'),
('pvp_dummy_1', 'カイ', 70, 1200, 90, 80, 97, 10, '[{"id":"e_skill_1_1","name":"通常攻撃","ap_cost":1,"power":40,"effect_type":"ATTACK"},{"id":"e_skill_1_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'PVP_DUMMY'),
('pvp_dummy_2', 'シン', 70, 1200, 90, 80, 99, 10, '[{"id":"e_skill_2_1","name":"通常攻撃","ap_cost":1,"power":40,"effect_type":"ATTACK"},{"id":"e_skill_2_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'PVP_DUMMY'),
('pvp_dummy_3', 'ハヤト', 70, 1200, 90, 80, 101, 10, '[{"id":"e_skill_3_1","name":"通常攻撃","ap_cost":1,"power":40,"effect_type":"ATTACK"},{"id":"e_skill_3_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'PVP_DUMMY'),
('pvp_dummy_4', 'ユキ', 70, 1200, 90, 80, 103, 10, '[{"id":"e_skill_4_1","name":"通常攻撃","ap_cost":1,"power":40,"effect_type":"ATTACK"},{"id":"e_skill_4_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'PVP_DUMMY')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, level = EXCLUDED.level, hp = EXCLUDED.hp, atk = EXCLUDED.atk,
    def = EXCLUDED.def, spd = EXCLUDED.spd, luk = EXCLUDED.luk, skills = EXCLUDED.skills, enemy_type = EXCLUDED.enemy_type;

-- GvG防衛NPCエネミー (5体、防衛チームとしてステータスを別個定義)
INSERT INTO enemies (id, name, level, hp, atk, def, spd, luk, skills, enemy_type) VALUES
('gvg_defense_0', 'レイジ', 70, 1400, 90, 80, 95, 10, '[{"id":"e_skill_0_1","name":"通常攻撃","ap_cost":1,"power":45,"effect_type":"ATTACK"},{"id":"e_skill_0_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'GVG_NPC_DEFENSE'),
('gvg_defense_1', 'ルイ', 70, 1400, 90, 80, 97, 10, '[{"id":"e_skill_1_1","name":"通常攻撃","ap_cost":1,"power":45,"effect_type":"ATTACK"},{"id":"e_skill_1_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'GVG_NPC_DEFENSE'),
('gvg_defense_2', 'チャン', 70, 1400, 90, 80, 99, 10, '[{"id":"e_skill_2_1","name":"通常攻撃","ap_cost":1,"power":45,"effect_type":"ATTACK"},{"id":"e_skill_2_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'GVG_NPC_DEFENSE'),
('gvg_defense_3', 'ユウキ', 70, 1400, 90, 80, 101, 10, '[{"id":"e_skill_3_1","name":"通常攻撃","ap_cost":1,"power":45,"effect_type":"ATTACK"},{"id":"e_skill_3_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'GVG_NPC_DEFENSE'),
('gvg_defense_4', 'レオン', 70, 1400, 90, 80, 103, 10, '[{"id":"e_skill_4_1","name":"通常攻撃","ap_cost":1,"power":45,"effect_type":"ATTACK"},{"id":"e_skill_4_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 'GVG_NPC_DEFENSE')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, level = EXCLUDED.level, hp = EXCLUDED.hp, atk = EXCLUDED.atk,
    def = EXCLUDED.def, spd = EXCLUDED.spd, luk = EXCLUDED.luk, skills = EXCLUDED.skills, enemy_type = EXCLUDED.enemy_type;

-- 4. characters テーブルへ growth_pattern_id カラム追加
ALTER TABLE characters ADD COLUMN IF NOT EXISTS growth_pattern_id TEXT REFERENCES character_growth_patterns(pattern_id) DEFAULT 'BALANCED';

-- 5. 既存8キャラの growth_pattern_id 更新および地元/通り名シード
-- 新宿
INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('11111111-1111-1111-1111-111111111111', 'reiji', '歌舞伎町の覇王', 'ORDER', 1500, 100, 80, 100, 10, 'shinjuku', 'BALANCED')
ON CONFLICT (id) DO UPDATE SET growth_pattern_id = 'BALANCED', home_town = 'shinjuku', alignment = 'ORDER';

-- 秋葉原
INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('33333333-3333-3333-3333-333333333333', 'rui', '電気街 of 女王', 'CHAOS', 1100, 90, 70, 130, 15, 'akihabara', 'SPEEDSTER')
ON CONFLICT (id) DO UPDATE SET growth_pattern_id = 'SPEEDSTER', home_town = 'akihabara', alignment = 'CHAOS';

-- 池袋
INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('22222222-2222-2222-2222-222222222222', 'chang', '冷徹な毒蛇', 'EVIL', 1300, 85, 75, 105, 25, 'ikebukuro', 'LUCKY_STAR')
ON CONFLICT (id) DO UPDATE SET growth_pattern_id = 'LUCKY_STAR', home_town = 'ikebukuro', alignment = 'EVIL';

-- 新宿
INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('44444444-4444-4444-4444-444444444444', 'leon', '牙', 'EVIL', 1200, 130, 60, 110, 12, 'shinjuku', 'ATTACKER')
ON CONFLICT (id) DO UPDATE SET growth_pattern_id = 'ATTACKER', home_town = 'shinjuku', alignment = 'EVIL';

INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('55555555-5555-5555-5555-555555555555', 'yuki', '漆黒 of 執行者', 'ORDER', 1600, 75, 110, 85, 10, 'shinjuku', 'DEFENDER')
ON CONFLICT (id) DO UPDATE SET growth_pattern_id = 'DEFENDER', home_town = 'shinjuku', alignment = 'ORDER';

-- 六本木
INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('66666666-6666-6666-6666-666666666666', 'kaito', '夜 of 支配者', 'CHAOS', 1500, 100, 80, 100, 10, 'roppongi', 'BALANCED')
ON CONFLICT (id) DO UPDATE SET growth_pattern_id = 'BALANCED', home_town = 'roppongi', alignment = 'CHAOS';

-- 川崎
INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('77777777-7777-7777-7777-777777777777', 'koharu', 'スピードスター', 'JUSTICE', 1100, 90, 70, 130, 15, 'kawasaki', 'SPEEDSTER')
ON CONFLICT (id) DO UPDATE SET growth_pattern_id = 'SPEEDSTER', home_town = 'kawasaki', alignment = 'JUSTICE';

-- 横浜
INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('99999999-9999-9999-9999-999999999999', 'sakura', '紅い暗殺者', 'EVIL', 1200, 130, 60, 110, 12, 'yokohama', 'ATTACKER')
ON CONFLICT (id) DO UPDATE SET growth_pattern_id = 'ATTACKER', home_town = 'yokohama', alignment = 'EVIL';


-- 6. 新規52キャラ（合計60キャラ以上）のシードインサート
-- UUID format: 'a0000000-0000-0000-0000-000000000XXX' (XXX: 009〜060)
INSERT INTO characters (id, name, nickname, alignment, base_hp, base_atk, base_def, base_spd, base_luk, home_town, growth_pattern_id) VALUES
('a0000000-0000-0000-0000-000000000009', 'member_009', '歌舞伎町のスカウト', 'JUSTICE', 1500, 100, 80, 100, 10, 'shinjuku', 'BALANCED'),
('a0000000-0000-0000-0000-000000000010', 'member_010', '渋谷のディーラー', 'EVIL', 2000, 80, 100, 90, 8, 'shibuya', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000011', 'member_011', '池袋のヒットマン', 'ORDER', 1200, 130, 60, 110, 12, 'ikebukuro', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000012', 'member_012', '六本木の用心棒', 'CHAOS', 1600, 75, 110, 85, 10, 'roppongi', 'DEFENDER'),
('a0000000-0000-0000-0000-000000000013', 'member_013', '秋葉原のハッカー', 'JUSTICE', 1100, 90, 70, 130, 15, 'akihabara', 'SPEEDSTER'),
('a0000000-0000-0000-0000-000000000014', 'member_014', '川崎の拳闘士', 'EVIL', 1300, 85, 75, 105, 25, 'kawasaki', 'LUCKY_STAR'),
('a0000000-0000-0000-0000-000000000015', 'member_015', '横浜の密輸人', 'ORDER', 1500, 100, 80, 100, 10, 'yokohama', 'BALANCED'),
('a0000000-0000-0000-0000-000000000016', 'member_016', '新宿の回収屋', 'CHAOS', 2000, 80, 100, 90, 8, 'shinjuku', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000017', 'member_017', '渋谷のスケーター', 'JUSTICE', 1200, 130, 60, 110, 12, 'shibuya', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000018', 'member_018', '池袋の用心棒', 'EVIL', 1600, 75, 110, 85, 10, 'ikebukuro', 'DEFENDER'),
('a0000000-0000-0000-0000-000000000019', 'member_019', '六本木のDJ', 'ORDER', 1100, 90, 70, 130, 15, 'roppongi', 'SPEEDSTER'),
('a0000000-0000-0000-0000-000000000020', 'member_020', '秋葉原のジャンク屋', 'CHAOS', 1300, 85, 75, 105, 25, 'akihabara', 'LUCKY_STAR'),
('a0000000-0000-0000-0000-000000000021', 'member_021', '川崎の切り込み隊長', 'JUSTICE', 1500, 100, 80, 100, 10, 'kawasaki', 'BALANCED'),
('a0000000-0000-0000-0000-000000000022', 'member_022', '横浜の銃使い', 'EVIL', 2000, 80, 100, 90, 8, 'yokohama', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000023', 'member_023', '新宿の金貸し', 'ORDER', 1200, 130, 60, 110, 12, 'shinjuku', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000024', 'member_024', '渋谷のダンサー', 'CHAOS', 1600, 75, 110, 85, 10, 'shibuya', 'DEFENDER'),
('a0000000-0000-0000-0000-000000000025', 'member_025', '池袋の裏ハッカー', 'JUSTICE', 1100, 90, 70, 130, 15, 'ikebukuro', 'SPEEDSTER'),
('a0000000-0000-0000-0000-000000000026', 'member_026', '六本木のホスト', 'EVIL', 1300, 85, 75, 105, 25, 'roppongi', 'LUCKY_STAR'),
('a0000000-0000-0000-0000-000000000027', 'member_027', '秋葉原のバイヤー', 'ORDER', 1500, 100, 80, 100, 10, 'akihabara', 'BALANCED'),
('a0000000-0000-0000-0000-000000000028', 'member_028', '川崎のラッパー', 'CHAOS', 2000, 80, 100, 90, 8, 'kawasaki', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000029', 'member_029', '横浜の拳銃使い', 'JUSTICE', 1200, 130, 60, 110, 12, 'yokohama', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000030', 'member_030', '新宿の運び屋', 'EVIL', 1600, 75, 110, 85, 10, 'shinjuku', 'DEFENDER'),
('a0000000-0000-0000-0000-000000000031', 'member_031', '渋谷のDJ', 'ORDER', 1100, 90, 70, 130, 15, 'shibuya', 'SPEEDSTER'),
('a0000000-0000-0000-0000-000000000032', 'member_032', '池袋の拳闘家', 'CHAOS', 1300, 85, 75, 105, 25, 'ikebukuro', 'LUCKY_STAR'),
('a0000000-0000-0000-0000-000000000033', 'member_033', '六本木の闇医者', 'JUSTICE', 1500, 100, 80, 100, 10, 'roppongi', 'BALANCED'),
('a0000000-0000-0000-0000-000000000034', 'member_034', '秋葉原のコレクター', 'EVIL', 2000, 80, 100, 90, 8, 'akihabara', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000035', 'member_035', '川崎の用心棒', 'ORDER', 1200, 130, 60, 110, 12, 'kawasaki', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000036', 'member_036', '横浜の刀使い', 'CHAOS', 1600, 75, 110, 85, 10, 'yokohama', 'DEFENDER'),
('a0000000-0000-0000-0000-000000000037', 'member_037', '新宿の刺青師', 'JUSTICE', 1100, 90, 70, 130, 15, 'shinjuku', 'SPEEDSTER'),
('a0000000-0000-0000-0000-000000000038', 'member_038', '渋谷のグラフィティアーティスト', 'EVIL', 1300, 85, 75, 105, 25, 'shibuya', 'LUCKY_STAR'),
('a0000000-0000-0000-0000-000000000039', 'member_039', '池袋の狂犬', 'ORDER', 1500, 100, 80, 100, 10, 'ikebukuro', 'BALANCED'),
('a0000000-0000-0000-0000-000000000040', 'member_040', '六本木のキャバ嬢', 'CHAOS', 2000, 80, 100, 90, 8, 'roppongi', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000041', 'member_041', '秋葉原のディーラー', 'JUSTICE', 1200, 130, 60, 110, 12, 'akihabara', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000042', 'member_042', '川崎の仕切屋', 'EVIL', 1600, 75, 110, 85, 10, 'kawasaki', 'DEFENDER'),
('a0000000-0000-0000-0000-000000000043', 'member_043', '横浜の香港マフィア', 'ORDER', 1100, 90, 70, 130, 15, 'yokohama', 'SPEEDSTER'),
('a0000000-0000-0000-0000-000000000044', 'member_044', '新宿の拳銃密売人', 'CHAOS', 1300, 85, 75, 105, 25, 'shinjuku', 'LUCKY_STAR'),
('a0000000-0000-0000-0000-000000000045', 'member_045', '渋谷のバーテンダー', 'JUSTICE', 1500, 100, 80, 100, 10, 'shibuya', 'BALANCED'),
('a0000000-0000-0000-0000-000000000046', 'member_046', '池袋のギャンブラー', 'EVIL', 2000, 80, 100, 90, 8, 'ikebukuro', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000047', 'member_047', '六本木のIT起業家', 'ORDER', 1200, 130, 60, 110, 12, 'roppongi', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000048', 'member_048', '秋葉原のアイドル', 'CHAOS', 1600, 75, 110, 85, 10, 'akihabara', 'DEFENDER'),
('a0000000-0000-0000-0000-000000000049', 'member_049', '川崎のメカニック', 'JUSTICE', 1100, 90, 70, 130, 15, 'kawasaki', 'SPEEDSTER'),
('a0000000-0000-0000-0000-000000000050', 'member_050', '横浜のボディーガード', 'EVIL', 1300, 85, 75, 105, 25, 'yokohama', 'LUCKY_STAR'),
('a0000000-0000-0000-0000-000000000051', 'member_051', '新宿のストリートギャング', 'ORDER', 1500, 100, 80, 100, 10, 'shinjuku', 'BALANCED'),
('a0000000-0000-0000-0000-000000000052', 'member_052', '渋谷のストリートレーサー', 'CHAOS', 2000, 80, 100, 90, 8, 'shibuya', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000053', 'member_053', '池袋のスカウトマン', 'JUSTICE', 1200, 130, 60, 110, 12, 'ikebukuro', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000054', 'member_054', '六本木のイベントオーガナイザー', 'EVIL', 1600, 75, 110, 85, 10, 'roppongi', 'DEFENDER'),
('a0000000-0000-0000-0000-000000000055', 'member_055', '秋葉原のコスプレイヤー', 'ORDER', 1100, 90, 70, 130, 15, 'akihabara', 'SPEEDSTER'),
('a0000000-0000-0000-0000-000000000056', 'member_056', '川崎のラッパー部下', 'CHAOS', 1300, 85, 75, 105, 25, 'kawasaki', 'LUCKY_STAR'),
('a0000000-0000-0000-0000-000000000057', 'member_057', '横浜の香港系用心棒', 'JUSTICE', 1500, 100, 80, 100, 10, 'yokohama', 'BALANCED'),
('a0000000-0000-0000-0000-000000000058', 'member_058', '新宿のヤクザ構成員', 'EVIL', 2000, 80, 100, 90, 8, 'shinjuku', 'HP_TANK'),
('a0000000-0000-0000-0000-000000000059', 'member_059', '渋谷のヒップホップMC', 'ORDER', 1200, 130, 60, 110, 12, 'shibuya', 'ATTACKER'),
('a0000000-0000-0000-0000-000000000060', 'member_060', '池袋のマフィア構成員', 'CHAOS', 1600, 75, 110, 85, 10, 'ikebukuro', 'DEFENDER')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, nickname = EXCLUDED.nickname, alignment = EXCLUDED.alignment,
    base_hp = EXCLUDED.base_hp, base_atk = EXCLUDED.base_atk, base_def = EXCLUDED.base_def,
    base_spd = EXCLUDED.base_spd, base_luk = EXCLUDED.base_luk, home_town = EXCLUDED.home_town,
    growth_pattern_id = EXCLUDED.growth_pattern_id;


-- 7. battle_sessions テーブルの battle_type チェック制約の変更
-- アリーナをPVPへ表記置換
ALTER TABLE battle_sessions DROP CONSTRAINT IF EXISTS battle_sessions_battle_type_check;
ALTER TABLE battle_sessions ADD CONSTRAINT battle_sessions_battle_type_check CHECK (battle_type IN ('QUEST', 'PVP', 'GVG', 'RAID'));
