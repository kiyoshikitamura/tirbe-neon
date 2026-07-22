-- ====================================================================
-- TRIBE: NEON REIGN - ギルドシステム拡張マイグレーション
-- ====================================================================

-- 1. guilds テーブルの拡張
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS funds BIGINT NOT NULL DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS unlocked_decorations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS unlocked_banners JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS equipped_decoration TEXT DEFAULT NULL;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS equipped_banner TEXT DEFAULT NULL;

-- 2. guild_members テーブルの拡張
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS weekly_contribution INT NOT NULL DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS total_contribution INT NOT NULL DEFAULT 0;

-- 3. ギルドレベル必要経験値マスタ
CREATE TABLE IF NOT EXISTS guild_level_master (
    level INT PRIMARY KEY,
    next_xp INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. ギルド獲得XPアクションマスタ
CREATE TABLE IF NOT EXISTS guild_xp_action_master (
    action_type TEXT PRIMARY KEY,
    xp_gain INT NOT NULL,
    contribution_gain INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. マスタシードデータ投入

-- レベルアップ必要経験値 (最大Lv.30)
INSERT INTO guild_level_master (level, next_xp)
VALUES
    (1, 1000), (2, 2000), (3, 3000), (4, 4000), (5, 5000),
    (6, 6000), (7, 7000), (8, 8000), (9, 9000), (10, 10000),
    (11, 12000), (12, 14000), (13, 16000), (14, 18000), (15, 20000),
    (16, 22000), (17, 24000), (18, 26000), (19, 28000), (20, 30000),
    (21, 35000), (22, 40000), (23, 45000), (24, 50000), (25, 55000),
    (26, 60000), (27, 65000), (28, 70000), (29, 75000), (30, 80000)
ON CONFLICT (level) DO UPDATE SET next_xp = EXCLUDED.next_xp;

-- 各行動での獲得XP・貢献度
INSERT INTO guild_xp_action_master (action_type, xp_gain, contribution_gain)
VALUES
    ('QUEST', 30, 20),
    ('ARENA', 50, 30),
    ('GVG', 150, 100),
    ('DONATE_SMALL', 20, 10),
    ('DONATE_MEDIUM', 120, 60),
    ('DONATE_LARGE', 300, 150)
ON CONFLICT (action_type) DO UPDATE SET 
    xp_gain = EXCLUDED.xp_gain, 
    contribution_gain = EXCLUDED.contribution_gain;
