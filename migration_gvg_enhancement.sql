-- ====================================================================
-- TRIBE: NEON REIGN - 抗争 (GvG) 機能拡張マイグレーション
-- ====================================================================

-- 1. bases テーブルへのアライメントカラム追加と初期値設定
ALTER TABLE bases ADD COLUMN IF NOT EXISTS alignment TEXT CHECK (alignment IN ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS'));

UPDATE bases SET alignment = 'ORDER' WHERE id = 'neon_tower';
UPDATE bases SET alignment = 'EVIL' WHERE id = 'deep_dock';
UPDATE bases SET alignment = 'CHAOS' WHERE id = 'junk_bazar';
UPDATE bases SET alignment = 'JUSTICE' WHERE id = 'kitakura_gate';

-- 2. guild_base_controls への支配フラグ追加
ALTER TABLE guild_base_controls ADD COLUMN IF NOT EXISTS is_controlling BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. GvG専用の守備デッキテーブル
CREATE TABLE IF NOT EXISTS gvg_defense_decks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
    character_1_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    character_2_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    character_3_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    character_4_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    character_5_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE gvg_defense_decks IS '抗争用の守備デッキ登録データ';

-- 4. 抗争マッチングテーブル
CREATE TABLE IF NOT EXISTS gvg_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_date DATE NOT NULL DEFAULT CURRENT_DATE,
    round INT NOT NULL CHECK (round BETWEEN 1 AND 3), -- 1=12:00, 2=20:00, 3=23:00
    guild_a_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
    guild_b_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
    guild_a_points INT NOT NULL DEFAULT 0,
    guild_b_points INT NOT NULL DEFAULT 0,
    winner_guild_id UUID REFERENCES guilds(id) ON DELETE SET NULL,
    is_finals BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'ONGOING' CHECK (status IN ('ONGOING', 'FINISHED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE gvg_matches IS '抗争各ラウンドのマッチング対戦データ';

-- 5. 個人抗争ポイントランキングテーブル
CREATE TABLE IF NOT EXISTS user_gvg_ranks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    season_points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE user_gvg_ranks IS '個人シーズン累計抗争ポイントデータ';

-- 6. 抗争報酬マスタテーブル
CREATE TABLE IF NOT EXISTS gvg_rewards_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_type TEXT NOT NULL CHECK (reward_type IN ('DAILY_CONTROL', 'SEASON_PERSONAL_RANK', 'SEASON_GUILD_FINALS')),
    threshold_val INT NOT NULL DEFAULT 0,
    reward_item_id TEXT NOT NULL,
    reward_quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE gvg_rewards_master IS '抗争報酬マスタデータ';

-- 7. 抗争シーズン進行状態テーブル
CREATE TABLE IF NOT EXISTS gvg_season_status (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    current_day INT NOT NULL DEFAULT 1 CHECK (current_day BETWEEN 1 AND 7),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE gvg_season_status IS '抗争シーズンの現在経過日数';

-- 初期状態の挿入 (シードデータ)
INSERT INTO gvg_season_status (id, current_day) VALUES (1, 1) ON CONFLICT DO NOTHING;

-- 報酬シードデータ
INSERT INTO gvg_rewards_master (reward_type, threshold_val, reward_item_id, reward_quantity) VALUES
-- デイリー支配報酬 (支配拠点1つあたり)
('DAILY_CONTROL', 1, 'DIAMOND', 50),
('DAILY_CONTROL', 1, 'CASH', 5000),
-- シーズン個人ランキング報酬 (最終順位順)
('SEASON_PERSONAL_RANK', 1, 'DIAMOND', 500),
('SEASON_PERSONAL_RANK', 2, 'DIAMOND', 300),
('SEASON_PERSONAL_RANK', 3, 'DIAMOND', 100), -- 3位以下・参加賞
-- シーズンギルド決戦報酬 (最終決戦順位順)
('SEASON_GUILD_FINALS', 1, 'DIAMOND', 1000), -- 覇者ギルドメンバー全員にダイヤ
('SEASON_GUILD_FINALS', 2, 'DIAMOND', 500),  -- 準覇者ギルドメンバー全員にダイヤ
('SEASON_GUILD_FINALS', 3, 'DIAMOND', 200)
ON CONFLICT DO NOTHING;
