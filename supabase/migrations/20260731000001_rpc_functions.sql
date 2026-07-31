-- =================================================================
-- TRIBE: NEON REIGN - RPC (Stored Functions) Definition
-- Migration: 20260731000001_rpc_functions.sql
-- =================================================================

-- 既存の関数宣言（戻り値型変更時等のエラー防止）の破棄
DROP FUNCTION IF EXISTS public.generate_user_gift_code(UUID);
DROP FUNCTION IF EXISTS public.add_user_xp(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.process_login_bonus();
DROP FUNCTION IF EXISTS public.sync_and_recover_vitality_and_tickets(UUID);
DROP FUNCTION IF EXISTS public.complete_patrol_instantly(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.evaluate_mission_progress(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.sync_and_evaluate_raid_timeout(UUID);
DROP FUNCTION IF EXISTS public.unequip_gear_bulk(TEXT, UUID);
DROP FUNCTION IF EXISTS public.equip_gear_bulk(TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.unequip_skill_bulk(TEXT, UUID);
DROP FUNCTION IF EXISTS public.equip_skill_bulk(TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.sell_gear_bulk(UUID, JSONB);
DROP FUNCTION IF EXISTS public.buy_normal_shop_product(UUID, TEXT);
DROP FUNCTION IF EXISTS public.process_stripe_shop_purchase(UUID, TEXT);

-- 1. ユーザーギフトコード生成
CREATE OR REPLACE FUNCTION public.generate_user_gift_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT := '';
    v_exists BOOLEAN := true;
    v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    i INTEGER;
BEGIN
    SELECT gift_code INTO v_code FROM public.users WHERE id = p_user_id;
    IF v_code IS NOT NULL AND v_code <> '' THEN
        RETURN v_code;
    END IF;

    WHILE v_exists LOOP
        v_code := '';
        FOR i IN 1..8 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
        END LOOP;
        SELECT EXISTS (SELECT 1 FROM public.users WHERE gift_code = v_code) INTO v_exists;
    END LOOP;

    UPDATE public.users SET gift_code = v_code WHERE id = p_user_id;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ユーザー経験値加算 ＆ レベルアップ判定
CREATE OR REPLACE FUNCTION public.add_user_xp(p_user_id UUID, p_xp_amount INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_level INTEGER;
    v_xp INTEGER;
    v_next_xp INTEGER;
    v_leveled_up BOOLEAN := false;
BEGIN
    SELECT level, xp INTO v_level, v_xp FROM public.users WHERE id = p_user_id;
    IF v_level IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_level < 99 THEN
        v_xp := v_xp + p_xp_amount;
        LOOP
            SELECT next_xp INTO v_next_xp FROM public.user_level_master WHERE level = v_level;
            IF v_next_xp IS NULL OR v_next_xp = 0 OR v_xp < v_next_xp OR v_level >= 99 THEN
                EXIT;
            END IF;
            v_xp := v_xp - v_next_xp;
            v_level := v_level + 1;
            v_leveled_up := true;
        END LOOP;
        UPDATE public.users SET level = v_level, xp = v_xp WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object('level', v_level, 'xp', v_xp, 'leveled_up', v_leveled_up);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ログインボーナス受取判定 (KI Rule B-4)
CREATE OR REPLACE FUNCTION public.process_login_bonus()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_current_day INTEGER := 1;
    v_last_claimed TIMESTAMPTZ;
    v_now TIMESTAMPTZ := now();
    v_item_id TEXT;
    v_qty INTEGER;
    v_item_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        -- セッションなし時のフォールバック処理用デモID
        SELECT id INTO v_user_id FROM public.users LIMIT 1;
    END IF;

    SELECT current_day, last_claimed_at INTO v_current_day, v_last_claimed 
    FROM public.user_login_bonuses WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.user_login_bonuses (user_id, current_day, last_claimed_at)
        VALUES (v_user_id, 1, v_now);
        v_current_day := 1;
    ELSE
        IF v_last_claimed::date = v_now::date THEN
            RETURN jsonb_build_object('already_claimed', true);
        END IF;
        v_current_day := (v_current_day % 7) + 1;
        UPDATE public.user_login_bonuses 
        SET current_day = v_current_day, last_claimed_at = v_now 
        WHERE user_id = v_user_id;
    END IF;

    SELECT item_id, quantity, item_name INTO v_item_id, v_qty, v_item_name
    FROM public.login_bonus_master WHERE day_number = v_current_day;

    IF v_item_id IS NOT NULL THEN
        INSERT INTO public.presents (user_id, item_id, quantity, message, expire_at)
        VALUES (v_user_id, v_item_id, v_qty, 'ログインボーナス (' || v_item_name || ')', v_now + interval '30 days');
    END IF;

    RETURN jsonb_build_object('already_claimed', false, 'day_number', v_current_day, 'item_id', v_item_id, 'quantity', v_qty, 'item_name', v_item_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. スタミナ・チケット自動回復判定
CREATE OR REPLACE FUNCTION public.sync_and_recover_vitality_and_tickets(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_vitality INTEGER;
    v_tickets INTEGER;
BEGIN
    SELECT vitality, pvp_tickets INTO v_vitality, v_tickets FROM public.users WHERE id = p_user_id;
    IF v_vitality < 100 THEN
        v_vitality := LEAST(100, v_vitality + 10);
    END IF;
    IF v_tickets < 5 THEN
        v_tickets := LEAST(5, v_tickets + 1);
    END IF;

    UPDATE public.users SET vitality = v_vitality, pvp_tickets = v_tickets WHERE id = p_user_id;
    RETURN jsonb_build_object('vitality', v_vitality, 'pvp_tickets', v_tickets);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. クエスト即時完了
CREATE OR REPLACE FUNCTION public.complete_patrol_instantly(p_user_id UUID, p_patrol_id UUID, p_currency TEXT)
RETURNS JSONB AS $$
DECLARE
    v_cash BIGINT;
    v_diamonds INTEGER;
    v_cost INTEGER := 50;
BEGIN
    SELECT cash, neon_diamonds INTO v_cash, v_diamonds FROM public.users WHERE id = p_user_id;

    IF p_currency = 'CASH' THEN
        IF v_cash < 1000 THEN
            RAISE EXCEPTION 'Cash insufficient';
        END IF;
        UPDATE public.users SET cash = cash - 1000 WHERE id = p_user_id;
    ELSE
        IF v_diamonds < v_cost THEN
            RAISE EXCEPTION 'Diamond insufficient';
        END IF;
        UPDATE public.users SET neon_diamonds = neon_diamonds - v_cost WHERE id = p_user_id;
    END IF;

    UPDATE public.user_patrols 
    SET status = 'CLAIMABLE', expires_at = now() 
    WHERE id = p_patrol_id AND user_id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ミッション進捗更新
CREATE OR REPLACE FUNCTION public.evaluate_mission_progress(p_user_id UUID, p_trigger_type TEXT, p_progress_increment INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_missions um
    SET current_progress = um.current_progress + p_progress_increment,
        status = CASE WHEN um.current_progress + p_progress_increment >= m.target_value THEN 'CLEAR' ELSE 'PROGRESS' END,
        updated_at = now()
    FROM public.missions m
    WHERE um.mission_id = m.id AND um.user_id = p_user_id AND m.trigger_type = p_trigger_type AND um.status = 'PROGRESS';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. レイドタイムアウト同期
CREATE OR REPLACE FUNCTION public.sync_and_evaluate_raid_timeout(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_boss_record RECORD;
BEGIN
    SELECT * INTO v_boss_record FROM public.raid_bosses WHERE status = 'ACTIVE' LIMIT 1;
    IF FOUND THEN
        IF v_boss_record.expires_at <= now() THEN
            UPDATE public.raid_bosses SET status = 'EXPIRED' WHERE id = v_boss_record.id;
            RETURN jsonb_build_object('is_active', false, 'reason', 'EXPIRED');
        END IF;
        RETURN jsonb_build_object('is_active', true, 'boss', row_to_json(v_boss_record));
    END IF;
    RETURN jsonb_build_object('is_active', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 装備一括解除 (KI Rule A-5, B-6)
CREATE OR REPLACE FUNCTION public.unequip_gear_bulk(p_character_id TEXT, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_equipments 
    SET equipped_character_id = NULL, slot_index = NULL 
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 装備一括装着 (KI Rule A-5, B-6)
CREATE OR REPLACE FUNCTION public.equip_gear_bulk(p_character_id TEXT, p_user_id UUID, p_gear_ids JSONB)
RETURNS VOID AS $$
DECLARE
    v_gear_id TEXT;
    v_idx INTEGER := 0;
BEGIN
    PERFORM public.unequip_gear_bulk(p_character_id, p_user_id);

    FOR v_gear_id IN SELECT jsonb_array_elements_text(p_gear_ids) LOOP
        UPDATE public.user_equipments 
        SET equipped_character_id = p_character_id, slot_index = v_idx 
        WHERE id::text = v_gear_id AND user_id = p_user_id;
        v_idx := v_idx + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. スキル一括解除 (KI Rule A-5, B-6)
CREATE OR REPLACE FUNCTION public.unequip_skill_bulk(p_character_id TEXT, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_skills 
    SET equipped_character_id = NULL, slot_index = NULL 
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. スキル一括装着 (KI Rule A-5, B-6)
CREATE OR REPLACE FUNCTION public.equip_skill_bulk(p_character_id TEXT, p_user_id UUID, p_skill_ids JSONB)
RETURNS VOID AS $$
DECLARE
    v_skill_id TEXT;
    v_idx INTEGER := 0;
BEGIN
    PERFORM public.unequip_skill_bulk(p_character_id, p_user_id);

    FOR v_skill_id IN SELECT jsonb_array_elements_text(p_skill_ids) LOOP
        UPDATE public.user_skills 
        SET equipped_character_id = p_character_id, slot_index = v_idx 
        WHERE id::text = v_skill_id AND user_id = p_user_id;
        v_idx := v_idx + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 装備一括売却 (KI Rule A-5, B-7)
CREATE OR REPLACE FUNCTION public.sell_gear_bulk(p_user_id UUID, p_gear_ids JSONB)
RETURNS JSONB AS $$
DECLARE
    v_equipped_count INTEGER;
    v_total_cash BIGINT := 0;
BEGIN
    -- 装備中アセットが含まれているか検証 (KI Rule B-7)
    SELECT count(*) INTO v_equipped_count 
    FROM public.user_equipments 
    WHERE user_id = p_user_id 
      AND id::text IN (SELECT jsonb_array_elements_text(p_gear_ids))
      AND equipped_character_id IS NOT NULL;

    IF v_equipped_count > 0 THEN
        RAISE EXCEPTION 'Cannot sell equipped items';
    END IF;

    -- 売却計算 & 削除
    v_total_cash := jsonb_array_length(p_gear_ids) * 500;
    
    DELETE FROM public.user_equipments 
    WHERE user_id = p_user_id 
      AND id::text IN (SELECT jsonb_array_elements_text(p_gear_ids));

    UPDATE public.users SET cash = cash + v_total_cash WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'earned_cash', v_total_cash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 通常ショップ購入 (KI Rule B-8)
CREATE OR REPLACE FUNCTION public.buy_normal_shop_product(p_user_id UUID, p_product_id TEXT)
RETURNS JSONB AS $$
BEGIN
    -- ショップ商品ロジック
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Stripeショップ購入 (KI Rule B-8)
CREATE OR REPLACE FUNCTION public.process_stripe_shop_purchase(p_user_id UUID, p_product_id TEXT)
RETURNS JSONB AS $$
BEGIN
    -- Stripe購入ロジック
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
