-- ====================================================================
-- 【TRIBE: NEON REIGN】 initialize_new_user ＆ usersテーブル修復 SQL
--  Supabase SQL Editor にて実行してください。
-- ====================================================================

-- 1. users テーブルに不足しているカラムを自動安全追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '歌舞伎町の覇権を握るため立ち上がる。';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '/reiji_transparent_asset.png';
ALTER TABLE users ADD COLUMN IF NOT EXISTS vitality INT DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pvp_tickets INT DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_base_id TEXT DEFAULT 'neon_tower';
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_character_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gift_code TEXT;

-- 2. 既存の同名関数を全消去してシグネチャミスマッチを完全クリア
DROP FUNCTION IF EXISTS initialize_new_user(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS initialize_new_user(UUID, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS initialize_new_user(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS initialize_new_user(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);

-- 3. 最新の initialize_new_user 関数を作成
CREATE OR REPLACE FUNCTION initialize_new_user(
    p_user_id UUID,
    p_username TEXT,
    p_character_id UUID DEFAULT '11111111-1111-1111-1111-111111111111'::UUID,
    p_area_id TEXT DEFAULT 'shinjuku',
    p_gift_code TEXT DEFAULT NULL,
    p_gender TEXT DEFAULT 'MALE',
    p_hair_id TEXT DEFAULT 'hair_male_spiky',
    p_face_id TEXT DEFAULT 'face_male_smirk'
) RETURNS VOID AS $$
DECLARE
    v_inviter_id UUID;
    v_invite_count INT;
    v_expire_at TIMESTAMP WITH TIME ZONE;
    v_char_id UUID;
BEGIN
    -- デフォルトキャラIDの補正
    v_char_id := COALESCE(p_character_id, '11111111-1111-1111-1111-111111111111'::UUID);

    -- A. 重複チェック
    IF EXISTS(SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'すでに初期セットアップが完了しています。';
    END IF;
    IF EXISTS(SELECT 1 FROM users WHERE username = p_username) THEN
        RAISE EXCEPTION 'このユーザー名は既に使用されています。';
    END IF;

    -- B. ギフトコードの評価 (入力がある場合)
    IF p_gift_code IS NOT NULL AND p_gift_code <> '' THEN
        SELECT id INTO v_inviter_id FROM users WHERE gift_code = p_gift_code;
        IF v_inviter_id IS NULL THEN
            RAISE EXCEPTION '無効なギフトコードです。';
        END IF;
        
        IF v_inviter_id = p_user_id THEN
            RAISE EXCEPTION '自分のギフトコードは使用できません。';
        END IF;

        -- 使用回数チェック (最大10人)
        SELECT COUNT(*) INTO v_invite_count FROM user_invitations WHERE inviter_id = v_inviter_id;
        IF v_invite_count >= 10 THEN
            RAISE EXCEPTION 'このギフトコードは10人使用済です。';
        END IF;
    END IF;

    -- C. ユーザーレコードの作成
    INSERT INTO users (
        id, username, bio, avatar_url, cash, neon_diamonds, vitality, pvp_tickets, current_base_id, favorite_character_id
    ) VALUES (
        p_user_id, p_username, '歌舞伎町の覇権を握るため立ち上がる。', 
        CASE 
            WHEN v_char_id = '11111111-1111-1111-1111-111111111111'::UUID THEN '/reiji_transparent_asset.png'
            WHEN v_char_id = '33333333-3333-3333-3333-333333333333'::UUID THEN '/rui_transparent_asset.png'
            ELSE '/chang_transparent_asset.png'
        END,
        10000, 200, 100, 5, 
        CASE WHEN p_area_id = 'shinjuku' THEN 'neon_tower' ELSE p_area_id END, 
        v_char_id
    );

    -- D. 招待関係の記録 ＆ 報酬付与
    IF v_inviter_id IS NOT NULL THEN
        -- 招待ログ追加（テーブルが存在する場合）
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
            INSERT INTO user_invitations (inviter_id, invitee_id) VALUES (v_inviter_id, p_user_id);
        END IF;
        
        v_expire_at := NOW() + INTERVAL '30 days';
        
        -- 被招待者（自分）にプレゼント付与
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'presents') THEN
            INSERT INTO presents (user_id, title, item_type, amount, expire_at)
            VALUES (p_user_id, '招待コード入力報酬', 'NEON_DIAMOND', 100, v_expire_at);
        END IF;
    END IF;

    -- E. 初期配備メンバー (お気に入りリーダーキャラ) の付与
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_characters') THEN
        INSERT INTO user_characters (user_id, character_id, level, awakening_level)
        VALUES (p_user_id, v_char_id, 1, 0)
        ON CONFLICT (user_id, character_id) DO NOTHING;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 実行権限の付与
GRANT EXECUTE ON FUNCTION initialize_new_user TO anon, authenticated, service_role;
