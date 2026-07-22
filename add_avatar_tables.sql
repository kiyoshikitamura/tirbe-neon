-- ====================================================================
-- TRIBE: NEON REIGN - アバターシステム追加マイグレーション
-- ====================================================================

-- 1. アバターパーツ・マスターデータテーブルの作成
CREATE TABLE IF NOT EXISTS avatar_parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    part_type TEXT NOT NULL CHECK (part_type IN ('HAIR', 'FACE', 'BODY', 'SHOES', 'ACCESSORY', 'BACKGROUND_EFFECT')),
    image_path TEXT NOT NULL,
    price_cash INT NOT NULL DEFAULT 0,
    price_diamond INT NOT NULL DEFAULT 0,
    is_released BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. ユーザー所持アバターパーツテーブルの作成
CREATE TABLE IF NOT EXISTS user_avatar_parts (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    part_id TEXT REFERENCES avatar_parts(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, part_id)
);

-- 3. ユーザーアバター装着状態テーブルの作成
CREATE TABLE IF NOT EXISTS user_avatars (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    hair_id TEXT REFERENCES avatar_parts(id) ON DELETE RESTRICT NOT NULL,
    face_id TEXT REFERENCES avatar_parts(id) ON DELETE RESTRICT NOT NULL,
    body_id TEXT REFERENCES avatar_parts(id) ON DELETE RESTRICT NOT NULL,
    shoes_id TEXT REFERENCES avatar_parts(id) ON DELETE SET NULL,
    accessory_id TEXT REFERENCES avatar_parts(id) ON DELETE SET NULL,
    bg_effect_1_id TEXT REFERENCES avatar_parts(id) ON DELETE SET NULL,
    bg_effect_2_id TEXT REFERENCES avatar_parts(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. インデックスの追加
CREATE INDEX IF NOT EXISTS idx_user_avatar_parts_user ON user_avatar_parts(user_id);

-- 5. 初期アセットマスタデータのシードインサート
INSERT INTO avatar_parts (id, name, part_type, image_path, price_cash, price_diamond) VALUES
-- 素体(BASE) ※性別切替用（実際には user_avatars の gender をベースにしつつ画像を表示）
('base_male', '男性素体', 'BODY', '/avatar/base_male.webp', 0, 0),
('base_female', '女性素体', 'BODY', '/avatar/base_female.webp', 0, 0),

-- 服装(BODY) ※初期ベーシック
('body_basic', 'ベーシックアパレル', 'BODY', '/avatar/body_basic.webp', 0, 0),

-- 表情(FACE) - 男性向け4種
('face_male_standard', '通常 (男)', 'FACE', '/avatar/face_male_standard.webp', 0, 0),
('face_male_smirk', '不敵 (男)', 'FACE', '/avatar/face_male_smirk.webp', 0, 0),
('face_male_angry', '怒り (男)', 'FACE', '/avatar/face_male_angry.webp', 0, 0),
('face_male_smile', '笑顔 (男)', 'FACE', '/avatar/face_male_smile.webp', 0, 0),

-- 表情(FACE) - 女性向け4種
('face_female_standard', '通常 (女)', 'FACE', '/avatar/face_female_standard.webp', 0, 0),
('face_female_smirk', '不敵 (女)', 'FACE', '/avatar/face_female_smirk.webp', 0, 0),
('face_female_angry', '怒り (女)', 'FACE', '/avatar/face_female_angry.webp', 0, 0),
('face_female_smile', '笑顔 (女)', 'FACE', '/avatar/face_female_smile.webp', 0, 0),

-- 髪型(HAIR) - 男性向け4種
('hair_male_spiky', 'ツンツン (男)', 'HAIR', '/avatar/hair_male_spiky.webp', 0, 0),
('hair_male_short', 'ショート (男)', 'HAIR', '/avatar/hair_male_short.webp', 0, 0),
('hair_male_wavy', 'ウエーブ (男)', 'HAIR', '/avatar/hair_male_wavy.webp', 0, 0),
('hair_male_long', 'ロング (男)', 'HAIR', '/avatar/hair_male_long.webp', 0, 0),

-- 髪型(HAIR) - 女性向け4種
('hair_female_spiky', 'ツンツン (女)', 'HAIR', '/avatar/hair_female_spiky.webp', 0, 0),
('hair_female_short', 'ショート (女)', 'HAIR', '/avatar/hair_female_short.webp', 0, 0),
('hair_female_wavy', 'ウエーブ (女)', 'HAIR', '/avatar/hair_female_wavy.webp', 0, 0),
('hair_female_long', 'ロング (女)', 'HAIR', '/avatar/hair_female_long.webp', 0, 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    part_type = EXCLUDED.part_type,
    image_path = EXCLUDED.image_path;

-- 6. initialize_new_user 関数のアバター対応拡張
CREATE OR REPLACE FUNCTION initialize_new_user(
    p_user_id UUID,
    p_username TEXT,
    p_character_id UUID,
    p_area_id TEXT,
    p_gift_code TEXT DEFAULT NULL,
    p_gender TEXT DEFAULT 'MALE',
    p_hair_id TEXT DEFAULT 'hair_male_spiky',
    p_face_id TEXT DEFAULT 'face_male_smirk'
) RETURNS VOID AS $$
DECLARE
    v_inviter_id UUID;
    v_invite_count INT;
    v_skill_card_id TEXT;
    v_expire_at TIMESTAMP WITH TIME ZONE;
BEGIN
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
            WHEN p_character_id = '11111111-1111-1111-1111-111111111111'::UUID THEN '/reiji_transparent_asset.png'
            WHEN p_character_id = '33333333-3333-3333-3333-333333333333'::UUID THEN '/rui_transparent_asset.png'
            ELSE '/chang_transparent_asset.png'
        END,
        10000, 200, 100, 5, 
        CASE WHEN p_area_id = 'shinjuku' THEN 'neon_tower' ELSE p_area_id END, 
        p_character_id
    );

    -- D. 招待関係の記録 ＆ 報酬付与
    IF v_inviter_id IS NOT NULL THEN
        -- 招待ログ追加
        INSERT INTO user_invitations (inviter_id, invitee_id) VALUES (v_inviter_id, p_user_id);
        
        -- 被招待者（新規ユーザー）へプレゼント付与 (ダイヤ+100)
        v_expire_at := NOW() + INTERVAL '30 days';
        INSERT INTO presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
        VALUES (p_user_id, 'DIAMOND', 100, '招待ギフトコード入力報酬', 'UNCLAIMED', NOW(), v_expire_at);
        
        -- 招待元へのミッション評価 (USER_INVITE トリガー)
        PERFORM evaluate_mission_progress(v_inviter_id, 'USER_INVITE', 1);
    END IF;

    -- E. 初期キャラクターと初期装備、スキルの付与
    INSERT INTO user_characters (user_id, character_id, level, awakening_level, skill_slots)
    VALUES (p_user_id, p_character_id, 1, 0, 3);

    -- 初期キャラクターの所持スキルカードと装備
    -- (既存の setup_schema.sql 内の初期化処理を引き継ぐ場合はここに記述、ここでは省略せずに初期アバター登録を行います)
    
    -- F. 初期アバターの登録
    -- 初期選択パーツと服装ベーシックを所持品へ登録
    INSERT INTO user_avatar_parts (user_id, part_id) VALUES
        (p_user_id, p_hair_id),
        (p_user_id, p_face_id),
        (p_user_id, 'body_basic')
    ON CONFLICT DO NOTHING;

    -- アバター現在の装着状態を登録
    INSERT INTO user_avatars (
        user_id, gender, hair_id, face_id, body_id, shoes_id, accessory_id, bg_effect_1_id, bg_effect_2_id
    ) VALUES (
        p_user_id, p_gender, p_hair_id, p_face_id, 'body_basic', NULL, NULL, NULL, NULL
    )
    ON CONFLICT (user_id) DO UPDATE SET
        gender = EXCLUDED.gender,
        hair_id = EXCLUDED.hair_id,
        face_id = EXCLUDED.face_id,
        body_id = EXCLUDED.body_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
