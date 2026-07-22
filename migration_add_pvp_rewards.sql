-- ====================================================================
-- TRIBE: NEON REIGN - PvPシステム拡張マイグレーション (アリーナ報酬マスタ ＆ 作戦定義)
-- ====================================================================

-- 1. アリーナ（PvP）シーズン報酬マスタの作成
CREATE TABLE IF NOT EXISTS pvp_rewards_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    threshold_points INT NOT NULL UNIQUE,       -- 必要な最小レート（ランクポイント）
    reward_item_id TEXT NOT NULL DEFAULT 'DIAMOND', -- 報酬アイテムID ('DIAMOND', 'CASH'等)
    reward_quantity INT NOT NULL DEFAULT 0,       -- 報酬の配布個数
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- シーズン報酬マスタの初期シードデータ挿入
INSERT INTO pvp_rewards_master (threshold_points, reward_item_id, reward_quantity) VALUES
(2000, 'DIAMOND', 500),
(1800, 'DIAMOND', 300),
(1500, 'DIAMOND', 150),
(0, 'DIAMOND', 50)
ON CONFLICT (threshold_points) DO UPDATE SET
    reward_item_id = EXCLUDED.reward_item_id,
    reward_quantity = EXCLUDED.reward_quantity;

-- 2. pvp_defense_decks テーブルに作戦 (tactic) カラムを追加
ALTER TABLE pvp_defense_decks ADD COLUMN IF NOT EXISTS tactic TEXT NOT NULL DEFAULT 'OFFENSIVE';

COMMENT ON COLUMN pvp_defense_decks.tactic IS '防衛部隊の作戦設定 (OFFENSIVE/DEFENSIVE/HEALING/BALANCED/AP_CONSERVING/TACTICAL)';
