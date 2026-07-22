-- ====================================================================
-- initialize_new_user ストアドファンクションの更新
-- 初期メンバー選択のオミット（p_character_id の NULL 許容）に対応
-- ====================================================================

CREATE OR REPLACE FUNCTION initialize_new_user(
    p_user_id UUID,
    p_username TEXT,
    p_character_id UUID DEFAULT NULL, -- DEFAULT NULL に変更
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
            WHEN p_character_id = '22222222-2222-2222-2222-222222222222'::UUID THEN '/chang_transparent_asset.png'
            ELSE '/reiji_transparent_asset.png' -- デフォルト
        END,
        10000, 200, 100, 5, 
        CASE WHEN p_area_id = 'shinjuku' THEN 'neon_tower' ELSE p_area_id END, 
        p_character_id
    );

    -- D. 初期キャラクター・スキル・装備品の追加 (p_character_id が指定されている場合のみ)
    IF p_character_id IS NOT NULL THEN
        -- 初期キャラクターの追加
        INSERT INTO user_characters (user_id, character_id, level, awakening_level)
        VALUES (p_user_id, p_character_id, 1, 0);

        -- 初期スキルの追加 (キャラクターごと)
        v_skill_card_id := CASE 
            WHEN p_character_id = '11111111-1111-1111-1111-111111111111'::UUID THEN 'SKILL_037'
            WHEN p_character_id = '33333333-3333-3333-3333-333333333333'::UUID THEN 'SKILL_039'
            ELSE 'SKILL_038'
        END;
        
        INSERT INTO user_skills (user_id, skill_card_id, plus_val, equipped_character_id, slot_index)
        SELECT p_user_id, v_skill_card_id, 0, id, 0
        FROM user_characters 
        WHERE user_id = p_user_id AND character_id = p_character_id;

        -- 初期装備品の追加
        INSERT INTO user_equipments (user_id, equipment_id, level, plus_val, equipped_character_id, slot_index, random_options)
        SELECT 
            p_user_id, 
            e.equipment_id, 
            1, 0, 
            uc.id, 
            e.slot_index,
            '[]'::jsonb
        FROM user_characters uc
        CROSS JOIN (
            VALUES 
                ('WEAPON_001', 0),
                ('HEAD_001', 2),
                ('BODY_001', 3),
                ('LEGS_001', 4),
                ('ACCESSORY_001', 5)
        ) AS e(equipment_id, slot_index)
        WHERE uc.user_id = p_user_id AND uc.character_id = p_character_id;
    END IF;

    -- G. 招待関係の記録と進捗加算
    IF v_inviter_id IS NOT NULL THEN
        INSERT INTO user_invitations (inviter_id, invitee_id)
        VALUES (v_inviter_id, p_user_id);
        
        PERFORM evaluate_mission_progress(v_inviter_id, 'USER_INVITE', 1);

        v_expire_at := NOW() + INTERVAL '30 days';
        INSERT INTO presents (user_id, item_id, quantity, message, status, expire_at)
        VALUES (p_user_id, 'DIAMOND', 100, 'ギフトコード入力報酬: ダイヤ獲得', 'UNCLAIMED', v_expire_at);
    END IF;

    -- H. 初期ミッションの割り当て
    INSERT INTO user_missions (user_id, mission_id, current_progress, status)
    VALUES
        (p_user_id, 'm_pvp_01', 0, 'PROGRESS'),
        (p_user_id, 'm_exp_01', 0, 'PROGRESS'),
        (p_user_id, 'm_lvl_01', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_01', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_02', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_03', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_04', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_05', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_06', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_07', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_08', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_09', 0, 'PROGRESS'),
        (p_user_id, 'm_invite_10', 0, 'PROGRESS')
    ON CONFLICT (user_id, mission_id) DO NOTHING;

    -- I. 初期アバターの登録
    INSERT INTO user_avatar_parts (user_id, part_id) VALUES
        (p_user_id, p_hair_id),
        (p_user_id, p_face_id),
        (p_user_id, 'body_basic')
    ON CONFLICT DO NOTHING;

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
