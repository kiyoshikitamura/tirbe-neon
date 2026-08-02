-- 9. Inventory RPCs
CREATE OR REPLACE FUNCTION public.use_energy_drink(p_user_id UUID) RETURNS JSONB AS $$
DECLARE
    v_qty INTEGER;
BEGIN
    SELECT quantity INTO v_qty FROM public.user_items WHERE user_id = p_user_id AND item_id = 'ENERGY_DRINK';
    IF v_qty IS NULL OR v_qty < 1 THEN
        RETURN jsonb_build_object('error', 'エナジードリンクを所持していません。');
    END IF;

    UPDATE public.user_items SET quantity = quantity - 1 WHERE user_id = p_user_id AND item_id = 'ENERGY_DRINK';
    UPDATE public.users SET vitality = LEAST(vitality + 50, 100) WHERE id = p_user_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_test_diamonds(p_user_id UUID) RETURNS JSONB AS $$
BEGIN
    UPDATE public.users SET neon_diamonds = neon_diamonds + 50 WHERE id = p_user_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.claim_present(p_user_id UUID, p_present_id BIGINT) RETURNS JSONB AS $$
DECLARE
    v_present public.presents%ROWTYPE;
BEGIN
    SELECT * INTO v_present FROM public.presents WHERE id = p_present_id AND user_id = p_user_id AND status = 'UNCLAIMED';
    IF v_present.id IS NULL THEN
        RETURN jsonb_build_object('error', 'プレゼントが見つからないか、既に受け取り済みです。');
    END IF;

    IF v_present.item_id = 'CASH' THEN
        UPDATE public.users SET cash = cash + v_present.quantity WHERE id = p_user_id;
    ELSIF v_present.item_id = 'DIA' THEN
        UPDATE public.users SET neon_diamonds = neon_diamonds + v_present.quantity WHERE id = p_user_id;
    ELSIF v_present.item_id LIKE 'EQUIP_%' THEN
        INSERT INTO public.user_equipments (user_id, equipment_master_id, level, plus_val)
        VALUES (p_user_id, v_present.item_id, 1, 0);
    ELSE
        INSERT INTO public.user_items (user_id, item_id, quantity)
        VALUES (p_user_id, v_present.item_id, v_present.quantity)
        ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + EXCLUDED.quantity;
    END IF;

    UPDATE public.presents SET status = 'CLAIMED', claimed_at = now() WHERE id = p_present_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.claim_all_presents(p_user_id UUID) RETURNS JSONB AS $$
DECLARE
    v_present public.presents%ROWTYPE;
    v_count INTEGER := 0;
BEGIN
    FOR v_present IN SELECT * FROM public.presents WHERE user_id = p_user_id AND status = 'UNCLAIMED' LOOP
        IF v_present.item_id = 'CASH' THEN
            UPDATE public.users SET cash = cash + v_present.quantity WHERE id = p_user_id;
        ELSIF v_present.item_id = 'DIA' THEN
            UPDATE public.users SET neon_diamonds = neon_diamonds + v_present.quantity WHERE id = p_user_id;
        ELSIF v_present.item_id LIKE 'EQUIP_%' THEN
            INSERT INTO public.user_equipments (user_id, equipment_master_id, level, plus_val)
            VALUES (p_user_id, v_present.item_id, 1, 0);
        ELSE
            INSERT INTO public.user_items (user_id, item_id, quantity)
            VALUES (p_user_id, v_present.item_id, v_present.quantity)
            ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + EXCLUDED.quantity;
        END IF;

        UPDATE public.presents SET status = 'CLAIMED', claimed_at = now() WHERE id = v_present.id;
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('status', 'success', 'claimed_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_user_id UUID, p_mission_id TEXT) RETURNS JSONB AS $$
DECLARE
    v_mission public.missions%ROWTYPE;
    v_next_step TEXT;
BEGIN
    -- This RPC assumes we already updated user_missions on client and just need to create the present safely
    -- Wait, the client shouldn't update user_missions. RPC should do it.
    UPDATE public.user_missions SET status = 'CLAIMED', updated_at = now() WHERE user_id = p_user_id AND mission_id = p_mission_id AND status = 'PROGRESS';

    SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id;
    IF v_mission.id IS NOT NULL THEN
        INSERT INTO public.presents (user_id, item_id, quantity, message, expire_at, status)
        VALUES (p_user_id, v_mission.reward_item_id, v_mission.reward_quantity, 'ミッション報酬: ' || v_mission.title, now() + interval '24 hours', 'UNCLAIMED');

        IF p_mission_id = 'm_pvp_01' THEN v_next_step := 'm_pvp_02';
        ELSIF p_mission_id = 'm_exp_01' THEN v_next_step := 'm_exp_02';
        ELSIF p_mission_id = 'm_lvl_01' THEN v_next_step := 'm_lvl_02';
        END IF;

        IF v_next_step IS NOT NULL THEN
            INSERT INTO public.user_missions (user_id, mission_id, current_progress, status)
            VALUES (p_user_id, v_next_step, 0, 'PROGRESS')
            ON CONFLICT (user_id, mission_id) DO NOTHING;
        END IF;
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
