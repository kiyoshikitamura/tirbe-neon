-- ====================================================================
-- TRIBE: NEON REIGN - Gacha V2 Migration
-- 毎日無料ガチャ (Normal) & 常設スペシャルガチャ (Special) & 天井200回
-- ====================================================================

-- --------------------------------------------------------------------
-- 0. 基本ユーザーテーブルの作成 (未作成環境への完全スタンドアロン対応)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    cash BIGINT NOT NULL DEFAULT 1000,
    neon_diamonds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 1. ガチャ基盤テーブルの作成 (未作成の場合は作成)
-- --------------------------------------------------------------------

-- A. ガチャプランマスターテーブル
CREATE TABLE IF NOT EXISTS gacha_masters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gacha_type TEXT NOT NULL CHECK (gacha_type IN ('CHARACTER', 'SKILL', 'EQUIPMENT')),
    cost_cash INT NOT NULL DEFAULT 0,
    cost_diamond INT NOT NULL DEFAULT 0,
    cost_pay_diamond INT NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. ガチャ排出アイテムマスターテーブル
CREATE TABLE IF NOT EXISTS gacha_items_master (
    id SERIAL PRIMARY KEY,
    gacha_id TEXT REFERENCES gacha_masters(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,
    weight INT NOT NULL DEFAULT 100,
    is_pickup BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. ユーザー毎日無料ガチャ利用履歴テーブル
CREATE TABLE IF NOT EXISTS user_daily_gacha_claims (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    gacha_type TEXT NOT NULL CHECK (gacha_type IN ('CHARACTER', 'SKILL', 'EQUIPMENT')),
    last_claimed_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, gacha_type)
);

-- RLSポリシーの設定
ALTER TABLE user_daily_gacha_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own daily gacha claims" ON user_daily_gacha_claims;
CREATE POLICY "Users can manage their own daily gacha claims"
    ON user_daily_gacha_claims FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- D. ガチャ天井マスタ
CREATE TABLE IF NOT EXISTS gacha_pity_masters (
    id TEXT PRIMARY KEY,
    gacha_id TEXT NOT NULL,
    pity_threshold INT NOT NULL DEFAULT 200,
    currency_name TEXT NOT NULL DEFAULT 'ガチャPt',
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 years'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. ガチャ天井交換所マスタ
CREATE TABLE IF NOT EXISTS gacha_exchange_items_master (
    id TEXT PRIMARY KEY,
    pity_master_id TEXT NOT NULL REFERENCES gacha_pity_masters(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    required_points INT NOT NULL DEFAULT 200,
    limit_per_user INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. ユーザーガチャ天井Pt所持テーブル
CREATE TABLE IF NOT EXISTS user_gacha_pity_points (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pity_master_id TEXT NOT NULL REFERENCES gacha_pity_masters(id) ON DELETE CASCADE,
    current_points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, pity_master_id)
);

-- RLSポリシーの設定
ALTER TABLE user_gacha_pity_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own pity points" ON user_gacha_pity_points;
CREATE POLICY "Users can manage their own pity points"
    ON user_gacha_pity_points FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- 2. ガチャプランマスターの更新/登録
-- --------------------------------------------------------------------
INSERT INTO gacha_masters (id, name, gacha_type, cost_cash, cost_diamond, cost_pay_diamond, description)
VALUES
    -- ノーマルガチャ (単発 1000 cash / 100 dia, 10連 10000 cash / 1000 dia)
    ('CHAR_NORMAL', 'ノーマルスカウト', 'CHARACTER', 1000, 100, 0, '毎日10連無料。N 50%, R 40%, SR 10%で出現。'),
    ('SKILL_NORMAL', 'ノーマルスキルガチャ', 'SKILL', 1000, 100, 0, '毎日10連無料。N 50%, R 40%, SR 10%で出現。'),
    ('EQUIP_NORMAL', 'ノーマル装備ガチャ', 'EQUIPMENT', 1000, 100, 0, '毎日10連無料。N 50%, R 40%, SR 10%で出現。'),

    -- スペシャルガチャ (単発 3000 cash / 300 dia, 10連 30000 cash / 3000 dia)
    ('CHAR_SPECIAL', 'スペシャルスカウト', 'CHARACTER', 3000, 300, 0, 'R以上確定。R 60%, SR 35%, SSR 5%で出現。200Ptで任意SSRと交換。'),
    ('SKILL_SPECIAL', 'スペシャルスキルガチャ', 'SKILL', 3000, 300, 0, 'R以上確定。R 60%, SR 35%, SSR 5%で出現。200Ptで任意SSRと交換。'),
    ('EQUIP_SPECIAL', 'スペシャル装備ガチャ', 'EQUIPMENT', 3000, 300, 0, 'R以上確定。R 60%, SR 35%, SSR 5%で出現。200Ptで任意SSRと交換。')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    gacha_type = EXCLUDED.gacha_type,
    cost_cash = EXCLUDED.cost_cash,
    cost_diamond = EXCLUDED.cost_diamond,
    cost_pay_diamond = EXCLUDED.cost_pay_diamond,
    description = EXCLUDED.description;

-- 古い不要なチュートリアルガチャ等のレコードを整理
DELETE FROM gacha_masters WHERE id IN ('CHAR_TUTORIAL', 'CHAR_EX', 'SKILL_EX', 'EQUIP_EX');

-- --------------------------------------------------------------------
-- 3. 天井マスタ設定 (スペシャルガチャ共通 200Pt)
-- --------------------------------------------------------------------
INSERT INTO gacha_pity_masters (id, gacha_id, pity_threshold, currency_name)
VALUES
    ('pity_special_common', 'CHAR_SPECIAL', 200, 'スペシャルガチャPt')
ON CONFLICT (id) DO UPDATE SET
    pity_threshold = EXCLUDED.pity_threshold;

-- 天井交換所マスタのシード (全SSRキャラクター)
INSERT INTO gacha_exchange_items_master (id, pity_master_id, reward_type, reward_id, required_points, limit_per_user)
VALUES
    ('pity_c_reiji', 'pity_special_common', 'CHARACTER', '11111111-1111-1111-1111-111111111111', 200, 0),
    ('pity_c_rui',   'pity_special_common', 'CHARACTER', '33333333-3333-3333-3333-333333333333', 200, 0),
    ('pity_c_chang', 'pity_special_common', 'CHARACTER', '22222222-2222-2222-2222-222222222222', 200, 0),
    ('pity_c_leon',  'pity_special_common', 'CHARACTER', '44444444-4444-4444-4444-444444444444', 200, 0),
    ('pity_c_yuki',  'pity_special_common', 'CHARACTER', '55555555-5555-5555-5555-555555555555', 200, 0),
    ('pity_c_kaito', 'pity_special_common', 'CHARACTER', '66666666-6666-6666-6666-666666666666', 200, 0)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------
-- 4. ガチャ排出アイテム（中身）のインサート
-- --------------------------------------------------------------------
DELETE FROM gacha_items_master WHERE gacha_id IN ('CHAR_NORMAL', 'SKILL_NORMAL', 'EQUIP_NORMAL', 'CHAR_SPECIAL', 'SKILL_SPECIAL', 'EQUIP_SPECIAL');

-- A. ノーマル構成員ガチャ (N 50%, R 40%, SR 10%)
INSERT INTO gacha_items_master (gacha_id, item_id, weight, is_pickup) VALUES
    ('CHAR_NORMAL', 'a0000000-0000-0000-0000-000000000013', 500, FALSE),
    ('CHAR_NORMAL', 'a0000000-0000-0000-0000-000000000011', 200, FALSE),
    ('CHAR_NORMAL', 'a0000000-0000-0000-0000-000000000012', 200, FALSE),
    ('CHAR_NORMAL', '77777777-7777-7777-7777-777777777777', 33, FALSE),
    ('CHAR_NORMAL', '99999999-9999-9999-9999-999999999999', 33, FALSE),
    ('CHAR_NORMAL', 'a0000000-0000-0000-0000-000000000009', 34, FALSE);

-- B. スペシャル構成員ガチャ (R 60%, SR 35%, SSR 5%)
INSERT INTO gacha_items_master (gacha_id, item_id, weight, is_pickup) VALUES
    ('CHAR_SPECIAL', 'a0000000-0000-0000-0000-000000000011', 300, FALSE),
    ('CHAR_SPECIAL', 'a0000000-0000-0000-0000-000000000012', 300, FALSE),
    ('CHAR_SPECIAL', '77777777-7777-7777-7777-777777777777', 116, FALSE),
    ('CHAR_SPECIAL', '99999999-9999-9999-9999-999999999999', 116, FALSE),
    ('CHAR_SPECIAL', 'a0000000-0000-0000-0000-000000000009', 118, FALSE),
    ('CHAR_SPECIAL', '11111111-1111-1111-1111-111111111111', 9, FALSE),
    ('CHAR_SPECIAL', '33333333-3333-3333-3333-333333333333', 9, FALSE),
    ('CHAR_SPECIAL', '22222222-2222-2222-2222-222222222222', 8, FALSE),
    ('CHAR_SPECIAL', '44444444-4444-4444-4444-444444444444', 8, FALSE),
    ('CHAR_SPECIAL', '55555555-5555-5555-5555-555555555555', 8, FALSE),
    ('CHAR_SPECIAL', '66666666-6666-6666-6666-666666666666', 8, FALSE);
