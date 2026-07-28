-- ====================================================
-- マイグレーション: ログインボーナスシステムの実装
-- ====================================================

-- 1. ログインボーナスマスタテーブル
CREATE TABLE IF NOT EXISTS login_bonus_master (
    day_number INT PRIMARY KEY,
    item_id TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    item_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. ユーザーログインボーナス進捗テーブル
CREATE TABLE IF NOT EXISTS user_login_bonuses (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_step INT NOT NULL DEFAULT 0,
    total_logins INT NOT NULL DEFAULT 0,
    last_claimed_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS (Row Level Security) の設定
ALTER TABLE login_bonus_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_bonuses ENABLE ROW LEVEL SECURITY;

-- 誰でもマスタを参照可能
DROP POLICY IF EXISTS "Allow public read access on login_bonus_master" ON login_bonus_master;
CREATE POLICY "Allow public read access on login_bonus_master" ON login_bonus_master
    FOR SELECT USING (true);

-- ユーザーは自分の進捗のみ参照可能
DROP POLICY IF EXISTS "Allow user to read own user_login_bonuses" ON user_login_bonuses;
CREATE POLICY "Allow user to read own user_login_bonuses" ON user_login_bonuses
    FOR SELECT USING (auth.uid() = user_id);

-- 3. 30日分マスタ初期データの投入
INSERT INTO login_bonus_master (day_number, item_id, quantity, is_featured, item_name) VALUES
(1, 'CASH', 5000, false, 'キャッシュ 5,000'),
(2, 'DIAMOND', 50, false, 'ダイヤ 50個'),
(3, 'ITEM_STAMINA_01', 2, false, 'スタミナドリンク 2個'),
(4, 'CASH', 10000, false, 'キャッシュ 10,000'),
(5, 'GACHA_TICKET', 1, true, 'ガチャチケット 1枚'),
(6, 'DIAMOND', 100, false, 'ダイヤ 100個'),
(7, 'ITEM_EXP_DRINK', 3, false, '強化ドリンク 3個'),
(8, 'CASH', 15000, false, 'キャッシュ 15,000'),
(9, 'DIAMOND', 100, false, 'ダイヤ 100個'),
(10, 'GACHA_TICKET', 2, true, 'ガチャチケット 2枚'),
(11, 'CASH', 20000, false, 'キャッシュ 20,000'),
(12, 'ITEM_STAMINA_01', 3, false, 'スタミナドリンク 3個'),
(13, 'DIAMOND', 150, false, 'ダイヤ 150個'),
(14, 'CASH', 25000, false, 'キャッシュ 25,000'),
(15, 'GACHA_TICKET', 3, true, 'ガチャチケット 3枚'),
(16, 'ITEM_EXP_DRINK', 5, false, '強化ドリンク 5個'),
(17, 'CASH', 30000, false, 'キャッシュ 30,000'),
(18, 'DIAMOND', 200, false, 'ダイヤ 200個'),
(19, 'ITEM_STAMINA_01', 5, false, 'スタミナドリンク 5個'),
(20, 'GACHA_TICKET', 5, true, 'ガチャチケット 5枚'),
(21, 'CASH', 40000, false, 'キャッシュ 40,000'),
(22, 'DIAMOND', 250, false, 'ダイヤ 250個'),
(23, 'ITEM_EXP_DRINK', 10, false, '強化ドリンク 10個'),
(24, 'CASH', 50000, false, 'キャッシュ 50,000'),
(25, 'GACHA_TICKET', 5, true, 'ガチャチケット 5枚'),
(26, 'DIAMOND', 300, false, 'ダイヤ 300個'),
(27, 'CASH', 60000, false, 'キャッシュ 60,000'),
(28, 'ITEM_STAMINA_01', 10, false, 'スタミナドリンク 10個'),
(29, 'DIAMOND', 500, false, 'ダイヤ 500個'),
(30, 'GACHA_TICKET', 10, true, 'プレミアムガチャチケット 10枚')
ON CONFLICT (day_number) DO UPDATE SET
    item_id = EXCLUDED.item_id,
    quantity = EXCLUDED.quantity,
    is_featured = EXCLUDED.is_featured,
    item_name = EXCLUDED.item_name;

-- 4. ログインボーナス判定・処理 RPC (チート防止・アトミック実行)
CREATE OR REPLACE FUNCTION process_login_bonus()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_today DATE;
    v_last_date DATE;
    v_current_step INT := 0;
    v_total_logins INT := 0;
    v_next_step INT;
    v_master RECORD;
    v_result JSON;
BEGIN
    -- 1. ユーザー認証の確認
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. JST (日本時間) 本日日付の取得
    v_today := (NOW() AT TIME ZONE 'Asia/Tokyo')::date;

    -- 3. ユーザー進捗の照会
    SELECT last_claimed_date, current_step, total_logins
    INTO v_last_date, v_current_step, v_total_logins
    FROM user_login_bonuses
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO user_login_bonuses (user_id, current_step, total_logins, last_claimed_date)
        VALUES (v_user_id, 0, 0, '1970-01-01')
        RETURNING last_claimed_date, current_step, total_logins
        INTO v_last_date, v_current_step, v_total_logins;
    END IF;

    -- 4. 本日受取済みチェック
    IF v_last_date IS NOT NULL AND v_last_date >= v_today THEN
        SELECT json_build_object(
            'claimed', false,
            'reason', 'ALREADY_CLAIMED',
            'current_step', v_current_step,
            'total_logins', v_total_logins,
            'last_claimed_date', v_last_date
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- 5. 次のステップ計算 (1〜30の周回ルーティン)
    v_next_step := (v_current_step % 30) + 1;

    -- 6. マスタ受取データの取得
    SELECT * INTO v_master
    FROM login_bonus_master
    WHERE day_number = v_next_step;

    IF v_master IS NULL THEN
        RAISE EXCEPTION 'Login bonus master day % not found', v_next_step;
    END IF;

    -- 7. プレゼントBOXへ自動挿入 (status: UNCLAIMED)
    INSERT INTO presents (
        user_id,
        item_id,
        quantity,
        message,
        status,
        sent_at,
        expire_at
    ) VALUES (
        v_user_id,
        v_master.item_id,
        v_master.quantity,
        'ログインボーナス (' || v_next_step || '日目)',
        'UNCLAIMED',
        NOW(),
        NOW() + INTERVAL '30 days'
    );

    -- 8. ユーザー受取状態の更新
    UPDATE user_login_bonuses
    SET current_step = v_next_step,
        total_logins = v_total_logins + 1,
        last_claimed_date = v_today,
        updated_at = NOW()
    WHERE user_id = v_user_id;

    -- 9. 成功レスポンス返却
    SELECT json_build_object(
        'claimed', true,
        'current_step', v_next_step,
        'total_logins', v_total_logins + 1,
        'last_claimed_date', v_today,
        'reward', json_build_object(
            'day_number', v_master.day_number,
            'item_id', v_master.item_id,
            'item_name', v_master.item_name,
            'quantity', v_master.quantity,
            'is_featured', v_master.is_featured
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
