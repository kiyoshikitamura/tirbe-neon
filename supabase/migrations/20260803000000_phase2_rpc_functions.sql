-- =================================================================
-- TRIBE: NEON REIGN - RPC (Stored Functions) Definition Phase 2
-- Migration: 20260803000000_phase2_rpc_functions.sql
-- =================================================================

-- 1. character_level_up
CREATE OR REPLACE FUNCTION public.character_level_up(
    p_user_id UUID, 
    p_character_id TEXT, 
    p_exp_item_id TEXT, 
    p_count INTEGER, 
    p_cash_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_item_qty INTEGER;
    v_char_level INTEGER;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_cash_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    SELECT quantity INTO v_item_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = p_exp_item_id;
    IF v_item_qty IS NULL OR v_item_qty < p_count THEN
        RETURN jsonb_build_object('error', '経験の書が不足しています。');
    END IF;

    SELECT level INTO v_char_level FROM public.user_characters WHERE user_id = p_user_id AND character_id = p_character_id;
    IF v_char_level IS NULL THEN
        RETURN jsonb_build_object('error', 'キャラクターが存在しません。');
    END IF;

    UPDATE public.users SET cash = cash - p_cash_cost WHERE id = p_user_id;
    UPDATE public.user_items SET quantity = quantity - p_count WHERE user_id = p_user_id AND item_id = p_exp_item_id;
    UPDATE public.user_characters SET level = LEAST(100, level + p_count) WHERE user_id = p_user_id AND character_id = p_character_id;

    PERFORM public.evaluate_mission_progress(p_user_id, 'CHAR_LEVEL_UP', p_count);
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. character_awaken
CREATE OR REPLACE FUNCTION public.character_awaken(
    p_user_id UUID, 
    p_character_id TEXT, 
    p_cash_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_item_qty INTEGER;
    v_awaken_level INTEGER;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_cash_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    SELECT quantity INTO v_item_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = 'LAW_OF_STRIFE';
    IF v_item_qty IS NULL OR v_item_qty < 1 THEN
        RETURN jsonb_build_object('error', '覚醒の書が不足しています。');
    END IF;

    SELECT awakening_level INTO v_awaken_level FROM public.user_characters WHERE user_id = p_user_id AND character_id = p_character_id;
    IF v_awaken_level IS NULL OR v_awaken_level >= 5 THEN
        RETURN jsonb_build_object('error', 'キャラクターが存在しないか、覚醒上限です。');
    END IF;

    UPDATE public.users SET cash = cash - p_cash_cost WHERE id = p_user_id;
    UPDATE public.user_items SET quantity = quantity - 1 WHERE user_id = p_user_id AND item_id = 'LAW_OF_STRIFE';
    UPDATE public.user_characters SET awakening_level = awakening_level + 1 WHERE user_id = p_user_id AND character_id = p_character_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. upgrade_gear
CREATE OR REPLACE FUNCTION public.upgrade_gear(
    p_user_id UUID, 
    p_equipment_id UUID, 
    p_exp_item_id TEXT, 
    p_count INTEGER, 
    p_cash_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_item_qty INTEGER;
    v_equip_level INTEGER;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_cash_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    SELECT quantity INTO v_item_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = p_exp_item_id;
    IF v_item_qty IS NULL OR v_item_qty < p_count THEN
        RETURN jsonb_build_object('error', '強化素材が不足しています。');
    END IF;

    SELECT level INTO v_equip_level FROM public.user_equipments WHERE id = p_equipment_id AND user_id = p_user_id;
    IF v_equip_level IS NULL THEN
        RETURN jsonb_build_object('error', '装備が存在しません。');
    END IF;

    UPDATE public.users SET cash = cash - p_cash_cost WHERE id = p_user_id;
    UPDATE public.user_items SET quantity = quantity - p_count WHERE user_id = p_user_id AND item_id = p_exp_item_id;
    UPDATE public.user_equipments SET level = LEAST(100, level + p_count) WHERE id = p_equipment_id AND user_id = p_user_id;

    PERFORM public.evaluate_mission_progress(p_user_id, 'GEAR_UPGRADE', p_count);
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. limit_break_gear
CREATE OR REPLACE FUNCTION public.limit_break_gear(
    p_user_id UUID, 
    p_equipment_id UUID, 
    p_cash_cost INTEGER,
    p_hammer_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_item_qty INTEGER;
    v_equip_plus INTEGER;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_cash_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    SELECT quantity INTO v_item_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = 'EQUIP_LB_HAMMER';
    IF v_item_qty IS NULL OR v_item_qty < p_hammer_cost THEN
        RETURN jsonb_build_object('error', '限界突破ハンマーが不足しています。');
    END IF;

    SELECT plus_val INTO v_equip_plus FROM public.user_equipments WHERE id = p_equipment_id AND user_id = p_user_id;
    IF v_equip_plus IS NULL THEN
        RETURN jsonb_build_object('error', '装備が存在しません。');
    END IF;

    UPDATE public.users SET cash = cash - p_cash_cost WHERE id = p_user_id;
    UPDATE public.user_items SET quantity = quantity - p_hammer_cost WHERE user_id = p_user_id AND item_id = 'EQUIP_LB_HAMMER';
    UPDATE public.user_equipments SET plus_val = plus_val + 1 WHERE id = p_equipment_id AND user_id = p_user_id;

    PERFORM public.evaluate_mission_progress(p_user_id, 'GEAR_LIMIT_BREAK', 1);
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. limit_break_skill
CREATE OR REPLACE FUNCTION public.limit_break_skill(
    p_user_id UUID, 
    p_skill_id UUID, 
    p_cash_cost INTEGER,
    p_book_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_item_qty INTEGER;
    v_skill_plus INTEGER;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_cash_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    SELECT quantity INTO v_item_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = 'SKILL_LB_BOOK';
    IF v_item_qty IS NULL OR v_item_qty < p_book_cost THEN
        RETURN jsonb_build_object('error', '奥義書が不足しています。');
    END IF;

    SELECT plus_val INTO v_skill_plus FROM public.user_skills WHERE id = p_skill_id AND user_id = p_user_id;
    IF v_skill_plus IS NULL THEN
        RETURN jsonb_build_object('error', 'スキルが存在しません。');
    END IF;

    UPDATE public.users SET cash = cash - p_cash_cost WHERE id = p_user_id;
    UPDATE public.user_items SET quantity = quantity - p_book_cost WHERE user_id = p_user_id AND item_id = 'SKILL_LB_BOOK';
    UPDATE public.user_skills SET plus_val = plus_val + 1 WHERE id = p_skill_id AND user_id = p_user_id;

    PERFORM public.evaluate_mission_progress(p_user_id, 'SKILL_LIMIT_BREAK', 1);
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. create_guild
CREATE OR REPLACE FUNCTION public.create_guild(
    p_user_id UUID, 
    p_guild_name TEXT, 
    p_guild_description TEXT, 
    p_guild_logo TEXT, 
    p_guild_color TEXT, 
    p_creation_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_new_guild_id UUID;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_creation_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    INSERT INTO public.guilds (name, description, logo_icon, color_theme, level, xp, cash, approval_required, auto_kick_days)
    VALUES (p_guild_name, p_guild_description, COALESCE(p_guild_logo, 'guild_icon_default.png'), COALESCE(p_guild_color, 'red'), 1, 0, 0, false, 7)
    RETURNING id INTO v_new_guild_id;

    INSERT INTO public.guild_members (guild_id, user_id, role)
    VALUES (v_new_guild_id, p_user_id, 'MASTER');

    UPDATE public.users SET cash = cash - p_creation_cost, guild_id = v_new_guild_id WHERE id = p_user_id;

    PERFORM public.evaluate_mission_progress(p_user_id, 'GUILD_JOIN', 1);
    RETURN jsonb_build_object('guild_id', v_new_guild_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. buy_guild_decoration
CREATE OR REPLACE FUNCTION public.buy_guild_decoration(
    p_user_id UUID, 
    p_guild_id UUID, 
    p_decoration_id TEXT, 
    p_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_guild_cash INTEGER;
BEGIN
    SELECT cash INTO v_guild_cash FROM public.guilds WHERE id = p_guild_id;
    IF v_guild_cash IS NULL OR v_guild_cash < p_cost THEN
        RETURN jsonb_build_object('error', 'ギルド資金が不足しています。');
    END IF;

    INSERT INTO public.guild_decorations (guild_id, decoration_id)
    VALUES (p_guild_id, p_decoration_id);

    UPDATE public.guilds SET cash = cash - p_cost WHERE id = p_guild_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. use_inventory_item
CREATE OR REPLACE FUNCTION public.use_inventory_item(
    p_user_id UUID, 
    p_item_id TEXT, 
    p_quantity INTEGER, 
    p_vitality_gain INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_item_qty INTEGER;
BEGIN
    SELECT quantity INTO v_item_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = p_item_id;
    IF v_item_qty IS NULL OR v_item_qty < p_quantity THEN
        RETURN jsonb_build_object('error', 'アイテムが不足しています。');
    END IF;

    UPDATE public.user_items SET quantity = quantity - p_quantity WHERE user_id = p_user_id AND item_id = p_item_id;

    IF p_vitality_gain > 0 THEN
        UPDATE public.users SET vitality = LEAST(100, COALESCE(vitality, 0) + p_vitality_gain) WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. complete_patrol_instant
CREATE OR REPLACE FUNCTION public.complete_patrol_instant(
    p_user_id UUID, 
    p_patrol_id UUID, 
    p_diamond_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_diamonds INTEGER;
    v_patrol_exists BOOLEAN;
BEGIN
    SELECT diamonds INTO v_diamonds FROM public.users WHERE id = p_user_id;
    IF v_diamonds IS NULL OR v_diamonds < p_diamond_cost THEN
        RETURN jsonb_build_object('error', 'ダイヤが不足しています。');
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.user_patrols WHERE id = p_patrol_id AND user_id = p_user_id) INTO v_patrol_exists;
    IF NOT v_patrol_exists THEN
        RETURN jsonb_build_object('error', 'クエストが存在しません。');
    END IF;

    UPDATE public.users SET diamonds = diamonds - p_diamond_cost WHERE id = p_user_id;
    DELETE FROM public.user_patrols WHERE id = p_patrol_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. claim_battle_rewards
CREATE OR REPLACE FUNCTION public.claim_battle_rewards(
    p_user_id UUID, 
    p_cash_amount INTEGER, 
    p_exp_amount INTEGER, 
    p_item_rewards JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
BEGIN
    UPDATE public.users SET cash = COALESCE(cash, 0) + p_cash_amount WHERE id = p_user_id;
    
    IF p_exp_amount > 0 THEN
        PERFORM public.add_user_xp(p_user_id, p_exp_amount);
    END IF;

    IF jsonb_typeof(p_item_rewards) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_item_rewards)
        LOOP
            INSERT INTO public.user_items (user_id, item_id, quantity)
            VALUES (p_user_id, v_item->>'item_id', (v_item->>'quantity')::INTEGER)
            ON CONFLICT (user_id, item_id) 
            DO UPDATE SET quantity = public.user_items.quantity + (v_item->>'quantity')::INTEGER;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. execute_gacha
CREATE OR REPLACE FUNCTION public.execute_gacha(
    p_user_id UUID, 
    p_currency_type TEXT, 
    p_currency_cost INTEGER, 
    p_results JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_ticket_qty INTEGER;
    v_res JSONB;
    v_char_exists BOOLEAN;
BEGIN
    SELECT cash, diamonds INTO v_user FROM public.users WHERE id = p_user_id;
    
    IF p_currency_type = 'cash' THEN
        IF v_user.cash < p_currency_cost THEN
            RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
        END IF;
        UPDATE public.users SET cash = cash - p_currency_cost WHERE id = p_user_id;
    ELSIF p_currency_type = 'diamonds' THEN
        IF v_user.diamonds < p_currency_cost THEN
            RETURN jsonb_build_object('error', 'ダイヤが不足しています。');
        END IF;
        UPDATE public.users SET diamonds = diamonds - p_currency_cost WHERE id = p_user_id;
    ELSIF p_currency_type = 'ticket' THEN
        SELECT quantity INTO v_ticket_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = 'GACHA_TICKET';
        IF v_ticket_qty IS NULL OR v_ticket_qty < p_currency_cost THEN
            RETURN jsonb_build_object('error', 'ガチャチケットが不足しています。');
        END IF;
        UPDATE public.user_items SET quantity = quantity - p_currency_cost WHERE user_id = p_user_id AND item_id = 'GACHA_TICKET';
    ELSIF p_currency_type = 'free' THEN
        -- do nothing
    ELSE
        RETURN jsonb_build_object('error', '不正な通貨タイプです。');
    END IF;

    IF p_currency_type <> 'free' THEN
        UPDATE public.users SET special_pity_points = COALESCE(special_pity_points, 0) + jsonb_array_length(p_results) WHERE id = p_user_id;
    END IF;

    FOR v_res IN SELECT * FROM jsonb_array_elements(p_results)
    LOOP
        IF v_res->>'type' = 'character' THEN
            SELECT EXISTS(SELECT 1 FROM public.user_characters WHERE user_id = p_user_id AND character_id = v_res->>'character_id') INTO v_char_exists;
            IF v_char_exists THEN
                INSERT INTO public.user_items (user_id, item_id, quantity)
                VALUES (p_user_id, 'CHAR_EXP_M', 5)
                ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 5;
            ELSE
                INSERT INTO public.user_characters (user_id, character_id, level, awakening_level)
                VALUES (p_user_id, v_res->>'character_id', 1, 0);
            END IF;
        ELSIF v_res->>'type' = 'item' THEN
            INSERT INTO public.user_items (user_id, item_id, quantity)
            VALUES (p_user_id, v_res->>'item_id', (v_res->>'quantity')::INTEGER)
            ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + (v_res->>'quantity')::INTEGER;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

