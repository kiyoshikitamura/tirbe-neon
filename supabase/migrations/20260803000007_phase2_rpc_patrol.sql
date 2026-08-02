-- 11. Patrol RPCs
CREATE OR REPLACE FUNCTION public.start_patrol_v2(p_user_id UUID, p_course_id TEXT, p_character_id TEXT, p_duration_seconds INTEGER, p_cost_vitality INTEGER, p_battle_chance NUMERIC) RETURNS JSONB AS $$
DECLARE
    v_vitality INTEGER;
    v_new_id UUID;
    v_has_battle BOOLEAN;
BEGIN
    SELECT vitality INTO v_vitality FROM public.users WHERE id = p_user_id;
    IF v_vitality < p_cost_vitality THEN
        RETURN jsonb_build_object('error', 'スタミナが不足しています。');
    END IF;

    v_has_battle := (random() <= COALESCE(p_battle_chance, 0.2));

    INSERT INTO public.user_patrols (user_id, course_id, character_id, started_at, expires_at, status, has_battle_event, battle_resolved)
    VALUES (p_user_id, p_course_id, p_character_id, now(), now() + (p_duration_seconds * interval '1 second'), 'ONGOING', v_has_battle, false)
    RETURNING id INTO v_new_id;

    UPDATE public.users SET vitality = vitality - p_cost_vitality WHERE id = p_user_id;

    RETURN jsonb_build_object('status', 'success', 'patrol_id', v_new_id, 'has_battle', v_has_battle);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.complete_patrol_v2(
    p_user_id UUID, 
    p_patrol_id UUID, 
    p_cash BIGINT, 
    p_xp INTEGER, 
    p_course_name TEXT, 
    p_reward_item_id TEXT, 
    p_reward_qty INTEGER, 
    p_gear_dropped BOOLEAN, 
    p_is_victory BOOLEAN,
    p_battle_reward_item_id TEXT DEFAULT NULL,
    p_battle_reward_qty INTEGER DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_exp TIMESTAMPTZ := now() + interval '24 hours';
BEGIN
    UPDATE public.user_patrols SET status = 'COMPLETED' WHERE id = p_patrol_id AND user_id = p_user_id;

    INSERT INTO public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
    VALUES (p_user_id, 'CASH', p_cash, '見回り完了報酬 (' || p_course_name || CASE WHEN p_is_victory THEN '・バトル勝利' ELSE '' END || ')', 'UNCLAIMED', v_now, v_exp);

    IF p_reward_item_id IS NOT NULL AND p_reward_qty > 0 THEN
        INSERT INTO public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
        VALUES (p_user_id, p_reward_item_id, p_reward_qty, '見回りドロップ報酬 (' || p_course_name || ')', 'UNCLAIMED', v_now, v_exp);
    END IF;

    IF p_gear_dropped THEN
        INSERT INTO public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
        VALUES (p_user_id, 'WEAPON_001', 1, '見回り追加ドロップ装備 (' || p_course_name || ')', 'UNCLAIMED', v_now, v_exp);
    END IF;

    IF p_battle_reward_item_id IS NOT NULL AND p_battle_reward_qty > 0 THEN
        INSERT INTO public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
        VALUES (p_user_id, p_battle_reward_item_id, p_battle_reward_qty, '見回りバトル勝利追加報酬 (' || p_course_name || ')', 'UNCLAIMED', v_now, v_exp);
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
