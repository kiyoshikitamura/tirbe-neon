-- ====================================================================
-- TRIBE: NEON REIGN - ショップ機能・購入履歴・アトミック決済マイグレーション
-- ====================================================================

-- 1. ユーザーショップ購入履歴テーブル
CREATE TABLE IF NOT EXISTS user_shop_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    purchase_count INT NOT NULL DEFAULT 1,
    last_purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- RLSセキュリティポリシーの設定
ALTER TABLE user_shop_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_shop_purchases_select_policy" ON user_shop_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_shop_purchases_insert_policy" ON user_shop_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_shop_purchases_update_policy" ON user_shop_purchases
    FOR UPDATE USING (auth.uid() = user_id);


-- 2. 通常ショップ商品購入 RPC (キャッシュ or ダイヤ消費)
CREATE OR REPLACE FUNCTION buy_normal_shop_product(
    p_user_id UUID,
    p_product_id TEXT,
    p_currency_type TEXT, -- 'CASH' or 'DIAMOND'
    p_price INT,
    p_items JSONB,        -- 例: [{"item_id": "ENERGY_DRINK", "quantity": 10}]
    p_product_title TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_item JSONB;
    v_item_id TEXT;
    v_qty INT;
    v_expire_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- ユーザー存在確認
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'ユーザーが存在しません。';
    END IF;

    -- 通貨残高チェック ＆ 減算
    IF p_currency_type = 'CASH' THEN
        IF v_user.cash < p_price THEN
            RAISE EXCEPTION 'キャッシュが不足しています。';
        END IF;
        UPDATE users SET cash = cash - p_price WHERE id = p_user_id;
    ELSIF p_currency_type = 'DIAMOND' THEN
        IF v_user.neon_diamonds < p_price THEN
            RAISE EXCEPTION 'ダイヤが不足しています。';
        END IF;
        UPDATE users SET neon_diamonds = neon_diamonds - p_price WHERE id = p_user_id;
    ELSE
        RAISE EXCEPTION '無効な支払い通貨タイプです。';
    END IF;

    -- 有効期限 (30日後)
    v_expire_at := NOW() + INTERVAL '30 days';

    -- 配布アイテムをプレゼントBOX (presents) に追加
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := v_item->>'item_id';
        v_qty := (v_item->>'quantity')::INT;

        INSERT INTO presents (
            user_id,
            item_id,
            quantity,
            message,
            status,
            expire_at
        ) VALUES (
            p_user_id,
            v_item_id,
            v_qty,
            'ショップ購入: ' || p_product_title,
            'UNCLAIMED',
            v_expire_at
        );
    END LOOP;

    -- 購入履歴レコードを更新/インサート
    INSERT INTO user_shop_purchases (user_id, product_id, purchase_count, last_purchased_at)
    VALUES (p_user_id, p_product_id, 1, NOW())
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET 
        purchase_count = user_shop_purchases.purchase_count + 1,
        last_purchased_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'message', p_product_title || ' を購入しました！プレゼントBOXをご確認ください。'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Stripe決済/有償購入処理 RPC (アトミック検証・プレゼントBOX格納)
CREATE OR REPLACE FUNCTION process_stripe_shop_purchase(
    p_user_id UUID,
    p_stripe_session_id TEXT,
    p_product_id TEXT,
    p_amount_jpy INT,
    p_items JSONB,          -- 例: [{"item_id": "DIAMOND", "quantity": 300}, ...]
    p_product_title TEXT,
    p_is_beginner BOOLEAN DEFAULT FALSE,
    p_purchase_limit INT DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_exist_tx INT;
    v_purchase_count INT := 0;
    v_item JSONB;
    v_item_id TEXT;
    v_qty INT;
    v_expire_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- ユーザー存在確認
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'ユーザーが存在しません。';
    END IF;

    -- A. 決済トランザクションの重複（冪等性）チェック
    SELECT COUNT(*) INTO v_exist_tx 
    FROM payment_transactions 
    WHERE stripe_session_id = p_stripe_session_id;

    IF v_exist_tx > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'message', 'すでに処理済みのトランザクションです。'
        );
    END IF;

    -- B. 初心者限定商材 (24時間以内制限 & 1回限り) の検証
    IF p_is_beginner THEN
        IF v_user.created_at < (NOW() - INTERVAL '24 hours') THEN
            RAISE EXCEPTION '初心者限定商品の購入可能期間（24時間）が終了しています。';
        END IF;

        SELECT COALESCE(purchase_count, 0) INTO v_purchase_count 
        FROM user_shop_purchases 
        WHERE user_id = p_user_id AND product_id = p_product_id;

        IF v_purchase_count >= 1 THEN
            RAISE EXCEPTION '初心者限定商品は1回のみ購入可能です。';
        END IF;
    END IF;

    -- C. 限定N回販売商品の購入上限チェック
    IF p_purchase_limit > 0 AND NOT p_is_beginner THEN
        SELECT COALESCE(purchase_count, 0) INTO v_purchase_count 
        FROM user_shop_purchases 
        WHERE user_id = p_user_id AND product_id = p_product_id;

        IF v_purchase_count >= p_purchase_limit THEN
            RAISE EXCEPTION 'この商品は購入上限回数に達しています。';
        END IF;
    END IF;

    -- トランザクション記録を作成
    INSERT INTO payment_transactions (
        user_id,
        stripe_session_id,
        amount,
        currency,
        diamonds_added,
        status
    ) VALUES (
        p_user_id,
        p_stripe_session_id,
        p_amount_jpy,
        'jpy',
        0, -- 配布アイテムはすべてpresents経由で受取
        'COMPLETED'
    );

    -- 配布アイテムをプレゼントBOX (presents) へ挿入
    v_expire_at := NOW() + INTERVAL '30 days';

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := v_item->>'item_id';
        v_qty := (v_item->>'quantity')::INT;

        INSERT INTO presents (
            user_id,
            item_id,
            quantity,
            message,
            status,
            expire_at
        ) VALUES (
            p_user_id,
            v_item_id,
            v_qty,
            '購入特典: ' || p_product_title,
            'UNCLAIMED',
            v_expire_at
        );
    END LOOP;

    -- 購入履歴レコードの更新
    INSERT INTO user_shop_purchases (user_id, product_id, purchase_count, last_purchased_at)
    VALUES (p_user_id, p_product_id, 1, NOW())
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET 
        purchase_count = user_shop_purchases.purchase_count + 1,
        last_purchased_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'duplicate', false,
        'product_id', p_product_id,
        'message', p_product_title || ' の購入が完了しました！プレゼントBOXへ送付されました。'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
