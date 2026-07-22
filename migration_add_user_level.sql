-- ====================================================================
-- TRIBE: NEON REIGN - ユーザーレベル・経験値システム追加マイグレーション
-- ====================================================================

-- 1. ユーザーレベル必要経験値マスタテーブル
CREATE TABLE IF NOT EXISTS user_level_master (
    level INT PRIMARY KEY CHECK (level BETWEEN 1 AND 99),
    next_xp INT NOT NULL
);

-- レベル1〜99までの必要経験値をシードインサート (Lv99は0)
INSERT INTO user_level_master (level, next_xp)
SELECT g, CASE WHEN g = 99 THEN 0 ELSE g * 100 END
FROM generate_series(1, 99) g
ON CONFLICT (level) DO UPDATE SET next_xp = EXCLUDED.next_xp;

-- 2. PvP勝利報酬マスタテーブル
CREATE TABLE IF NOT EXISTS pvp_match_rewards_master (
    status TEXT PRIMARY KEY CHECK (status IN ('VICTORY', 'DEFEAT')),
    reward_xp INT NOT NULL DEFAULT 0,
    reward_cash_base INT NOT NULL DEFAULT 0
);

-- PvP勝利・敗北のシードインサート
INSERT INTO pvp_match_rewards_master (status, reward_xp, reward_cash_base) VALUES
('VICTORY', 150, 400),
('DEFEAT', 0, 0)
ON CONFLICT (status) DO UPDATE SET 
    reward_xp = EXCLUDED.reward_xp, 
    reward_cash_base = EXCLUDED.reward_cash_base;

-- 3. usersテーブルへのlevel, xpカラムの追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 99);
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INT NOT NULL DEFAULT 0;

-- 4. questsテーブルへのreward_xpカラムの追加および既存シードの更新
ALTER TABLE quests ADD COLUMN IF NOT EXISTS reward_xp INT NOT NULL DEFAULT 0;

-- 既存のクエストへの経験値付与
UPDATE quests SET reward_xp = 100 WHERE course_type = 'EASY';
UPDATE quests SET reward_xp = 300 WHERE course_type = 'NORMAL';
UPDATE quests SET reward_xp = 500 WHERE course_type = 'HARD';

-- 5. initialize_new_user 関数の更新
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

    -- C. ユーザーレコードの作成 (level=1, xp=0)
    INSERT INTO users (
        id, username, bio, avatar_url, cash, neon_diamonds, vitality, pvp_tickets, current_base_id, favorite_character_id, level, xp
    ) VALUES (
        p_user_id, p_username, '歌舞伎町の覇権を握るため立ち上がる。', 
        CASE 
            WHEN p_character_id = '11111111-1111-1111-1111-111111111111'::UUID THEN '/reiji_transparent_asset.png'
            WHEN p_character_id = '33333333-3333-3333-3333-333333333333'::UUID THEN '/rui_transparent_asset.png'
            ELSE '/chang_transparent_asset.png'
        END,
        10000, 200, 100, 5, 
        CASE WHEN p_area_id = 'shinjuku' THEN 'neon_tower' ELSE p_area_id END, 
        p_character_id,
        1, 0
    );

    -- D. 初期キャラクターの追加
    INSERT INTO user_characters (user_id, character_id, level, awakening_level)
    VALUES (p_user_id, p_character_id, 1, 0);

    -- E. 初期スキルの追加 (キャラクターごと)
    v_skill_card_id := CASE 
        WHEN p_character_id = '11111111-1111-1111-1111-111111111111'::UUID THEN 'SKILL_037'
        WHEN p_character_id = '33333333-3333-3333-3333-333333333333'::UUID THEN 'SKILL_039'
        ELSE 'SKILL_038'
    END;
    
    INSERT INTO user_skills (user_id, skill_card_id, plus_val, equipped_character_id, slot_index)
    SELECT p_user_id, v_skill_card_id, 0, id, 0
    FROM user_characters 
    WHERE user_id = p_user_id AND character_id = p_character_id;

    -- F. 初期装備品の追加
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

    -- G. 招待関係の記録と進捗加算 (ギフトコードが入力されていた場合)
    IF v_inviter_id IS NOT NULL THEN
        INSERT INTO user_invitations (inviter_id, invitee_id)
        VALUES (v_inviter_id, p_user_id);
        
        -- 招待者へのミッション進捗評価 (トリガー: 'USER_INVITE')
        PERFORM evaluate_mission_progress(v_inviter_id, 'USER_INVITE', 1);

        -- 被招待者（自分自身）のプレゼントボックスにギフトコード入力報酬を追加 (期限30日間)
        v_expire_at := NOW() + INTERVAL '30 days';
        INSERT INTO presents (user_id, item_id, quantity, message, status, expire_at)
        VALUES (p_user_id, 'DIAMOND', 100, 'ギフトコード入力報酬: ダイヤ獲得', 'UNCLAIMED', v_expire_at);
    END IF;

    -- H. 初期ミッションの割り当て (あらかじめ PROGRESS 状態で登録)
    INSERT INTO user_missions (user_id, mission_id, current_progress, status)
    VALUES
        (p_user_id, 'm_pvp_01', 0, 'PROGRESS'),
        (p_user_id, 'm_exp_01', 0, 'PROGRESS'),
        (p_user_id, 'm_lvl_01', 0, 'PROGRESS'),
        -- 招待人数系ミッション (最大10人分)
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

-- 6. add_user_xp 関数の作成
CREATE OR REPLACE FUNCTION add_user_xp(
    p_user_id UUID,
    p_xp_amount INT
)
RETURNS JSONB AS $$
DECLARE
    v_level INT;
    v_xp INT;
    v_next_xp INT;
    v_leveled_up BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- 現在のレベルとXPを取得
    SELECT level, xp INTO v_level, v_xp FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ユーザーが見つかりません。';
    END IF;
    
    -- すでに最大レベル99なら終了
    IF v_level >= 99 THEN
        v_result := jsonb_build_object(
            'leveled_up', FALSE,
            'level', v_level,
            'xp', v_xp
        );
        RETURN v_result;
    END IF;
    
    v_xp := v_xp + p_xp_amount;
    
    -- レベルアップ判定ループ
    LOOP
        -- 次のレベルに必要な経験値を取得
        SELECT next_xp INTO v_next_xp FROM user_level_master WHERE level = v_level;
        
        -- レベル99に達したか、次の必要経験値に満たない場合はループを抜ける
        IF v_next_xp IS NULL OR v_xp < v_next_xp THEN
            EXIT;
        END IF;
        
        -- レベルアップ処理
        v_xp := v_xp - v_next_xp;
        v_level := v_level + 1;
        v_leveled_up := TRUE;
        
        IF v_level >= 99 THEN
            v_level := 99;
            v_xp := 0;
            EXIT;
        END IF;
    END LOOP;
    
    -- DB更新
    UPDATE users SET level = v_level, xp = v_xp WHERE id = p_user_id;
    
    -- ミッションの評価 (トリガー: 'USER_LEVEL_UP')
    IF v_leveled_up THEN
        PERFORM evaluate_mission_progress(p_user_id, 'USER_LEVEL_UP', v_level);
    END IF;
    
    v_result := jsonb_build_object(
        'leveled_up', v_leveled_up,
        'level', v_level,
        'xp', v_xp
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
