-- ====================================================================
-- ガチャシステムマスタデータ定義テーブルの追加
-- ====================================================================

-- 1. ガチャプランマスターテーブル
CREATE TABLE IF NOT EXISTS gacha_masters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gacha_type TEXT NOT NULL CHECK (gacha_type IN ('CHARACTER', 'SKILL', 'EQUIPMENT')),
    cost_cash INT NOT NULL DEFAULT 0,
    cost_diamond INT NOT NULL DEFAULT 0,
    cost_pay_diamond INT NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. ガチャ排出アイテム（中身）マスターテーブル
CREATE TABLE IF NOT EXISTS gacha_items_master (
    id SERIAL PRIMARY KEY,
    gacha_id TEXT REFERENCES gacha_masters(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,              -- キャラクターID (UUID) または スキルID/装備ID
    weight INT NOT NULL DEFAULT 100,    -- 抽選ウェイト (確率比率)
    is_pickup BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ====================================================================
-- 初期マスタデータ (シード) の挿入
-- ====================================================================

-- A. ガチャプランのシード
INSERT INTO gacha_masters (id, name, gacha_type, cost_cash, cost_diamond, cost_pay_diamond, description)
VALUES
    ('CHAR_TUTORIAL', 'チュートリアル100連無料ガチャ', 'CHARACTER', 0, 0, 0, '新規登録者限定。無料で100連引ける特別な構成員スカウト。'),
    ('CHAR_NORMAL', '定常構成員ガチャ', 'CHARACTER', 50000, 100, 0, 'キャッシュまたはダイヤで引ける常設の構成員スカウト。'),
    ('CHAR_EX', '有償限定構成員ガチャ', 'CHARACTER', 0, 0, 100, '有償ダイヤ限定。10連でおまけとして「抗争の掟 x1」を獲得。'),
    ('CHAR_LIMIT', '【期間限定】ピックアップ構成員ガチャ', 'CHARACTER', 0, 120, 0, '期間限定。情報屋ルイの出現率がアップしている特別な構成員スカウト。')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    gacha_type = EXCLUDED.gacha_type,
    cost_cash = EXCLUDED.cost_cash,
    cost_diamond = EXCLUDED.cost_diamond,
    cost_pay_diamond = EXCLUDED.cost_pay_diamond,
    description = EXCLUDED.description;

-- B. ガチャ中身（排出キャラクター）のシード
-- 全てのキャラクターIDを各ガチャに登録する。
-- キャラクターID一覧 (game_constants.ts より):
-- レイジ: 11111111-1111-1111-1111-111111111111
-- ルイ: 33333333-3333-3333-3333-333333333333 (期間限定でピックアップ)
-- チャン: 22222222-2222-2222-2222-222222222222
-- レオン: 44444444-4444-4444-4444-444444444444
-- ユウキ: 55555555-5555-5555-5555-555555555555
-- カイト: 66666666-6666-6666-6666-666666666666
-- コハル: 77777777-7777-7777-7777-777777777777
-- サクラ: 99999999-9999-9999-9999-999999999999

-- 重複エラー回避のため、一度クリアしてからインサートします。
DELETE FROM gacha_items_master WHERE gacha_id IN ('CHAR_TUTORIAL', 'CHAR_NORMAL', 'CHAR_EX', 'CHAR_LIMIT');

-- 1. チュートリアルガチャ (全キャラ均等ウェイト 100)
INSERT INTO gacha_items_master (gacha_id, item_id, weight, is_pickup) VALUES
    ('CHAR_TUTORIAL', '11111111-1111-1111-1111-111111111111', 100, FALSE),
    ('CHAR_TUTORIAL', '33333333-3333-3333-3333-333333333333', 100, FALSE),
    ('CHAR_TUTORIAL', '22222222-2222-2222-2222-222222222222', 100, FALSE),
    ('CHAR_TUTORIAL', '44444444-4444-4444-4444-444444444444', 100, FALSE),
    ('CHAR_TUTORIAL', '55555555-5555-5555-5555-555555555555', 100, FALSE),
    ('CHAR_TUTORIAL', '66666666-6666-6666-6666-666666666666', 100, FALSE),
    ('CHAR_TUTORIAL', '77777777-7777-7777-7777-777777777777', 100, FALSE),
    ('CHAR_TUTORIAL', '99999999-9999-9999-9999-999999999999', 100, FALSE);

-- 2. 定常構成員ガチャ (全キャラ均等ウェイト 100)
INSERT INTO gacha_items_master (gacha_id, item_id, weight, is_pickup) VALUES
    ('CHAR_NORMAL', '11111111-1111-1111-1111-111111111111', 100, FALSE),
    ('CHAR_NORMAL', '33333333-3333-3333-3333-333333333333', 100, FALSE),
    ('CHAR_NORMAL', '22222222-2222-2222-2222-222222222222', 100, FALSE),
    ('CHAR_NORMAL', '44444444-4444-4444-4444-444444444444', 100, FALSE),
    ('CHAR_NORMAL', '55555555-5555-5555-5555-555555555555', 100, FALSE),
    ('CHAR_NORMAL', '66666666-6666-6666-6666-666666666666', 100, FALSE),
    ('CHAR_NORMAL', '77777777-7777-7777-7777-777777777777', 100, FALSE),
    ('CHAR_NORMAL', '99999999-9999-9999-9999-999999999999', 100, FALSE);

-- 3. 有償限定構成員ガチャ (全キャラ均等ウェイト 100)
INSERT INTO gacha_items_master (gacha_id, item_id, weight, is_pickup) VALUES
    ('CHAR_EX', '11111111-1111-1111-1111-111111111111', 100, FALSE),
    ('CHAR_EX', '33333333-3333-3333-3333-333333333333', 100, FALSE),
    ('CHAR_EX', '22222222-2222-2222-2222-222222222222', 100, FALSE),
    ('CHAR_EX', '44444444-4444-4444-4444-444444444444', 100, FALSE),
    ('CHAR_EX', '55555555-5555-5555-5555-555555555555', 100, FALSE),
    ('CHAR_EX', '66666666-6666-6666-6666-666666666666', 100, FALSE),
    ('CHAR_EX', '77777777-7777-7777-7777-777777777777', 100, FALSE),
    ('CHAR_EX', '99999999-9999-9999-9999-999999999999', 100, FALSE);

-- 4. ピックアップ構成員ガチャ (ルイのウェイトを300(約3倍)にし、ピックアップフラグをTRUEに)
INSERT INTO gacha_items_master (gacha_id, item_id, weight, is_pickup) VALUES
    ('CHAR_LIMIT', '33333333-3333-3333-3333-333333333333', 300, TRUE), -- ルイ (PU)
    ('CHAR_LIMIT', '11111111-1111-1111-1111-111111111111', 100, FALSE),
    ('CHAR_LIMIT', '22222222-2222-2222-2222-222222222222', 100, FALSE),
    ('CHAR_LIMIT', '44444444-4444-4444-4444-444444444444', 100, FALSE),
    ('CHAR_LIMIT', '55555555-5555-5555-5555-555555555555', 100, FALSE),
    ('CHAR_LIMIT', '66666666-6666-6666-6666-666666666666', 100, FALSE),
    ('CHAR_LIMIT', '77777777-7777-7777-7777-777777777777', 100, FALSE),
    ('CHAR_LIMIT', '99999999-9999-9999-9999-999999999999', 100, FALSE);
