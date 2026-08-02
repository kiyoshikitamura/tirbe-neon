-- 4. limit_break_gear_v2
CREATE OR REPLACE FUNCTION public.limit_break_gear_v2(
    p_user_id UUID, 
    p_equipment_id UUID, 
    p_cash_cost INTEGER,
    p_use_wildcard BOOLEAN,
    p_dupe_id UUID,
    p_new_options JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_item_qty INTEGER;
    v_equip_plus INTEGER;
    v_dupe_exists BOOLEAN;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_cash_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    IF p_use_wildcard THEN
        SELECT quantity INTO v_item_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = 'EQUIP_LB_HAMMER';
        IF v_item_qty IS NULL OR v_item_qty < 1 THEN
            RETURN jsonb_build_object('error', '代用素材「万能カスタムツール [装備]」が不足しています。');
        END IF;
    ELSE
        SELECT EXISTS(SELECT 1 FROM public.user_equipments WHERE id = p_dupe_id AND user_id = p_user_id AND equipped_character_id IS NULL) INTO v_dupe_exists;
        IF NOT v_dupe_exists THEN
            RETURN jsonb_build_object('error', '同名の予備装備品が見つかりません。');
        END IF;
    END IF;

    SELECT plus_val INTO v_equip_plus FROM public.user_equipments WHERE id = p_equipment_id AND user_id = p_user_id;
    IF v_equip_plus IS NULL THEN
        RETURN jsonb_build_object('error', '対象装備が存在しません。');
    END IF;

    UPDATE public.users SET cash = cash - p_cash_cost WHERE id = p_user_id;
    
    IF p_use_wildcard THEN
        UPDATE public.user_items SET quantity = quantity - 1 WHERE user_id = p_user_id AND item_id = 'EQUIP_LB_HAMMER';
    ELSE
        DELETE FROM public.user_equipments WHERE id = p_dupe_id;
    END IF;

    UPDATE public.user_equipments 
    SET plus_val = plus_val + 1, random_options = p_new_options 
    WHERE id = p_equipment_id AND user_id = p_user_id;

    PERFORM public.evaluate_mission_progress(p_user_id, 'GEAR_LIMIT_BREAK', 1);
    RETURN jsonb_build_object('status', 'success', 'next_plus', v_equip_plus + 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. limit_break_skill_v2
CREATE OR REPLACE FUNCTION public.limit_break_skill_v2(
    p_user_id UUID, 
    p_skill_id UUID, 
    p_cash_cost INTEGER,
    p_use_wildcard BOOLEAN,
    p_dupe_id UUID,
    p_wildcard_item_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_item_qty INTEGER;
    v_skill_plus INTEGER;
    v_dupe_exists BOOLEAN;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_cash_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    IF p_use_wildcard THEN
        SELECT quantity INTO v_item_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = p_wildcard_item_id;
        IF v_item_qty IS NULL OR v_item_qty < 1 THEN
            RETURN jsonb_build_object('error', '限界突破の書が不足しています。');
        END IF;
    ELSE
        SELECT EXISTS(SELECT 1 FROM public.user_skills WHERE id = p_dupe_id AND user_id = p_user_id AND equipped_character_id IS NULL) INTO v_dupe_exists;
        IF NOT v_dupe_exists THEN
            RETURN jsonb_build_object('error', '同名の予備スキルカードが見つかりません。');
        END IF;
    END IF;

    SELECT plus_val INTO v_skill_plus FROM public.user_skills WHERE id = p_skill_id AND user_id = p_user_id;
    IF v_skill_plus IS NULL THEN
        RETURN jsonb_build_object('error', '対象スキルが存在しません。');
    END IF;

    UPDATE public.users SET cash = cash - p_cash_cost WHERE id = p_user_id;
    
    IF p_use_wildcard THEN
        UPDATE public.user_items SET quantity = quantity - 1 WHERE user_id = p_user_id AND item_id = p_wildcard_item_id;
    ELSE
        DELETE FROM public.user_skills WHERE id = p_dupe_id;
    END IF;

    UPDATE public.user_skills SET plus_val = plus_val + 1 WHERE id = p_skill_id AND user_id = p_user_id;

    PERFORM public.evaluate_mission_progress(p_user_id, 'SKILL_LIMIT_BREAK', 1);
    RETURN jsonb_build_object('status', 'success', 'next_plus', v_skill_plus + 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
