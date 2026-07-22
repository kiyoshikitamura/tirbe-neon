-- Migration: Add skill_limit_break_master and insert seed data
CREATE TABLE IF NOT EXISTS skill_limit_break_master (
    plus_val INT NOT NULL,                          -- 現在の限界突破段階 (+0〜+10)
    is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,    -- 専用スキルであるか
    required_cash INT NOT NULL DEFAULT 0,          -- 限界突破に必要なキャッシュ
    required_item_id TEXT,                          -- 必要な消費素材アイテムID (TRAINING_MANUAL / EXCLUSIVE_CONTRACT)
    required_item_qty INT NOT NULL DEFAULT 0,       -- 必要な消費素材の個数
    power_multiplier NUMERIC NOT NULL DEFAULT 1.0,  -- この段階での威力倍率補正
    PRIMARY KEY (plus_val, is_exclusive)
);

-- シードデータの投入 (通常スキル: 指南書を消費 / 専用スキル: 裏の契約書を消費)
-- 威力倍率は 1限界突破ごとに +20% (1.0 -> 1.2 -> ... -> 3.0)
INSERT INTO skill_limit_break_master (plus_val, is_exclusive, required_cash, required_item_id, required_item_qty, power_multiplier) VALUES
-- 通常スキル (+0〜+10)
(0, FALSE, 1200, 'TRAINING_MANUAL', 1, 1.0),
(1, FALSE, 2400, 'TRAINING_MANUAL', 1, 1.2),
(2, FALSE, 3600, 'TRAINING_MANUAL', 1, 1.4),
(3, FALSE, 4800, 'TRAINING_MANUAL', 2, 1.6),
(4, FALSE, 6000, 'TRAINING_MANUAL', 2, 1.8),
(5, FALSE, 7200, 'TRAINING_MANUAL', 2, 2.0),
(6, FALSE, 8400, 'TRAINING_MANUAL', 3, 2.2),
(7, FALSE, 9600, 'TRAINING_MANUAL', 3, 2.4),
(8, FALSE, 10800, 'TRAINING_MANUAL', 3, 2.6),
(9, FALSE, 12000, 'TRAINING_MANUAL', 5, 2.8),
(10, FALSE, 0, NULL, 0, 3.0),
-- 専用スキル (+0〜+10、裏の契約書を消費)
(0, TRUE, 2500, 'EXCLUSIVE_CONTRACT', 1, 1.0),
(1, TRUE, 5000, 'EXCLUSIVE_CONTRACT', 1, 1.2),
(2, TRUE, 7500, 'EXCLUSIVE_CONTRACT', 1, 1.4),
(3, TRUE, 10000, 'EXCLUSIVE_CONTRACT', 1, 1.6),
(4, TRUE, 12500, 'EXCLUSIVE_CONTRACT', 1, 1.8),
(5, TRUE, 15000, 'EXCLUSIVE_CONTRACT', 2, 2.0),
(6, TRUE, 17500, 'EXCLUSIVE_CONTRACT', 2, 2.2),
(7, TRUE, 20000, 'EXCLUSIVE_CONTRACT', 2, 2.4),
(8, TRUE, 22500, 'EXCLUSIVE_CONTRACT', 2, 2.6),
(9, TRUE, 25000, 'EXCLUSIVE_CONTRACT', 3, 2.8),
(10, TRUE, 0, NULL, 0, 3.0)
ON CONFLICT (plus_val, is_exclusive) DO NOTHING;
