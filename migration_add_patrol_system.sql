-- ====================================================================
-- TRIBE: NEON REIGN - 「見回り」システム再構築マイグレーション SQL
-- ====================================================================

-- 既存の「派遣（シノギ・遠征）」関連の依存関係を削除
DROP FUNCTION IF EXISTS complete_expedition_instantly(UUID, UUID, TEXT);
DROP TABLE IF EXISTS user_expeditions CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS quest_towns CASCADE;

-- 1. 街マスター (`patrol_towns`)
CREATE TABLE IF NOT EXISTS patrol_towns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- 2. 見回りバトルNPC定義 (`patrol_npcs_master`)
CREATE TABLE IF NOT EXISTS patrol_npcs_master (
    id TEXT PRIMARY KEY,
    npc_name TEXT NOT NULL,
    level INT NOT NULL DEFAULT 1,
    hp INT NOT NULL DEFAULT 1000,
    atk INT NOT NULL DEFAULT 100,
    def INT NOT NULL DEFAULT 100,
    spd INT NOT NULL DEFAULT 100,
    luk INT NOT NULL DEFAULT 10,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb, -- スキルカード構造体の配列
    win_reward_cash_bonus INT NOT NULL DEFAULT 0,
    win_reward_xp_bonus INT NOT NULL DEFAULT 0,
    win_reward_item_id TEXT,
    win_reward_item_qty INT NOT NULL DEFAULT 0
);

-- 3. 見回りコースマスター (`patrol_courses`)
CREATE TABLE IF NOT EXISTS patrol_courses (
    id TEXT PRIMARY KEY,
    town_id TEXT REFERENCES patrol_towns(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    course_type TEXT NOT NULL CHECK (course_type IN ('EASY', 'NORMAL', 'HARD')),
    duration_seconds INT NOT NULL,
    cost_vitality INT NOT NULL,
    reward_cash INT NOT NULL,
    reward_xp INT NOT NULL,
    reward_item_id TEXT,
    reward_item_chance NUMERIC NOT NULL DEFAULT 0.0,
    battle_trigger_chance NUMERIC NOT NULL DEFAULT 0.0,
    battle_npc_id TEXT REFERENCES patrol_npcs_master(id) ON DELETE SET NULL
);

-- 4. 見回り進行状況 (`user_patrols`)
CREATE TABLE IF NOT EXISTS user_patrols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    course_id TEXT REFERENCES patrol_courses(id) ON DELETE CASCADE NOT NULL,
    character_id UUID REFERENCES user_characters(id) ON DELETE SET NULL, -- 1キャラ派遣のみ
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ONGOING', 'CLAIMABLE', 'COMPLETED')) DEFAULT 'ONGOING',
    has_battle_event BOOLEAN NOT NULL DEFAULT FALSE,
    battle_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    battle_result TEXT CHECK (battle_result IN ('VICTORY', 'DEFEAT')),
    rewards_accrued JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. インデックスの追加
CREATE INDEX idx_user_patrols_active ON user_patrols(user_id) WHERE status = 'ONGOING';
CREATE INDEX idx_user_patrols_user ON user_patrols(user_id);

-- ====================================================================
-- シードデータの投入
-- ====================================================================

-- A. 街マスターのシード
INSERT INTO patrol_towns (id, name) VALUES
('shinjuku', '新宿'),
('shibuya', '渋谷'),
('ikebukuro', '池袋'),
('roppongi', '六本木'),
('akihabara', '秋葉原'),
('kawasaki', '川崎'),
('yokohama', '横浜')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- B. 見回りバトルNPCのシード
INSERT INTO patrol_npcs_master (id, npc_name, level, hp, atk, def, spd, luk, skills, win_reward_cash_bonus, win_reward_xp_bonus, win_reward_item_id, win_reward_item_qty) VALUES
('patrol_npc_shinjuku', '新宿の回収屋', 10, 1000, 80, 70, 90, 8, '[{"id":"e_skill_0_1","name":"通常攻撃","ap_cost":1,"power":40,"effect_type":"ATTACK"},{"id":"e_skill_0_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 500, 50, 'TRAINING_MANUAL', 1),
('patrol_npc_shibuya', '渋谷のディーラー', 15, 1200, 95, 80, 95, 10, '[{"id":"e_skill_1_1","name":"通常攻撃","ap_cost":1,"power":45,"effect_type":"ATTACK"},{"id":"e_skill_1_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 1000, 100, 'TRAINING_MANUAL', 1),
('patrol_npc_ikebukuro', '池袋のヒットマン', 20, 1500, 110, 90, 100, 12, '[{"id":"e_skill_2_1","name":"通常攻撃","ap_cost":1,"power":50,"effect_type":"ATTACK"},{"id":"e_skill_2_2","name":"通常防御","ap_cost":1,"power":30,"effect_type":"DEFENSE"}]'::jsonb, 1500, 150, 'POLISHING_STONE', 1),
('patrol_npc_roppongi', '六本木の用心棒', 25, 1800, 125, 100, 105, 14, '[{"id":"e_skill_3_1","name":"通常攻撃","ap_cost":1,"power":55,"effect_type":"ATTACK"},{"id":"e_skill_3_2","name":"通常防御","ap_cost":1,"power":35,"effect_type":"DEFENSE"}]'::jsonb, 2000, 200, 'POLISHING_STONE', 1),
('patrol_npc_akihabara', '秋葉原のバイヤー', 30, 2000, 140, 110, 110, 16, '[{"id":"e_skill_4_1","name":"通常攻撃","ap_cost":1,"power":60,"effect_type":"ATTACK"},{"id":"e_skill_4_2","name":"通常防御","ap_cost":1,"power":35,"effect_type":"DEFENSE"}]'::jsonb, 2500, 250, 'LAW_OF_STRIFE', 1),
('patrol_npc_kawasaki', '川崎の仕切屋', 35, 2200, 155, 120, 115, 18, '[{"id":"e_skill_0_1","name":"通常攻撃","ap_cost":1,"power":65,"effect_type":"ATTACK"},{"id":"e_skill_0_2","name":"通常防御","ap_cost":1,"power":40,"effect_type":"DEFENSE"}]'::jsonb, 3000, 300, 'LAW_OF_STRIFE', 1),
('patrol_npc_yokohama', '横浜の香港マフィア', 40, 2500, 170, 130, 120, 20, '[{"id":"e_skill_1_1","name":"通常攻撃","ap_cost":1,"power":70,"effect_type":"ATTACK"},{"id":"e_skill_1_2","name":"通常防御","ap_cost":1,"power":40,"effect_type":"DEFENSE"}]'::jsonb, 4000, 400, 'WEAPON_001', 1)
ON CONFLICT (id) DO UPDATE SET
    npc_name = EXCLUDED.npc_name, level = EXCLUDED.level, hp = EXCLUDED.hp, atk = EXCLUDED.atk, def = EXCLUDED.def, spd = EXCLUDED.spd, luk = EXCLUDED.luk, skills = EXCLUDED.skills,
    win_reward_cash_bonus = EXCLUDED.win_reward_cash_bonus, win_reward_xp_bonus = EXCLUDED.win_reward_xp_bonus, win_reward_item_id = EXCLUDED.win_reward_item_id, win_reward_item_qty = EXCLUDED.win_reward_item_qty;

-- C. 見回りコースマスターのシード
INSERT INTO patrol_courses (id, town_id, name, course_type, duration_seconds, cost_vitality, reward_cash, reward_xp, reward_item_id, reward_item_chance, battle_trigger_chance, battle_npc_id) VALUES
-- 新宿
('patrol_shinjuku_easy', 'shinjuku', '新宿: 見回り (初級)', 'EASY', 15, 10, 500, 100, 'TRAINING_MANUAL', 0.80, 0.10, 'patrol_npc_shinjuku'),
('patrol_shinjuku_normal', 'shinjuku', '新宿: 用心棒 (中級)', 'NORMAL', 45, 30, 2500, 300, 'POLISHING_STONE', 0.50, 0.20, 'patrol_npc_shinjuku'),
('patrol_shinjuku_hard', 'shinjuku', '新宿: 利権争い (上級)', 'HARD', 120, 50, 6000, 500, 'LAW_OF_STRIFE', 0.30, 0.35, 'patrol_npc_shinjuku'),
-- 渋谷
('patrol_shibuya_easy', 'shibuya', '渋谷: パトロール (初級)', 'EASY', 15, 10, 500, 100, 'TRAINING_MANUAL', 0.80, 0.10, 'patrol_npc_shibuya'),
('patrol_shibuya_normal', 'shibuya', '渋谷: 摘発支援 (中級)', 'NORMAL', 45, 30, 2500, 300, 'POLISHING_STONE', 0.50, 0.20, 'patrol_npc_shibuya'),
('patrol_shibuya_hard', 'shibuya', '渋谷: 流通支配 (上級)', 'HARD', 120, 50, 6000, 500, 'LAW_OF_STRIFE', 0.30, 0.35, 'patrol_npc_shibuya'),
-- 池袋
('patrol_ikebukuro_easy', 'ikebukuro', '池袋: 巡回 (初級)', 'EASY', 15, 10, 500, 100, 'TRAINING_MANUAL', 0.80, 0.10, 'patrol_npc_ikebukuro'),
('patrol_ikebukuro_normal', 'ikebukuro', '池袋: ショバ代徴収 (中級)', 'NORMAL', 45, 30, 2500, 300, 'POLISHING_STONE', 0.50, 0.20, 'patrol_npc_ikebukuro'),
('patrol_ikebukuro_hard', 'ikebukuro', '池袋: 運営権強奪 (上級)', 'HARD', 120, 50, 6000, 500, 'LAW_OF_STRIFE', 0.30, 0.35, 'patrol_npc_ikebukuro'),
-- 六本木
('patrol_roppongi_easy', 'roppongi', '六本木: 案内 (初級)', 'EASY', 15, 10, 500, 100, 'TRAINING_MANUAL', 0.80, 0.10, 'patrol_npc_roppongi'),
('patrol_roppongi_normal', 'roppongi', '六本木: カジノ警備 (中級)', 'NORMAL', 45, 30, 2500, 300, 'POLISHING_STONE', 0.50, 0.20, 'patrol_npc_roppongi'),
('patrol_roppongi_hard', 'roppongi', '六本木: 現金輸送 (上級)', 'HARD', 120, 50, 6000, 500, 'LAW_OF_STRIFE', 0.30, 0.35, 'patrol_npc_roppongi'),
-- 秋葉原
('patrol_akihabara_easy', 'akihabara', '秋葉原: ジャンク回収 (初級)', 'EASY', 15, 10, 500, 100, 'TRAINING_MANUAL', 0.80, 0.10, 'patrol_npc_akihabara'),
('patrol_akihabara_normal', 'akihabara', '秋葉原: 情報買収 (中級)', 'NORMAL', 45, 30, 2500, 300, 'POLISHING_STONE', 0.50, 0.20, 'patrol_npc_akihabara'),
('patrol_akihabara_hard', 'akihabara', '秋葉原: チップ密売 (上級)', 'HARD', 120, 50, 6000, 500, 'LAW_OF_STRIFE', 0.30, 0.35, 'patrol_npc_akihabara'),
-- 川崎
('patrol_kawasaki_easy', 'kawasaki', '川崎: 偵察任務 (初級)', 'EASY', 15, 10, 500, 100, 'TRAINING_MANUAL', 0.80, 0.10, 'patrol_npc_kawasaki'),
('patrol_kawasaki_normal', 'kawasaki', '川崎: 闘技場対応 (中級)', 'NORMAL', 45, 30, 2500, 300, 'POLISHING_STONE', 0.50, 0.20, 'patrol_npc_kawasaki'),
('patrol_kawasaki_hard', 'kawasaki', '川崎: 密輸支援 (上級)', 'HARD', 120, 50, 6000, 500, 'LAW_OF_STRIFE', 0.30, 0.35, 'patrol_npc_kawasaki'),
-- 横浜
('patrol_yokohama_easy', 'yokohama', '横浜: 裏路地見回り (初級)', 'EASY', 15, 10, 500, 100, 'TRAINING_MANUAL', 0.80, 0.10, 'patrol_npc_yokohama'),
('patrol_yokohama_normal', 'yokohama', '横浜: 倉庫警護 (中級)', 'NORMAL', 45, 30, 2500, 300, 'POLISHING_STONE', 0.50, 0.20, 'patrol_npc_yokohama'),
('patrol_yokohama_hard', 'yokohama', '横浜: 会談警備 (上級)', 'HARD', 120, 50, 6000, 500, 'LAW_OF_STRIFE', 0.30, 0.35, 'patrol_npc_yokohama')
ON CONFLICT (id) DO UPDATE SET
    town_id = EXCLUDED.town_id, name = EXCLUDED.name, course_type = EXCLUDED.course_type, duration_seconds = EXCLUDED.duration_seconds, cost_vitality = EXCLUDED.cost_vitality,
    reward_cash = EXCLUDED.reward_cash, reward_xp = EXCLUDED.reward_xp, reward_item_id = EXCLUDED.reward_item_id, reward_item_chance = EXCLUDED.reward_item_chance,
    battle_trigger_chance = EXCLUDED.battle_trigger_chance, battle_npc_id = EXCLUDED.battle_npc_id;


-- ====================================================================
-- 6. 時短帰還ストアドファンクション (`complete_patrol_instantly`)
-- ====================================================================
CREATE OR REPLACE FUNCTION complete_patrol_instantly(
    p_user_id UUID,
    p_patrol_id UUID,
    p_use_currency TEXT -- 'CASH' or 'DIAMOND'
)
RETURNS JSONB AS $$
DECLARE
    v_patrol RECORD;
    v_course RECORD;
    v_user RECORD;
    v_seconds_left INT;
    v_cost INT;
    v_rewards_accrued JSONB;
    v_result JSONB;
    v_now TIMESTAMP WITH TIME ZONE;
    v_luk_sum INT := 0;
    v_match_count INT := 0;
    v_chance_bonus DOUBLE PRECISION := 0.0;
    v_cash_bonus INT := 0;
    v_c_rec RECORD;
    v_has_battle BOOLEAN := FALSE;
BEGIN
    v_now := NOW();
    
    -- A. 見回りデータの取得
    SELECT * INTO v_patrol FROM user_patrols WHERE id = p_patrol_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION '指定された見回りデータが見つかりません。';
    END IF;
    
    IF v_patrol.status != 'ONGOING' THEN
        RAISE EXCEPTION '見回りはすでに完了しているか、帰還準備が整っています。';
    END IF;
    
    -- B. コースマスターとユーザー情報の取得
    SELECT * INTO v_course FROM patrol_courses WHERE id = v_patrol.course_id;
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    
    -- C. コスト計算と支払
    v_seconds_left := EXTRACT(EPOCH FROM (v_patrol.expires_at - v_now))::INT;
    IF v_seconds_left <= 0 THEN
        v_seconds_left := 0;
    END IF;
    
    IF p_use_currency = 'CASH' THEN
        v_cost := CEIL(v_seconds_left / 60.0)::INT * 100;
        
        -- 日付変更チェック (AM 4:00基準)
        DECLARE
            v_reset_boundary TIMESTAMP WITH TIME ZONE;
        BEGIN
            v_reset_boundary := date_trunc('day', v_now) + INTERVAL '4 hours';
            IF v_now < v_reset_boundary THEN
                v_reset_boundary := v_reset_boundary - INTERVAL '1 day';
            END IF;
            
            IF v_user.last_cash_skip_at < v_reset_boundary THEN
                UPDATE users SET daily_cash_skips_count = 0 WHERE id = p_user_id;
                v_user.daily_cash_skips_count := 0;
            END IF;
        END;
        
        IF v_user.daily_cash_skips_count >= 3 THEN
            RAISE EXCEPTION 'キャッシュによる即時完了は本日すでに3回実行されています。';
        END IF;
        
        IF v_user.cash < v_cost THEN
            RAISE EXCEPTION 'キャッシュが不足しています。';
        END IF;
        
        UPDATE users 
        SET cash = cash - v_cost,
            daily_cash_skips_count = daily_cash_skips_count + 1,
            last_cash_skip_at = v_now
        WHERE id = p_user_id;
        
    ELSIF p_use_currency = 'DIAMOND' THEN
        v_cost := CEIL(v_seconds_left / 3600.0)::INT * 10;
        
        IF v_user.neon_diamonds < v_cost THEN
            RAISE EXCEPTION 'ダイヤが不足しています。';
        END IF;
        
        UPDATE users SET neon_diamonds = neon_diamonds - v_cost WHERE id = p_user_id;
    ELSE
        RAISE EXCEPTION '無効な通貨タイプです。';
    END IF;
    
    -- D. 地元一致ボーナスの計算 (1キャラ)
    IF v_patrol.character_id IS NOT NULL THEN
        SELECT uc.*, c.home_town, c.base_luk INTO v_c_rec 
        FROM user_characters uc 
        JOIN characters c ON uc.character_id = c.id
        WHERE uc.id = v_patrol.character_id;
        
        IF FOUND AND v_c_rec.home_town = v_course.town_id THEN
            v_luk_sum := v_c_rec.base_luk;
            v_match_count := 1;
        END IF;
    END IF;

    IF v_match_count > 0 THEN
        v_chance_bonus := v_luk_sum * 0.001;
        v_cash_bonus := v_luk_sum * 10;
    END IF;

    -- E. バトルイベント発生判定
    IF random() <= v_course.battle_trigger_chance THEN
        v_has_battle := TRUE;
    END IF;

    -- F. 報酬の決定 (地元一致ボーナス適用)
    DECLARE
        v_random_val DOUBLE PRECISION;
        v_reward_item_id TEXT := NULL;
        v_reward_qty INT := 0;
    BEGIN
        v_random_val := random();
        IF v_course.reward_item_id IS NOT NULL AND v_random_val <= (v_course.reward_item_chance + v_chance_bonus) THEN
            v_reward_item_id := v_course.reward_item_id;
            v_reward_qty := 1;
        END IF;
        
        v_rewards_accrued := jsonb_build_array(
            jsonb_build_object(
                'time', to_char(v_now, 'HH24:MI'),
                'log', '見回りを手早く済ませ、帰還の準備を整えた。',
                'reward_cash', v_course.reward_cash + v_cash_bonus,
                'reward_item_id', COALESCE(v_reward_item_id, ''),
                'reward_quantity', v_reward_qty,
                'luk_bonus_applied', v_match_count > 0,
                'bonus_cash', v_cash_bonus,
                'bonus_chance_pct', v_chance_bonus * 100.0
            )
        );
    END;

    UPDATE user_patrols 
    SET expires_at = v_now,
        status = 'CLAIMABLE',
        has_battle_event = v_has_battle,
        rewards_accrued = v_rewards_accrued
    WHERE id = p_patrol_id;
    
    v_result := jsonb_build_object(
        'status', 'success',
        'cost_paid', v_cost,
        'currency_used', p_use_currency,
        'rewards', v_rewards_accrued,
        'has_battle_event', v_has_battle
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ====================================================================
-- 7. ログイン一括取得ファンクションの更新 (`get_bootstrap_sync_data`)
-- ====================================================================
CREATE OR REPLACE FUNCTION get_bootstrap_sync_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_profile JSONB;
    v_unclaimed_presents_count INT;
    v_active_news JSONB;
    v_active_patrol JSONB;
    v_result JSONB;
    v_patrol_courses JSONB;
    v_patrol_npcs JSONB;
BEGIN
    -- A. ユーザープロファイル
    SELECT row_to_json(u) INTO v_user_profile FROM users u WHERE u.id = p_user_id;

    -- B. 未受取プレゼント数
    SELECT count(*) INTO v_unclaimed_presents_count FROM presents p WHERE p.user_id = p_user_id AND p.status = 'UNCLAIMED';

    -- C. 最新お知らせ (10件)
    SELECT COALESCE(json_agg(n), '[]'::json) INTO v_active_news
    FROM (
        SELECT news.id, news.category, news.title, news.created_at,
               EXISTS(SELECT 1 FROM user_news_reads r WHERE r.user_id = p_user_id AND r.news_id = news.id) AS is_read
        FROM news
        WHERE NOW() BETWEEN news.start_at AND news.end_at
        ORDER BY news.created_at DESC
        LIMIT 10
    ) n;

    -- D. 進行中または受取待ちの見回り
    SELECT to_jsonb(p) INTO v_active_patrol
    FROM user_patrols p
    WHERE p.user_id = p_user_id AND p.status IN ('ONGOING', 'CLAIMABLE')
    LIMIT 1;

    -- E. 見回りコースマスタの一括ロード
    SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_patrol_courses FROM patrol_courses c;

    -- F. 見回りバトルNPCマスタの一括ロード
    SELECT COALESCE(jsonb_agg(n), '[]'::jsonb) INTO v_patrol_npcs FROM patrol_npcs_master n;

    -- G. マージして返却
    v_result := jsonb_build_object(
        'user_profile', v_user_profile,
        'unclaimed_presents_count', v_unclaimed_presents_count,
        'active_news', v_active_news,
        'active_patrol', COALESCE(v_active_patrol, 'null'::jsonb),
        'patrol_courses', v_patrol_courses,
        'patrol_npcs', v_patrol_npcs
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
