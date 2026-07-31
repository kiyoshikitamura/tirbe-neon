-- =================================================================
-- TRIBE: NEON REIGN - Initial Database Schema & RLS Policies
-- Migration: 20260731000000_initial_schema.sql
-- =================================================================

-- -----------------------------------------------------------------
-- 1. MASTER DATA TABLES
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.character_growth_patterns (
    pattern_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hp_gain NUMERIC DEFAULT 0,
    atk_gain NUMERIC DEFAULT 0,
    def_gain NUMERIC DEFAULT 0,
    spd_gain NUMERIC DEFAULT 0,
    luk_gain NUMERIC DEFAULT 0,
    base_hp INTEGER DEFAULT 100,
    base_atk INTEGER DEFAULT 10,
    base_def INTEGER DEFAULT 10,
    base_spd INTEGER DEFAULT 10,
    base_luk INTEGER DEFAULT 5
);

CREATE TABLE IF NOT EXISTS public.character_awakening_master (
    awakening_level INTEGER PRIMARY KEY,
    hp_bonus INTEGER DEFAULT 0,
    atk_bonus INTEGER DEFAULT 0,
    def_bonus INTEGER DEFAULT 0,
    spd_bonus INTEGER DEFAULT 0,
    luk_bonus INTEGER DEFAULT 0,
    required_cash BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.enemies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    hp INTEGER DEFAULT 100,
    atk INTEGER DEFAULT 10,
    def INTEGER DEFAULT 10,
    spd INTEGER DEFAULT 10,
    luk INTEGER DEFAULT 5,
    enemy_type TEXT DEFAULT 'NORMAL',
    skills JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.pvp_rewards_master (
    id SERIAL PRIMARY KEY,
    rank_min INTEGER NOT NULL,
    rank_max INTEGER NOT NULL,
    diamond_reward INTEGER DEFAULT 0,
    cash_reward INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.pvp_match_rewards_master (
    result TEXT PRIMARY KEY,
    diamond_reward INTEGER DEFAULT 0,
    cash_reward INTEGER DEFAULT 0,
    exp_reward INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.avatar_parts (
    part_id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    price_cash INTEGER DEFAULT 0,
    price_diamond INTEGER DEFAULT 0,
    unlock_level INTEGER DEFAULT 1,
    img_url TEXT
);

CREATE TABLE IF NOT EXISTS public.guild_level_master (
    level INTEGER PRIMARY KEY,
    next_xp INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 15,
    member_buff_atk NUMERIC DEFAULT 0,
    member_buff_hp NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.guild_xp_action_master (
    action_type TEXT PRIMARY KEY,
    xp_grant INTEGER DEFAULT 0,
    contribution_grant INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.quest_towns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    desc_text TEXT,
    bg_image TEXT
);

CREATE TABLE IF NOT EXISTS public.quests (
    id TEXT PRIMARY KEY,
    town_id TEXT REFERENCES public.quest_towns(id) ON DELETE SET NULL,
    level_type TEXT NOT NULL,
    name TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 300,
    cost_vitality INTEGER DEFAULT 10,
    cash_reward INTEGER DEFAULT 100,
    exp_reward INTEGER DEFAULT 50,
    item_rewards JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.patrol_npcs (
    id TEXT PRIMARY KEY,
    quest_id TEXT REFERENCES public.quests(id) ON DELETE CASCADE,
    npc_name TEXT NOT NULL,
    npc_level INTEGER DEFAULT 1,
    encounter_rate NUMERIC DEFAULT 0.1,
    enemy_data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.user_level_master (
    level INTEGER PRIMARY KEY,
    next_xp INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.missions (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    title TEXT NOT NULL,
    desc_text TEXT,
    target_value INTEGER DEFAULT 1,
    reward_item_id TEXT,
    reward_qty INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.raid_boss_master (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_hp BIGINT DEFAULT 100000,
    base_atk INTEGER DEFAULT 100,
    base_def INTEGER DEFAULT 50,
    spd INTEGER DEFAULT 100,
    duration_minutes INTEGER DEFAULT 60,
    rewards JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.raid_rewards_master (
    id SERIAL PRIMARY KEY,
    reward_type TEXT NOT NULL,
    threshold_val BIGINT DEFAULT 0,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.gvg_rewards_master (
    rank INTEGER PRIMARY KEY,
    guild_funds INTEGER DEFAULT 0,
    member_diamonds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.gacha_masters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cost_cash INTEGER DEFAULT 0,
    cost_diamond INTEGER DEFAULT 0,
    banner_img TEXT
);

CREATE TABLE IF NOT EXISTS public.gacha_items_master (
    id TEXT PRIMARY KEY,
    gacha_id TEXT REFERENCES public.gacha_masters(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    rarity TEXT NOT NULL,
    weight INTEGER DEFAULT 10
);

CREATE TABLE IF NOT EXISTS public.login_bonus_master (
    day_number INTEGER PRIMARY KEY,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    item_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.equipment_limit_break_master (
    plus_val INTEGER PRIMARY KEY,
    success_rate NUMERIC DEFAULT 1.0,
    cost_cash INTEGER DEFAULT 1000,
    required_hammer INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.equipment_level_up_master (
    level INTEGER PRIMARY KEY,
    cost_cash INTEGER DEFAULT 500,
    required_exp INTEGER DEFAULT 100
);

CREATE TABLE IF NOT EXISTS public.skill_limit_break_master (
    plus_val INTEGER PRIMARY KEY,
    cost_cash INTEGER DEFAULT 1000,
    required_book INTEGER DEFAULT 1
);

-- -----------------------------------------------------------------
-- 2. USER DATA & GAMEPLAY STATE TABLES
-- -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL DEFAULT '半グレの首領',
    bio TEXT DEFAULT '歌舞伎町の覇権を握るため立ち上がる。',
    avatar_url TEXT DEFAULT '/reiji_transparent_asset.png',
    current_base_id TEXT DEFAULT 'neon_tower',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    cash BIGINT DEFAULT 10000,
    neon_diamonds INTEGER DEFAULT 200,
    vitality INTEGER DEFAULT 100,
    pvp_tickets INTEGER DEFAULT 5,
    favorite_character_id TEXT DEFAULT '11111111-1111-1111-1111-111111111111',
    title_equipped TEXT DEFAULT '半グレの首領',
    equipped_background TEXT DEFAULT '/bg/bg_base_neontower.png',
    equipped_front_effect TEXT DEFAULT 'none',
    selected_bg_mode TEXT DEFAULT 'NEON_TOWER',
    interior_item TEXT DEFAULT 'none',
    last_guild_left_at TIMESTAMPTZ,
    gift_code TEXT UNIQUE,
    daily_cash_skips_count INTEGER DEFAULT 0,
    sound_settings JSONB DEFAULT '{"bgm": true, "se": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    awakening_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    equipment_id TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    plus_val INTEGER DEFAULT 0,
    equipped_character_id TEXT,
    slot_index INTEGER,
    random_options JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    skill_card_id TEXT NOT NULL,
    plus_val INTEGER DEFAULT 0,
    equipped_character_id TEXT,
    slot_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.user_patrols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id TEXT,
    quest_id TEXT,
    character_id TEXT NOT NULL,
    status TEXT DEFAULT 'ONGOING',
    has_battle_event BOOLEAN DEFAULT false,
    battle_resolved BOOLEAN DEFAULT false,
    battle_result TEXT,
    rewards_accrued JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.presents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    message TEXT,
    status TEXT DEFAULT 'UNCLAIMED',
    expire_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    mission_id TEXT NOT NULL,
    current_progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PROGRESS',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, mission_id)
);

CREATE TABLE IF NOT EXISTS public.user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    invitee_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    gift_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    gender TEXT DEFAULT 'MALE',
    hair_id TEXT DEFAULT 'hair_male_spiky',
    face_id TEXT DEFAULT 'face_male_smirk',
    outfit_id TEXT DEFAULT 'body_basic',
    background_id TEXT DEFAULT 'bg_default',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_avatar_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    part_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, part_id)
);

CREATE TABLE IF NOT EXISTS public.guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    funds BIGINT DEFAULT 0,
    main_alignment TEXT DEFAULT 'NEUTRAL',
    sub_alignment TEXT DEFAULT 'NEUTRAL',
    banner_id TEXT,
    decoration_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guild_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT DEFAULT 'MEMBER',
    contribution_points INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guild_base_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_id TEXT UNIQUE NOT NULL,
    guild_id UUID REFERENCES public.guilds(id) ON DELETE SET NULL,
    daily_points INTEGER DEFAULT 0,
    is_controlling BOOLEAN DEFAULT false,
    total_seasonal_days INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pvp_ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    rank_points INTEGER DEFAULT 1000,
    daily_wins INTEGER DEFAULT 0,
    season_wins INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pvp_defense_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    character_1_id TEXT,
    character_2_id TEXT,
    character_3_id TEXT,
    character_4_id TEXT,
    character_5_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pvp_defense_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    attacker_id UUID,
    attacker_name TEXT,
    result TEXT,
    points_change INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gvg_defense_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    character_1_id TEXT,
    character_2_id TEXT,
    character_3_id TEXT,
    character_4_id TEXT,
    character_5_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gvg_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id INTEGER DEFAULT 1,
    day_number INTEGER DEFAULT 1,
    base_id TEXT NOT NULL,
    guild_a_id UUID REFERENCES public.guilds(id) ON DELETE SET NULL,
    guild_b_id UUID REFERENCES public.guilds(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ONGOING',
    winner_guild_id UUID REFERENCES public.guilds(id) ON DELETE SET NULL,
    is_finals BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_gvg_ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    season_points INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gvg_season_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_day INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL DEFAULT 'STRATEGY_CHAT',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    author_character_id TEXT,
    replies_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL DEFAULT 'GLOBAL',
    guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_power_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    total_power INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.story_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    episode_id TEXT NOT NULL,
    status TEXT DEFAULT 'READING',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raid_bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boss_id TEXT NOT NULL,
    current_hp BIGINT DEFAULT 100000,
    max_hp BIGINT DEFAULT 100000,
    base_id TEXT DEFAULT 'neon_tower',
    status TEXT DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raid_damage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boss_id TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    damage BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'JPY',
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_login_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    current_day INTEGER DEFAULT 1,
    last_claimed_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES (KI Rule B-1)
-- -----------------------------------------------------------------

ALTER TABLE public.character_growth_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_awakening_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enemies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_rewards_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_match_rewards_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_level_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_xp_action_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_towns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_boss_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_rewards_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gvg_rewards_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gacha_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gacha_items_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_bonus_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_limit_break_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_level_up_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_limit_break_master ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatar_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_base_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_defense_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_defense_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gvg_defense_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gvg_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gvg_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gvg_season_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_power_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_damage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_bonuses ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- 4. RLS POLICIES (Hybrid Policy A)
-- -----------------------------------------------------------------

-- Master Data Policies: Read-only for all authenticated / anon users
CREATE POLICY "Allow public read on master tables" ON public.character_growth_patterns FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.character_awakening_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.enemies FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.pvp_rewards_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.pvp_match_rewards_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.avatar_parts FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.guild_level_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.guild_xp_action_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.quest_towns FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.quests FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.patrol_npcs FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.user_level_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.raid_boss_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.raid_rewards_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.gvg_rewards_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.gacha_masters FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.gacha_items_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.login_bonus_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.equipment_limit_break_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.equipment_level_up_master FOR SELECT USING (true);
CREATE POLICY "Allow public read on master tables" ON public.skill_limit_break_master FOR SELECT USING (true);

-- User Data & Shared State Policies: Open operations for authenticated / prototype users
CREATE POLICY "Allow all access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_characters" ON public.user_characters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_equipments" ON public.user_equipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_skills" ON public.user_skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_items" ON public.user_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_patrols" ON public.user_patrols FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to presents" ON public.presents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_missions" ON public.user_missions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_invitations" ON public.user_invitations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_avatars" ON public.user_avatars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_avatar_parts" ON public.user_avatar_parts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to guilds" ON public.guilds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to guild_members" ON public.guild_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to guild_base_controls" ON public.guild_base_controls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pvp_ranks" ON public.pvp_ranks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pvp_defense_decks" ON public.pvp_defense_decks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pvp_defense_logs" ON public.pvp_defense_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gvg_defense_decks" ON public.gvg_defense_decks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gvg_matches" ON public.gvg_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_gvg_ranks" ON public.user_gvg_ranks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gvg_season_status" ON public.gvg_season_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to board_posts" ON public.board_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to direct_messages" ON public.direct_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_chats" ON public.user_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_power_rankings" ON public.user_power_rankings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to story_sessions" ON public.story_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to raid_bosses" ON public.raid_bosses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to raid_damage_logs" ON public.raid_damage_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payment_transactions" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to user_login_bonuses" ON public.user_login_bonuses FOR ALL USING (true) WITH CHECK (true);
