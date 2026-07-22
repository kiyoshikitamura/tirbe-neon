-- ====================================================================
-- TRIBE: NEON REIGN - データベーススキーマ定義 (Supabase / PostgreSQL)
-- ====================================================================

-- 拡張モジュールの有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. マスターデータ・テーブル群 (Static Data)
-- ==========================================

-- A. キャラクター(NPC)マスターデータ (総数約40種)
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    nickname TEXT,                           -- 通り名
    alignment TEXT NOT NULL CHECK (alignment IN ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS')), -- 固定アライメント
    base_hp INT NOT NULL DEFAULT 100,
    base_atk INT NOT NULL DEFAULT 10,
    base_def INT NOT NULL DEFAULT 10,
    base_spd INT NOT NULL DEFAULT 100,       -- 行動順に直結
    base_luk INT NOT NULL DEFAULT 5,
    avatar_image_url TEXT,                   -- 静止画美麗立ち絵ビジュアル
    home_town TEXT REFERENCES quest_towns(id), -- キャラクターの地元
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B. 拠点マスターデータ
CREATE TABLE bases (
    id TEXT PRIMARY KEY,                     -- 'neon_tower', 'deep_dock', 'junk_bazar', 'kitakura_gate'
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    bg_image_url TEXT NOT NULL,              -- 拠点および戦闘背景として流用
    map_x INT NOT NULL,                      -- 鳥瞰マップ用座標
    map_y INT NOT NULL
);

-- B.5 派遣先の街マスターデータ
CREATE TABLE quest_towns (
    id TEXT PRIMARY KEY,                     -- 'shinjuku', 'shibuya', 'ikebukuro', 'roppongi', 'akihabara', 'kawasaki', 'yokohama'
    name TEXT NOT NULL UNIQUE
);


-- C. スキルカード・マスターデータ (総数約100種)
CREATE TABLE skill_cards (
    id TEXT PRIMARY KEY,                     -- 'SKILL_001' 等
    name TEXT NOT NULL,
    rarity TEXT NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'SSR')),
    alignment TEXT NOT NULL CHECK (alignment IN ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS')), -- 特性
    ap_cost INT NOT NULL DEFAULT 1,          -- 消費AP
    power INT NOT NULL DEFAULT 0,            -- ダメージ/回復威力
    effect_type TEXT NOT NULL,               -- 'ATTACK', 'DEFENSE', 'HEAL', 'SUPPORT', 'JAMMER'
    effect_data JSONB,                       -- 追加バフ・デバフなどの構造化データ
    is_exclusive BOOLEAN DEFAULT FALSE,      -- 専用スキルフラグ
    exclusive_character_id UUID REFERENCES characters(id) ON DELETE SET NULL, -- 専用NPC制限
    description TEXT
);

-- D. 装備品・マスターデータ
CREATE TABLE equipments (
    id TEXT PRIMARY KEY,                     -- 'WEAPON_001', 'HELM_001' 等
    name TEXT NOT NULL,
    slot_type TEXT NOT NULL CHECK (slot_type IN ('WEAPON', 'HEAD', 'BODY', 'LEGS', 'ACCESSORY')),
    rarity TEXT NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'SSR')),
    base_atk INT NOT NULL DEFAULT 0,
    base_def INT NOT NULL DEFAULT 0,
    base_hp INT NOT NULL DEFAULT 0,
    base_spd INT NOT NULL DEFAULT 0,
    base_luk INT NOT NULL DEFAULT 0,
    is_exclusive BOOLEAN DEFAULT FALSE,      -- 専用装備フラグ
    exclusive_character_id UUID REFERENCES characters(id) ON DELETE SET NULL, -- 専用NPC制限
    effect_trigger_type TEXT,                -- 特殊効果発動タイミング ('ON_TURN_START', 'ON_ATTACK', 'ON_BEING_HIT' など)
    effect_visual_type TEXT,                 -- 演出エフェクト名 ('vfx_shield', 'vfx_bleed' など)
    description TEXT
);

-- E. クエスト・マスターデータ (放置派遣（遠征）用)
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    town_id TEXT REFERENCES quest_towns(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    course_type TEXT NOT NULL CHECK (course_type IN ('EASY', 'NORMAL', 'HARD')), -- 初級, 中級, 上級
    duration_seconds INT NOT NULL DEFAULT 3600, -- 派遣所要時間 (秒)
    cost_vitality INT NOT NULL DEFAULT 10,   -- 消費スタミナ
    reward_cash INT NOT NULL DEFAULT 100,    -- 獲得基本キャッシュ
    reward_items_pool JSONB,                 -- 報酬アイテムの抽選プール (例: [{"item_id": "ITEM_001", "chance": 0.5}, ...])
    description TEXT
);


-- ==========================================
-- 2. ユーザーデータ・テーブル群 (User Data)
-- ==========================================

-- A. ユーザープロファイル
CREATE TABLE users (
    id UUID PRIMARY KEY,                     -- Supabase Auth.users.id と連動
    username TEXT NOT NULL UNIQUE,
    gift_code TEXT UNIQUE,                   -- 招待用ギフトコード
    title_equipped TEXT,                     -- 装備中の通り名/称号
    equipped_background TEXT DEFAULT 'bg_default', -- 装備中の背景
    equipped_front_effect TEXT DEFAULT 'effect_none', -- 装備中の前面エフェクト
    cash BIGINT NOT NULL DEFAULT 1000,       -- ゲーム内通常通貨 (キャッシュ)
    neon_diamonds INT NOT NULL DEFAULT 0,    -- 課金通貨 (ダイヤ)
    vitality INT NOT NULL DEFAULT 100,       -- スタミナ (自然回復)
    vitality_max INT NOT NULL DEFAULT 100,
    vitality_last_recovered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    pvp_tickets INT NOT NULL DEFAULT 5,      -- アリーナ入場券
    pvp_tickets_max INT NOT NULL DEFAULT 5,
    pvp_tickets_last_recovered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    current_base_id TEXT REFERENCES bases(id) DEFAULT 'neon_tower' NOT NULL, -- 現在滞在拠点
    last_tribute_claimed_at TIMESTAMP WITH TIME ZONE, -- 最終みかじめ料獲得日時
    favorite_character_id UUID,              -- お気に入り(リーダー)キャラクターID (アバターの代わり)
    daily_cash_skips_count INT NOT NULL DEFAULT 0, -- キャッシュによる即時帰還回数 (1日3回制限用)
    last_cash_skip_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL, -- 最終キャッシュ即時帰還時間 (日付リセット判定用)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B. ギルド
CREATE TABLE guilds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    leader_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    level INT NOT NULL DEFAULT 1,
    xp INT NOT NULL DEFAULT 0,
    member_limit INT NOT NULL DEFAULT 10,    -- 初期10人、最大30人
    main_alignment TEXT CHECK (main_alignment IN ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS')),
    sub_alignment TEXT CHECK (sub_alignment IN ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- C. ギルドメンバー (中間関係)
CREATE TABLE guild_members (
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY, -- 1人1ギルド制限
    role TEXT NOT NULL CHECK (role IN ('MASTER', 'SUBMASTER', 'MEMBER')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ギルドマスターとユーザーの相互参照解消のためのFK遅延追加
ALTER TABLE users ADD CONSTRAINT fk_users_favorite_character FOREIGN KEY (favorite_character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- D. 所持キャラクター
CREATE TABLE user_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
    level INT NOT NULL DEFAULT 1 CHECK (level <= 100),
    awakening_level INT NOT NULL DEFAULT 0 CHECK (awakening_level <= 5), -- 覚醒+値 (最大+5)
    skill_slots INT NOT NULL DEFAULT 3 CHECK (skill_slots BETWEEN 3 AND 6), -- スキル枠 (初期3 -> 最大6)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (user_id, character_id)           -- 同一キャラの重複所持は不可
);

-- E. 所持スキルカード (デッキ用)
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    skill_card_id TEXT REFERENCES skill_cards(id) ON DELETE CASCADE NOT NULL,
    plus_val INT NOT NULL DEFAULT 0 CHECK (plus_val <= 10), -- 限界突破+値 (最大+10)
    equipped_character_id UUID REFERENCES user_characters(id) ON DELETE SET NULL, -- 装備先の所持キャラ
    slot_index INT CHECK (slot_index BETWEEN 0 AND 5), -- キャラクター内の装備スロット位置
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- F. 所持装備品 (個別ハクスラ管理)
CREATE TABLE user_equipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    equipment_id TEXT REFERENCES equipments(id) ON DELETE CASCADE NOT NULL,
    level INT NOT NULL DEFAULT 1 CHECK (level <= 50),
    plus_val INT NOT NULL DEFAULT 0 CHECK (plus_val <= 10), -- 限界突破+値 (最大+10)
    random_options JSONB DEFAULT '[]'::jsonb, -- ランダムに付与・解放されたサブオプション
    equipped_character_id UUID REFERENCES user_characters(id) ON DELETE SET NULL, -- 装備先の所持キャラ
    slot_index INT,                          -- 装備スロット位置 (武器0-1, 頭0, 胴0, 脚0, アクセ0-1)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- G. 所持素材アイテム (消耗素材管理)
CREATE TABLE user_items (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,                  -- 'TRAINING_MANUAL', 'POLISHING_STONE', 'LAW_OF_STRIFE' など
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, item_id)
);


-- ==========================================
-- 3. 抗争・戦闘データ・テーブル群 (Battle/GvG/Raid)
-- ==========================================

-- A. 拠点支配管理テーブル
CREATE TABLE guild_base_controls (
    base_id TEXT REFERENCES bases(id) ON DELETE CASCADE NOT NULL,
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE NOT NULL,
    daily_points INT NOT NULL DEFAULT 0,     -- その日の獲得支配ポイント (毎日集計・リセット)
    total_seasonal_days INT NOT NULL DEFAULT 0, -- シーズン中の累計支配日数
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (base_id, guild_id)
);

-- B. レイドボス状態管理テーブル (24時間非同期レイド用)
CREATE TABLE raid_bosses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_id TEXT REFERENCES bases(id) ON DELETE CASCADE NOT NULL,
    boss_name TEXT NOT NULL,
    max_hp BIGINT NOT NULL,
    current_hp BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'DEFEATED', 'FAILED')),
    spawned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 24時間カウントダウン用
    UNIQUE (base_id, status)                 -- 1拠点につきアクティブなボスは同時に1体のみ
);

-- C. レイドバトル個人・ギルド与ダメージログ (デイリーランキング用)
CREATE TABLE raid_damage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raid_boss_id UUID REFERENCES raid_bosses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    guild_id UUID REFERENCES guilds(id) ON DELETE SET NULL,
    damage_dealt BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- D. アリーナ（個人PvP）防衛デッキテーブル
CREATE TABLE pvp_defense_decks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    character_1_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    character_2_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    character_3_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- E. アリーナ・個人ランクポイント
CREATE TABLE pvp_ranks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    rank_points INT NOT NULL DEFAULT 1000,   -- 初期値1000
    daily_wins INT NOT NULL DEFAULT 0,       -- デイリー勝利数ランキング用 (毎日リセット)
    season_wins INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- F. バトルセッション (非同期バトルの状態改ざん防止検証用)
CREATE TABLE battle_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    battle_type TEXT NOT NULL CHECK (battle_type IN ('QUEST', 'ARENA', 'GVG', 'RAID')),
    target_id TEXT NOT NULL,                 -- クエストID、対戦相手ID、ボスIDなど
    player_state JSONB NOT NULL,             -- プレイヤーのHP、AP、手札、墓地等の状態
    enemy_state JSONB NOT NULL,              -- 敵NPC/防衛デッキの状態
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'VICTORY', 'DEFEAT', 'ABANDONED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ==========================================
-- 4. コミュニケーション ＆ トランザクション (Chat/Payment)
-- ==========================================

-- A. ゲーム内掲示板・ギルドチャット投稿
CREATE TABLE board_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar_character_id UUID REFERENCES characters(id) ON DELETE SET NULL, -- リーダーNPCアイコン
    content VARCHAR(140) NOT NULL,           -- 140文字制限
    target_type TEXT NOT NULL CHECK (target_type IN ('GLOBAL', 'BASE', 'GUILD', 'SHOWCASE')), -- チャンネル
    target_id TEXT,                          -- 拠点ID または ギルドID
    is_system BOOLEAN DEFAULT FALSE,         -- システム自動速報フラグ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B. Stripe決済トランザクション
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    stripe_session_id TEXT NOT NULL UNIQUE,  -- 冪等性チェック用
    amount INT NOT NULL,                     -- 購入金額
    currency TEXT NOT NULL DEFAULT 'jpy',
    diamonds_added INT NOT NULL,             -- 加算された有償ダイヤ
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ==========================================
-- 4.5. ゲーム進行 ＆ 告知データ群 (Missions/Presents/News)
-- ==========================================

-- A. ミッション・マスターデータ (拡張型)
CREATE TABLE missions (
    id VARCHAR(64) PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('DAILY', 'NORMAL')),
    title TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,              -- 'CHAR_LEVEL_UP', 'PVP_WIN', 'GUILD_JOIN', etc.
    target_value INT NOT NULL DEFAULT 1,
    condition_params JSONB,                  -- パラメータ駆動評価用（例: {"character_id": "rui"}）
    reward_item_id TEXT NOT NULL,            -- 報酬アイテムID
    reward_quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- B. ユーザーミッション進捗
CREATE TABLE user_missions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    mission_id VARCHAR(64) REFERENCES missions(id) ON DELETE CASCADE NOT NULL,
    current_progress INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('PROGRESS', 'CLEAR', 'CLAIMED')) DEFAULT 'PROGRESS',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, mission_id)
);

-- B.5. ユーザー招待履歴
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inviter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,                         -- 招待した側（コード所有者）
    invitee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,                  -- 招待された側（新規ユーザー）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- C. プレゼントボックス
CREATE TABLE presents (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    message TEXT,
    status TEXT NOT NULL CHECK (status IN ('UNCLAIMED', 'CLAIMED', 'EXPIRED')) DEFAULT 'UNCLAIMED',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE
);

-- D. お知らせ・マスターデータ
CREATE TABLE news (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('IMPORTANT', 'EVENT', 'INFO')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    link_url TEXT,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- E. ユーザーお知らせ既読
CREATE TABLE user_news_reads (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    news_id BIGINT REFERENCES news(id) ON DELETE CASCADE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, news_id)
);

-- F. ユーザー派遣（遠征）ステータス管理
CREATE TABLE user_expeditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE NOT NULL, -- 派遣先コース
    character_1_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    character_2_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    character_3_id UUID REFERENCES user_characters(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,                  -- 帰還予定時刻
    status TEXT NOT NULL CHECK (status IN ('ONGOING', 'CLAIMABLE', 'COMPLETED')) DEFAULT 'ONGOING',
    rewards_accrued JSONB DEFAULT '[]'::jsonb,                      -- 派遣中の獲得ログ＆報酬履歴
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ==========================================
-- 4.6. ストアドファンクション (PL/pgSQL)
-- ==========================================

-- 1. ログイン時一括同期 (プリフェッチ)
CREATE OR REPLACE FUNCTION get_bootstrap_sync_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_profile JSONB;
    v_unclaimed_presents_count INT;
    v_active_news JSONB;
    v_active_expedition JSONB;
    v_result JSONB;
    v_now TIMESTAMP WITH TIME ZONE;
    v_guild_id UUID;
    v_controlling_bases_count INT;
    v_last_tribute TIMESTAMP WITH TIME ZONE;
    v_tribute_amount INT;
    v_tribute_message TEXT;
    v_reset_boundary TIMESTAMP WITH TIME ZONE;
BEGIN
    v_now := NOW();
    
    SELECT guild_id INTO v_guild_id FROM guild_members WHERE user_id = p_user_id;
    
    IF v_guild_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_controlling_bases_count
        FROM (
            SELECT DISTINCT ON (base_id) base_id, guild_id
            FROM guild_base_controls
            ORDER BY base_id, daily_points DESC
        ) t
        WHERE t.guild_id = v_guild_id;

        IF v_controlling_bases_count > 0 THEN
            SELECT last_tribute_claimed_at INTO v_last_tribute FROM users WHERE id = p_user_id;
            
            v_reset_boundary := date_trunc('day', v_now) + INTERVAL '4 hours';
            IF v_now < v_reset_boundary THEN
                v_reset_boundary := v_reset_boundary - INTERVAL '1 day';
            END IF;
            
            IF v_last_tribute IS NULL OR v_last_tribute < v_reset_boundary THEN
                v_tribute_amount := v_controlling_bases_count * 10000;
                v_tribute_message := '制圧みかじめ料: 支配拠点数 ' || v_controlling_bases_count::TEXT || ' 箇所';
                
                INSERT INTO presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
                VALUES (p_user_id, 'CASH', v_tribute_amount, v_tribute_message, 'UNCLAIMED', v_now, v_now + INTERVAL '30 days');
                
                UPDATE users SET last_tribute_claimed_at = v_now WHERE id = p_user_id;
            END IF;
        END IF;
    END IF;

    -- A. ユーザープロファイル
    SELECT to_jsonb(u) INTO v_user_profile FROM users u WHERE u.id = p_user_id;
    
    -- B. 未受取プレゼント数
    SELECT COALESCE(COUNT(*), 0) INTO v_unclaimed_presents_count 
    FROM presents WHERE user_id = p_user_id AND status = 'UNCLAIMED';
    
    -- C. 有効期間内のお知らせ一覧
    SELECT COALESCE(jsonb_agg(to_jsonb(n)), '[]'::jsonb) INTO v_active_news
    FROM (
        SELECT news.id, news.category, news.title, news.created_at,
               EXISTS(SELECT 1 FROM user_news_reads r WHERE r.user_id = p_user_id AND r.news_id = news.id) AS is_read
        FROM news
        WHERE NOW() BETWEEN news.start_at AND news.end_at
        ORDER BY news.created_at DESC
        LIMIT 10
    ) n;

    -- D. 進行中の派遣
    SELECT to_jsonb(e) INTO v_active_expedition
    FROM user_expeditions e
    WHERE e.user_id = p_user_id AND e.status IN ('ONGOING', 'CLAIMABLE')
    LIMIT 1;

    -- E. マージして返却
    v_result := jsonb_build_object(
        'user_profile', v_user_profile,
        'unclaimed_presents_count', v_unclaimed_presents_count,
        'active_news', v_active_news,
        'active_expedition', COALESCE(v_active_expedition, 'null'::jsonb)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. 派遣即時帰還 (時短完了)
CREATE OR REPLACE FUNCTION complete_expedition_instantly(
    p_user_id UUID,
    p_expedition_id UUID,
    p_use_currency TEXT -- 'CASH' or 'DIAMOND'
)
RETURNS JSONB AS $$
DECLARE
    v_expedition RECORD;
    v_quest RECORD;
    v_user RECORD;
    v_seconds_left INT;
    v_cost INT;
    v_rewards JSONB;
    v_rewards_accrued JSONB;
    v_result JSONB;
    v_now TIMESTAMP WITH TIME ZONE;
    v_luk_sum INT := 0;
    v_match_count INT := 0;
    v_chance_bonus DOUBLE PRECISION := 0.0;
    v_cash_bonus INT := 0;
    v_char_id UUID;
    v_c_rec RECORD;
BEGIN
    v_now := NOW();
    
    -- A. 派遣データの取得と検証
    SELECT * INTO v_expedition FROM user_expeditions WHERE id = p_expedition_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION '指定された派遣データが見つかりません。';
    END IF;
    
    IF v_expedition.status != 'ONGOING' THEN
        RAISE EXCEPTION '派遣はすでに完了しているか、帰還準備が整っています。';
    END IF;
    
    -- B. クエストマスターとユーザー情報の取得
    SELECT * INTO v_quest FROM quests WHERE id = v_expedition.quest_id;
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    
    -- C. 残り時間とコストの計算
    v_seconds_left := EXTRACT(EPOCH FROM (v_expedition.expires_at - v_now))::INT;
    IF v_seconds_left <= 0 THEN
        v_seconds_left := 0;
    END IF;
    
    IF p_use_currency = 'CASH' THEN
        v_cost := CEIL(v_seconds_left / 60.0)::INT * 100;
        
        -- 回数制限のチェック
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
            RAISE EXCEPTION 'キャッシュによる即時帰還は本日すでに3回実行されています。';
        END IF;
        
        IF v_user.cash < v_cost THEN
            RAISE EXCEPTION 'キャッシュが不足しています。必要: %, 所持: %', v_cost, v_user.cash;
        END IF;
        
        UPDATE users 
        SET cash = cash - v_cost,
            daily_cash_skips_count = daily_cash_skips_count + 1,
            last_cash_skip_at = v_now
        WHERE id = p_user_id;
        
    ELSIF p_use_currency = 'DIAMOND' THEN
        v_cost := CEIL(v_seconds_left / 3600.0)::INT * 10;
        
        IF v_user.neon_diamonds < v_cost THEN
            RAISE EXCEPTION 'ダイヤが不足しています。必要: %, 所持: %', v_cost, v_user.neon_diamonds;
        END IF;
        
        UPDATE users SET neon_diamonds = neon_diamonds - v_cost WHERE id = p_user_id;
    ELSE
        RAISE EXCEPTION '無効な通貨タイプです。';
    END IF;
    
    -- D. 地元一致ボーナスの計算
    FOR v_char_id IN SELECT unnest(ARRAY[v_expedition.character_1_id, v_expedition.character_2_id, v_expedition.character_3_id]) LOOP
        IF v_char_id IS NOT NULL THEN
            SELECT uc.*, c.home_town, c.base_luk INTO v_c_rec 
            FROM user_characters uc 
            JOIN characters c ON uc.character_id = c.id
            WHERE uc.id = v_char_id;
            
            IF FOUND AND v_c_rec.home_town = v_quest.town_id THEN
                v_luk_sum := v_luk_sum + v_c_rec.base_luk;
                v_match_count := v_match_count + 1;
            END IF;
        END IF;
    END LOOP;

    IF v_match_count > 0 THEN
        v_chance_bonus := v_luk_sum * 0.001;
        v_cash_bonus := v_luk_sum * 10;
    END IF;

    -- E. 報酬の決定
    DECLARE
        v_random_val DOUBLE PRECISION;
        v_reward_item_id TEXT := NULL;
        v_reward_qty INT := 0;
        v_pool RECORD;
        v_chance DOUBLE PRECISION;
    BEGIN
        v_random_val := random();
        IF v_quest.reward_items_pool IS NOT NULL AND jsonb_array_length(v_quest.reward_items_pool) > 0 THEN
            FOR v_pool IN SELECT * FROM jsonb_to_recordset(v_quest.reward_items_pool) AS (item_id TEXT, chance DOUBLE PRECISION) LOOP
                v_chance := v_pool.chance + v_chance_bonus;
                IF v_random_val <= v_chance THEN
                    v_reward_item_id := v_pool.item_id;
                    v_reward_qty := 1;
                    EXIT;
                END IF;
            END LOOP;
        END IF;
        
        v_rewards_accrued := jsonb_build_array(
            jsonb_build_object(
                'time', to_char(v_now, 'HH24:MI'),
                'log', '派遣任務を手早く済ませ、帰還の準備を整えた。',
                'reward_cash', v_quest.reward_cash + v_cash_bonus,
                'reward_item_id', COALESCE(v_reward_item_id, ''),
                'reward_quantity', v_reward_qty,
                'luk_bonus_applied', v_match_count > 0,
                'bonus_cash', v_cash_bonus,
                'bonus_chance_pct', v_chance_bonus * 100.0
            )
        );
    END;

    UPDATE user_expeditions 
    SET expires_at = v_now,
        status = 'CLAIMABLE',
        rewards_accrued = v_rewards_accrued
    WHERE id = p_expedition_id;
    
    v_result := jsonb_build_object(
        'status', 'success',
        'cost_paid', v_cost,
        'currency_used', p_use_currency,
        'rewards', v_rewards_accrued
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. ミッション進捗評価 ＆ 加算
CREATE OR REPLACE FUNCTION evaluate_mission_progress(
    p_user_id UUID,
    p_trigger_type TEXT,
    p_progress_increment INT,
    p_params JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_mission RECORD;
    v_match BOOLEAN;
    v_param_key TEXT;
    v_param_val JSONB;
BEGIN
    FOR v_mission IN 
        SELECT um.*, m.target_value, m.condition_params
        FROM user_missions um
        JOIN missions m ON um.mission_id = m.id
        WHERE um.user_id = p_user_id AND um.status = 'PROGRESS' AND m.trigger_type = p_trigger_type
    LOOP
        v_match := TRUE;
        
        -- 条件パラメータ（condition_params）の評価
        IF v_mission.condition_params IS NOT NULL AND jsonb_object_keys(v_mission.condition_params) IS NOT NULL THEN
            FOR v_param_key IN SELECT jsonb_object_keys(v_mission.condition_params) LOOP
                v_param_val := v_mission.condition_params->v_param_key;
                
                IF p_params IS NULL OR NOT (p_params ? v_param_key) OR (p_params->v_param_key != v_param_val) THEN
                    v_match := FALSE;
                    EXIT;
                END IF;
            END LOOP;
        END IF;
        
        -- 条件が合致した場合のみ進捗を加算
        IF v_match THEN
            UPDATE user_missions
            SET current_progress = LEAST(current_progress + p_progress_increment, v_mission.target_value),
                status = CASE 
                    WHEN current_progress + p_progress_increment >= v_mission.target_value THEN 'CLEAR'::TEXT
                    ELSE 'PROGRESS'::TEXT
                END,
                updated_at = NOW()
            WHERE user_id = p_user_id AND mission_id = v_mission.mission_id;
        END IF;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 5. インデックス設計 (パフォーマンス最適化)
-- ==========================================

CREATE INDEX idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX idx_user_characters_user ON user_characters(user_id);
CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_user_skills_equipped ON user_skills(equipped_character_id);
CREATE INDEX idx_user_equipments_user ON user_equipments(user_id);
CREATE INDEX idx_user_equipments_equipped ON user_equipments(equipped_character_id);
CREATE INDEX idx_user_items_user ON user_items(user_id);
CREATE INDEX idx_guild_base_controls_points ON guild_base_controls(daily_points DESC);
CREATE INDEX idx_raid_damage_logs_boss ON raid_damage_logs(raid_boss_id);
CREATE INDEX idx_board_posts_target ON board_posts(target_type, target_id);
CREATE INDEX idx_pvp_ranks_points ON pvp_ranks(rank_points DESC);

CREATE INDEX idx_user_missions_user ON user_missions(user_id);
CREATE INDEX idx_presents_user ON presents(user_id, status);
CREATE INDEX idx_news_period ON news(start_at, end_at);
CREATE INDEX idx_user_news_reads_user ON user_news_reads(user_id);

CREATE INDEX idx_user_expeditions_active ON user_expeditions(user_id) WHERE status = 'ONGOING';
CREATE INDEX idx_user_invitations_inviter ON user_invitations(inviter_id);


-- ==========================================
-- 6. ギフトコード ＆ ユーザー初期化 ストアドファンクション
-- ==========================================

-- ランダムな8文字の英数字を生成するヘルパー関数
CREATE OR REPLACE FUNCTION generate_gift_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ユーザー個別ギフトコード発行関数
CREATE OR REPLACE FUNCTION generate_user_gift_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    -- すでにコードがあるかチェック
    SELECT gift_code INTO v_code FROM users WHERE id = p_user_id;
    IF v_code IS NOT NULL AND v_code <> '' THEN
        RETURN v_code;
    END IF;

    -- 重複しないコードができるまでループ
    LOOP
        v_code := generate_gift_code();
        SELECT EXISTS(SELECT 1 FROM users WHERE gift_code = v_code) INTO v_exists;
        IF NOT v_exists THEN
            EXIT;
        END IF;
    END LOOP;

    -- 登録
    UPDATE users SET gift_code = v_code WHERE id = p_user_id;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新規ユーザー初期化処理（招待コード検証 ＆ 報酬付与を含む）
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

-- ==========================================
-- 7. ユーザー総合力ランキングテーブルの追加
-- ==========================================

CREATE TABLE user_power_rankings (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    current_power INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_user_power_rankings_current ON user_power_rankings(current_power DESC);
CREATE INDEX idx_user_power_rankings_updated ON user_power_rankings(updated_at DESC);

-- 総合力デイリーリセット（本日アクティブから全ユーザーを除外）
CREATE OR REPLACE FUNCTION reset_daily_power_rankings() RETURNS VOID AS $$
BEGIN
    UPDATE user_power_rankings SET updated_at = NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- 総合力シーズンリセット（全ユーザーの更新日時を初期化）
CREATE OR REPLACE FUNCTION reset_seasonal_power_rankings() RETURNS VOID AS $$
BEGIN
    UPDATE user_power_rankings SET updated_at = '1970-01-01 00:00:00+00';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. アバター関連テーブルおよび初期シードの追加
-- ==========================================

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

CREATE TABLE IF NOT EXISTS user_avatar_parts (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    part_id TEXT REFERENCES avatar_parts(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, part_id)
);

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

CREATE INDEX IF NOT EXISTS idx_user_avatar_parts_user ON user_avatar_parts(user_id);

INSERT INTO avatar_parts (id, name, part_type, image_path, price_cash, price_diamond) VALUES
('base_male', '男性素体', 'BODY', '/avatar/base_male.webp', 0, 0),
('base_female', '女性素体', 'BODY', '/avatar/base_female.webp', 0, 0),
('body_basic', 'ベーシックアパレル', 'BODY', '/avatar/body_basic.webp', 0, 0),
('face_male_standard', '通常 (男)', 'FACE', '/avatar/face_male_standard.webp', 0, 0),
('face_male_smirk', '不敵 (男)', 'FACE', '/avatar/face_male_smirk.webp', 0, 0),
('face_male_angry', '怒り (男)', 'FACE', '/avatar/face_male_angry.webp', 0, 0),
('face_male_smile', '笑顔 (男)', 'FACE', '/avatar/face_male_smile.webp', 0, 0),
('face_female_standard', '通常 (女)', 'FACE', '/avatar/face_female_standard.webp', 0, 0),
('face_female_smirk', '不敵 (女)', 'FACE', '/avatar/face_female_smirk.webp', 0, 0),
('face_female_angry', '怒り (女)', 'FACE', '/avatar/face_female_angry.webp', 0, 0),
('face_female_smile', '笑顔 (女)', 'FACE', '/avatar/face_female_smile.webp', 0, 0),
('hair_male_spiky', 'ツンツン (男)', 'HAIR', '/avatar/hair_male_spiky.webp', 0, 0),
('hair_male_short', 'ショート (男)', 'HAIR', '/avatar/hair_male_short.webp', 0, 0),
('hair_male_wavy', 'ウエーブ (男)', 'HAIR', '/avatar/hair_male_wavy.webp', 0, 0),
('hair_male_long', 'ロング (男)', 'HAIR', '/avatar/hair_male_long.webp', 0, 0),
('hair_female_spiky', 'ツンツン (女)', 'HAIR', '/avatar/hair_female_spiky.webp', 0, 0),
('hair_female_short', 'ショート (女)', 'HAIR', '/avatar/hair_female_short.webp', 0, 0),
('hair_female_wavy', 'ウエーブ (女)', 'HAIR', '/avatar/hair_female_wavy.webp', 0, 0),
('hair_female_long', 'ロング (女)', 'HAIR', '/avatar/hair_female_long.webp', 0, 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    part_type = EXCLUDED.part_type,
    image_path = EXCLUDED.image_path;


-- ====================================================================
-- TRIBE: NEON REIGN - BBS機能（スレッド式掲示板）用定義
-- ====================================================================
CREATE TABLE IF NOT EXISTS bbs_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL CHECK (category IN ('RECRUIT', 'STRATEGY_CHAT')),
    title VARCHAR(50) NOT NULL,
    content VARCHAR(200) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS bbs_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES bbs_threads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar_url TEXT,
    content VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bbs_threads_category_updated ON bbs_threads(category, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_bbs_posts_thread_created ON bbs_posts(thread_id, created_at ASC);

CREATE OR REPLACE FUNCTION update_bbs_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bbs_threads
    SET updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_bbs_thread_timestamp ON bbs_posts;
CREATE TRIGGER trg_update_bbs_thread_timestamp
AFTER INSERT ON bbs_posts
FOR EACH ROW
EXECUTE FUNCTION update_bbs_thread_timestamp();


-- ====================================================================
-- TRIBE: NEON REIGN - レイドシステム追加定義 (ボス・報酬マスタ・同期関数)
-- ====================================================================

-- 1. レイドボスエネミーマスタ
CREATE TABLE IF NOT EXISTS raid_boss_master (
    id TEXT PRIMARY KEY,                     -- 'BOSS_001' 等
    boss_name TEXT NOT NULL,
    level INT NOT NULL DEFAULT 1,
    max_hp BIGINT NOT NULL DEFAULT 1000000,
    atk INT NOT NULL DEFAULT 100,
    def INT NOT NULL DEFAULT 100,
    spd INT NOT NULL DEFAULT 100,
    luk INT NOT NULL DEFAULT 10,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb, -- スキルカード構造体の配列
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 既存の raid_bosses テーブルに外部キーを追加
ALTER TABLE raid_bosses ADD COLUMN IF NOT EXISTS boss_master_id TEXT REFERENCES raid_boss_master(id) ON DELETE SET NULL;

-- 3. レイド報酬マスタ
CREATE TABLE IF NOT EXISTS raid_rewards_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_type TEXT NOT NULL CHECK (reward_type IN ('DEFEAT', 'DAMAGE_ACCUM', 'RANK_PERSONAL', 'RANK_GUILD')),
    threshold_val BIGINT NOT NULL DEFAULT 0,    -- 順位(1~)、または累積ダメージ(100,000~)
    reward_item_id TEXT NOT NULL,               -- 'DIAMOND', 'CASH', 'GACHA_TICKET' 等
    reward_quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. 累積ダメージ報酬の受け取り済記録
CREATE TABLE IF NOT EXISTS user_raid_claimed_rewards (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reward_id UUID REFERENCES raid_rewards_master(id) ON DELETE CASCADE NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, reward_id)
);

-- 初期シードデータ
INSERT INTO raid_boss_master (id, boss_name, level, max_hp, atk, def, spd, luk, skills) VALUES
('BOSS_001', '極道連合組長', 99, 9999999, 250, 150, 100, 5, '[{"id":"e_boss_atk","name":"新宿壊滅撃","ap_cost":2,"power":180,"effect_type":"ATTACK"},{"id":"e_boss_def","name":"防弾プロテクト","ap_cost":1,"power":80,"effect_type":"DEFENSE"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    boss_name = EXCLUDED.boss_name,
    level = EXCLUDED.level,
    max_hp = EXCLUDED.max_hp,
    atk = EXCLUDED.atk,
    def = EXCLUDED.def,
    spd = EXCLUDED.spd,
    luk = EXCLUDED.luk,
    skills = EXCLUDED.skills;

-- デフォルトのボスにマスタを紐付ける (既存のボスレコードの更新)
UPDATE raid_bosses SET boss_master_id = 'BOSS_001' WHERE id = '88888888-8888-8888-8888-888888888888';

-- レイド報酬マスタの初期シードデータ
INSERT INTO raid_rewards_master (reward_type, threshold_val, reward_item_id, reward_quantity) VALUES
('DEFEAT', 50000, 'DIAMOND', 50),
('DEFEAT', 50000, 'CASH', 3000),
('DAMAGE_ACCUM', 100000, 'DIAMOND', 100),
('DAMAGE_ACCUM', 500000, 'DIAMOND', 150),
('DAMAGE_ACCUM', 1000000, 'DIAMOND', 250),
('RANK_PERSONAL', 1, 'DIAMOND', 1000),
('RANK_PERSONAL', 2, 'DIAMOND', 500),
('RANK_PERSONAL', 3, 'DIAMOND', 500),
('RANK_PERSONAL', 10, 'DIAMOND', 300),
('RANK_GUILD', 1, 'DIAMOND', 300),
('RANK_GUILD', 2, 'DIAMOND', 150),
('RANK_GUILD', 3, 'DIAMOND', 150)
ON CONFLICT DO NOTHING;

-- 5. レイドボス同期および時間切れ自動復活・配置関数
CREATE OR REPLACE FUNCTION sync_and_evaluate_raid_timeout(p_raid_boss_id UUID)
RETURNS TABLE(out_current_hp BIGINT, out_max_hp BIGINT, out_seconds_left INT, out_base_id TEXT, out_boss_name TEXT, out_boss_master_id TEXT) AS $$
DECLARE
    v_current_hp BIGINT;
    v_max_hp BIGINT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_base_id TEXT;
    v_boss_name TEXT;
    v_boss_master_id TEXT;
    v_seconds_left INT;
    v_random_base_id TEXT;
BEGIN
    -- ボス情報とマスタ情報の結合取得
    SELECT rb.current_hp, m.max_hp, rb.expires_at, rb.base_id, m.boss_name, rb.boss_master_id
    INTO v_current_hp, v_max_hp, v_expires_at, v_base_id, v_boss_name, v_boss_master_id
    FROM raid_bosses rb
    JOIN raid_boss_master m ON rb.boss_master_id = m.id
    WHERE rb.id = p_raid_boss_id;
    
    -- 期限切れ判定
    IF v_expires_at IS NOT NULL AND v_expires_at <= NOW() THEN
        -- 4拠点（bases）からランダムに1拠点を選択
        SELECT id INTO v_random_base_id FROM bases ORDER BY RANDOM() LIMIT 1;
        
        -- ボスの全快と期限の24時間延長、出現拠点の変更
        UPDATE raid_bosses
        SET current_hp = v_max_hp,
            status = 'ACTIVE',
            spawned_at = NOW(),
            expires_at = NOW() + INTERVAL '24 hours',
            base_id = v_random_base_id
        WHERE id = p_raid_boss_id
        RETURNING current_hp, expires_at, base_id INTO v_current_hp, v_expires_at, v_base_id;
        
        -- 与ダメージログの削除
        DELETE FROM raid_damage_logs WHERE raid_boss_id = p_raid_boss_id;
        
        -- 累積ダメージ報酬の受け取り記録もボスリセットに併せて削除する
        DELETE FROM user_raid_claimed_rewards;
    END IF;
    
    -- 残り秒数の計算
    v_seconds_left := EXTRACT(EPOCH FROM (v_expires_at - NOW()))::INT;
    IF v_seconds_left < 0 THEN
        v_seconds_left := 0;
    END IF;
    
    RETURN QUERY SELECT v_current_hp, v_max_hp, v_seconds_left, v_base_id, v_boss_name, v_boss_master_id;
END;
$$ LANGUAGE plpgsql;

-- 限界突破マスタテーブルの定義
CREATE TABLE IF NOT EXISTS skill_limit_break_master (
    plus_val INT NOT NULL,                          -- 現在の限界突破段階 (+0〜+10)
    is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,    -- 専用スキルであるか
    required_cash INT NOT NULL DEFAULT 0,          -- 限界突破に必要なキャッシュ
    required_item_id TEXT,                          -- 必要な消費素材アイテムID (TRAINING_MANUAL / EXCLUSIVE_CONTRACT)
    required_item_qty INT NOT NULL DEFAULT 0,       -- 必要な消費素材の個数
    power_multiplier NUMERIC NOT NULL DEFAULT 1.0,  -- この段階での威力倍率補正
    PRIMARY KEY (plus_val, is_exclusive)
);

-- シードデータの投入
INSERT INTO skill_limit_break_master (plus_val, is_exclusive, required_cash, required_item_id, required_item_qty, power_multiplier) VALUES
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

-- ==========================================
-- H. 装備強化・限界突破マスタ ＆ 新規装備品データ
-- ==========================================

CREATE TABLE IF NOT EXISTS equipment_level_up_master (
    level INT PRIMARY KEY,
    required_cash INT NOT NULL,
    required_item_id TEXT NOT NULL,
    required_item_qty INT NOT NULL
);

CREATE TABLE IF NOT EXISTS equipment_limit_break_master (
    plus_val INT PRIMARY KEY,
    required_cash INT NOT NULL,
    required_item_qty INT NOT NULL
);

-- シードデータの投入 (1〜49レベル用、cost = level * 40)
DO $$
BEGIN
    FOR i IN 1..49 LOOP
        INSERT INTO equipment_level_up_master (level, required_cash, required_item_id, required_item_qty)
        VALUES (i, i * 40, 'POLISHING_STONE', 1)
        ON CONFLICT (level) DO UPDATE
        SET required_cash = EXCLUDED.required_cash,
            required_item_id = EXCLUDED.required_item_id,
            required_item_qty = EXCLUDED.required_item_qty;
    END LOOP;
END $$;

-- シードデータの投入 (0〜9限界突破段階用、cost = (plus_val + 1) * 2000)
DO $$
BEGIN
    FOR i IN 0..9 LOOP
        INSERT INTO equipment_limit_break_master (plus_val, required_cash, required_item_qty)
        VALUES (i, (i + 1) * 2000, 1)
        ON CONFLICT (plus_val) DO UPDATE
        SET required_cash = EXCLUDED.required_cash,
            required_item_qty = EXCLUDED.required_item_qty;
    END LOOP;
END $$;

-- 新規SSR装備品（LEGS_021、ACCESSORY_051）の登録
INSERT INTO equipments (id, name, slot_type, rarity, base_atk, base_def, base_hp, base_spd, base_luk, is_exclusive, exclusive_character_id, description)
VALUES 
('LEGS_021', 'シャドウランナー', 'LEGS', 'SSR', 0, 8, 200, 15, 0, FALSE, NULL, '軽量極まる特殊チタンソールと強化ナイロンを編み込んだハイスペックシューズ。路地裏を風のように駆け抜ける。'),
('ACCESSORY_051', '福呼びの守り', 'ACCESSORY', 'SSR', 0, 0, 100, 0, 25, FALSE, NULL, '古い裏社会の構成員から譲り受けた、銃弾を弾くと言われる幸運のお守り。鈍く輝く金属の縁取り。')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slot_type = EXCLUDED.slot_type,
    rarity = EXCLUDED.rarity,
    base_atk = EXCLUDED.base_atk,
    base_def = EXCLUDED.base_def,
    base_hp = EXCLUDED.base_hp,
    base_spd = EXCLUDED.base_spd,
    base_luk = EXCLUDED.base_luk,
    description = EXCLUDED.description;


-- 装備一括解除 RPC (unequip_gear_bulk)
CREATE OR REPLACE FUNCTION unequip_gear_bulk(
    p_user_id UUID,
    p_character_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE user_equipments
    SET equipped_character_id = NULL, slot_index = NULL
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 装備一括装着 RPC (equip_gear_bulk)
CREATE OR REPLACE FUNCTION equip_gear_bulk(
    p_user_id UUID,
    p_character_id UUID,
    p_equipment_uuids UUID[],
    p_slot_indexes INT[]
) RETURNS VOID AS $$
DECLARE
    i INT;
    v_char_exists BOOLEAN;
    v_eq_record RECORD;
BEGIN
    -- キャラクター所有権チェック
    SELECT EXISTS (
        SELECT 1 FROM user_characters 
        WHERE id = p_character_id AND user_id = p_user_id
    ) INTO v_char_exists;
    
    IF NOT v_char_exists THEN
        RAISE EXCEPTION 'Character does not exist or access denied.';
    END IF;
    
    -- 該当キャラクターの現在の装備をすべて解除
    UPDATE user_equipments
    SET equipped_character_id = NULL, slot_index = NULL
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;

    -- 配列サイズチェック
    IF array_length(p_equipment_uuids, 1) IS NULL OR array_length(p_equipment_uuids, 1) != array_length(p_slot_indexes, 1) THEN
        RAISE EXCEPTION 'Invalid parameters: array length mismatch.';
    END IF;

    -- ループ処理で装備
    FOR i IN 1 .. array_length(p_equipment_uuids, 1) LOOP
        -- 装備の所有権および専用装備の適合チェック
        SELECT ue.user_id, eq.is_exclusive, eq.exclusive_character_id, uc.character_id AS target_char_id
        INTO v_eq_record
        FROM user_equipments ue
        JOIN equipments eq ON ue.equipment_id = eq.id
        CROSS JOIN user_characters uc
        WHERE ue.id = p_equipment_uuids[i] AND uc.id = p_character_id;

        IF v_eq_record.user_id IS NULL OR v_eq_record.user_id != p_user_id THEN
            RAISE EXCEPTION 'Equipment does not exist or access denied.';
        END IF;

        IF v_eq_record.is_exclusive AND v_eq_record.exclusive_character_id IS NOT NULL AND v_eq_record.exclusive_character_id != v_eq_record.target_char_id THEN
            RAISE EXCEPTION 'Equipment is exclusive and cannot be equipped by this character.';
        END IF;

        -- 他のキャラクターが現在装備している場合は外す
        UPDATE user_equipments
        SET equipped_character_id = NULL, slot_index = NULL
        WHERE id = p_equipment_uuids[i];

        -- 新たに装備
        UPDATE user_equipments
        SET equipped_character_id = p_character_id, slot_index = p_slot_indexes[i]
        WHERE id = p_equipment_uuids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 装備一括売却 RPC (sell_gear_bulk)
CREATE OR REPLACE FUNCTION sell_gear_bulk(
    p_user_id UUID,
    p_equipment_ids UUID[]
) RETURNS INT AS $$
DECLARE
    v_total_cash INT := 0;
    v_cash_gain INT;
    v_eq_count INT;
    v_eq_record RECORD;
    v_base_price INT;
    i INT;
BEGIN
    v_eq_count := array_length(p_equipment_ids, 1);
    IF v_eq_count IS NULL OR v_eq_count = 0 THEN
        RETURN 0;
    END IF;

    FOR i IN 1 .. v_eq_count LOOP
        -- 装備の存在、所有権、未装備状態のチェック
        SELECT ue.equipped_character_id, ue.level, ue.plus_val, eq.rarity, ue.user_id
        INTO v_eq_record
        FROM user_equipments ue
        JOIN equipments eq ON ue.equipment_id = eq.id
        WHERE ue.id = p_equipment_ids[i];

        IF v_eq_record.user_id IS NULL OR v_eq_record.user_id != p_user_id THEN
            RAISE EXCEPTION 'Equipment does not exist or access denied.';
        END IF;

        IF v_eq_record.equipped_character_id IS NOT NULL THEN
            RAISE EXCEPTION 'Cannot sell equipped items.';
        END IF;

        -- レアリティ別ベース価格算出
        IF v_eq_record.rarity = 'SSR' THEN
            v_base_price := 10000;
        ELSIF v_eq_record.rarity = 'SR' THEN
            v_base_price := 2000;
        ELSIF v_eq_record.rarity = 'R' THEN
            v_base_price := 500;
        ELSE
            v_base_price := 100;
        END IF;

        v_cash_gain := v_base_price + (v_eq_record.level - 1) * 50 + v_eq_record.plus_val * 1000;
        v_total_cash := v_total_cash + v_cash_gain;

        -- 削除
        DELETE FROM user_equipments WHERE id = p_equipment_ids[i];
    END LOOP;

    -- キャッシュをユーザーに加算
    UPDATE users
    SET cash = cash + v_total_cash
    WHERE id = p_user_id;

    RETURN v_total_cash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- スキル一括解除 RPC (unequip_skill_bulk)
CREATE OR REPLACE FUNCTION unequip_skill_bulk(
    p_user_id UUID,
    p_character_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE user_skills
    SET equipped_character_id = NULL, slot_index = NULL
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- スキル一括装着 RPC (equip_skill_bulk)
CREATE OR REPLACE FUNCTION equip_skill_bulk(
    p_user_id UUID,
    p_character_id UUID,
    p_skill_uuids UUID[],
    p_slot_indexes INT[]
) RETURNS VOID AS $$
DECLARE
    i INT;
    v_char_exists BOOLEAN;
    v_sk_record RECORD;
BEGIN
    -- キャラクター所有権チェック
    SELECT EXISTS (
        SELECT 1 FROM user_characters 
        WHERE id = p_character_id AND user_id = p_user_id
    ) INTO v_char_exists;
    
    IF NOT v_char_exists THEN
        RAISE EXCEPTION 'Character does not exist or access denied.';
    END IF;
    
    -- 該当キャラクターの現在のスキルをすべて解除
    UPDATE user_skills
    SET equipped_character_id = NULL, slot_index = NULL
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;

    -- 配列サイズチェック
    IF array_length(p_skill_uuids, 1) IS NULL OR array_length(p_skill_uuids, 1) != array_length(p_slot_indexes, 1) THEN
        RAISE EXCEPTION 'Invalid parameters: array length mismatch.';
    END IF;

    -- ループ処理で装着
    FOR i IN 1 .. array_length(p_skill_uuids, 1) LOOP
        -- スキルの所有権および専用スキルの適合チェック
        SELECT us.user_id, sk.is_exclusive, sk.exclusive_character_id, uc.character_id AS target_char_id
        INTO v_sk_record
        FROM user_skills us
        JOIN skill_cards sk ON us.skill_card_id = sk.id
        CROSS JOIN user_characters uc
        WHERE us.id = p_skill_uuids[i] AND uc.id = p_character_id;

        IF v_sk_record.user_id IS NULL OR v_sk_record.user_id != p_user_id THEN
            RAISE EXCEPTION 'Skill card does not exist or access denied.';
        END IF;

        IF v_sk_record.is_exclusive AND v_sk_record.exclusive_character_id IS NOT NULL AND v_sk_record.exclusive_character_id != v_sk_record.target_char_id THEN
            RAISE EXCEPTION 'Skill card is exclusive and cannot be equipped by this character.';
        END IF;

        -- 他のキャラクターが現在装備している場合は外す
        UPDATE user_skills
        SET equipped_character_id = NULL, slot_index = NULL
        WHERE id = p_skill_uuids[i];

        -- 新たに装着
        UPDATE user_skills
        SET equipped_character_id = p_character_id, slot_index = p_slot_indexes[i]
        WHERE id = p_skill_uuids[i];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 7. ガチャ天井マスタ ＆ 友達・助っ人システム テーブル
-- ===================================================================

CREATE TABLE IF NOT EXISTS gacha_pity_masters (
    id TEXT PRIMARY KEY,
    gacha_id TEXT NOT NULL,
    pity_threshold INT NOT NULL DEFAULT 200,
    currency_name TEXT NOT NULL DEFAULT 'ガチャPt',
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gacha_exchange_items_master (
    id TEXT PRIMARY KEY,
    pity_master_id TEXT NOT NULL REFERENCES gacha_pity_masters(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL,                -- 'CHARACTER', 'EQUIPMENT', 'SKILL'
    reward_id TEXT NOT NULL,
    required_points INT NOT NULL DEFAULT 200,
    limit_per_user INT DEFAULT 1,             -- 0は無制限
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_gacha_pity_points (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pity_master_id TEXT NOT NULL REFERENCES gacha_pity_masters(id) ON DELETE CASCADE,
    current_points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, pity_master_id)
);

CREATE TABLE IF NOT EXISTS user_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',    -- 'PENDING', 'ACCEPTED', 'BLOCKED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_user_id)
);

CREATE TABLE IF NOT EXISTS user_support_characters (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    support_character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_friends_user_id ON user_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id ON user_friends(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_status ON user_friends(status);



