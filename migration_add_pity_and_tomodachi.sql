-- ===================================================================
-- Migration: Add Gacha Pity System and Tomodachi & Support System Tables
-- ===================================================================

-- 1. ガチャ天井マスタ
CREATE TABLE IF NOT EXISTS gacha_pity_masters (
    id TEXT PRIMARY KEY,                       -- 例: 'pity_gacha_standard_01'
    gacha_id TEXT NOT NULL,                    -- 対象ガチャID
    pity_threshold INT NOT NULL DEFAULT 200,   -- 天井確定に必要な回数/Pt
    currency_name TEXT NOT NULL DEFAULT 'ガチャPt',
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ガチャ天井交換所マスタ
CREATE TABLE IF NOT EXISTS gacha_exchange_items_master (
    id TEXT PRIMARY KEY,                       -- 例: 'ex_c_lisa_01'
    pity_master_id TEXT NOT NULL REFERENCES gacha_pity_masters(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL,                -- 'CHARACTER', 'EQUIPMENT', 'SKILL'
    reward_id TEXT NOT NULL,                  -- 付与するキャラ/装備/スキルID
    required_points INT NOT NULL DEFAULT 200, -- 必要Pt
    limit_per_user INT DEFAULT 1,             -- 交換可能回数 (0は無制限)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ユーザーガチャ天井Pt所持テーブル
CREATE TABLE IF NOT EXISTS user_gacha_pity_points (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pity_master_id TEXT NOT NULL REFERENCES gacha_pity_masters(id) ON DELETE CASCADE,
    current_points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, pity_master_id)
);

-- 4. 友達関係テーブル (Tomodachi system)
CREATE TABLE IF NOT EXISTS user_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',    -- 'PENDING'(申請中), 'ACCEPTED'(友達), 'BLOCKED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_user_id)
);

-- 5. 助っ人設定テーブル (ユーザーが友達に貸し出す1体)
CREATE TABLE IF NOT EXISTS user_support_characters (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    support_character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_user_friends_user_id ON user_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id ON user_friends(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_status ON user_friends(status);
