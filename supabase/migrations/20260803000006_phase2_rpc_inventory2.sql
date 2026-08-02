-- 10. More Inventory RPCs
CREATE OR REPLACE FUNCTION public.claim_all_mission_rewards(p_user_id UUID, p_mission_ids TEXT[]) RETURNS JSONB AS $$
DECLARE
    v_mission_id TEXT;
    v_mission public.missions%ROWTYPE;
    v_next_step TEXT;
    v_count INTEGER := 0;
BEGIN
    FOREACH v_mission_id IN ARRAY p_mission_ids LOOP
        UPDATE public.user_missions SET status = 'CLAIMED', updated_at = now() WHERE user_id = p_user_id AND mission_id = v_mission_id AND status = 'PROGRESS';

        SELECT * INTO v_mission FROM public.missions WHERE id = v_mission_id;
        IF v_mission.id IS NOT NULL THEN
            INSERT INTO public.presents (user_id, item_id, quantity, message, expire_at, status)
            VALUES (p_user_id, v_mission.reward_item_id, v_mission.reward_quantity, 'ミッション報酬: ' || v_mission.title, now() + interval '24 hours', 'UNCLAIMED');

            v_next_step := NULL;
            IF v_mission_id = 'm_pvp_01' THEN v_next_step := 'm_pvp_02';
            ELSIF v_mission_id = 'm_exp_01' THEN v_next_step := 'm_exp_02';
            ELSIF v_mission_id = 'm_lvl_01' THEN v_next_step := 'm_lvl_02';
            END IF;

            IF v_next_step IS NOT NULL THEN
                INSERT INTO public.user_missions (user_id, mission_id, current_progress, status)
                VALUES (p_user_id, v_next_step, 0, 'PROGRESS')
                ON CONFLICT (user_id, mission_id) DO NOTHING;
            END IF;
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('status', 'success', 'claimed_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_reset_daily_missions(p_user_id UUID, p_mission_ids TEXT[]) RETURNS JSONB AS $$
BEGIN
    UPDATE public.user_missions SET current_progress = 0, status = 'PROGRESS', updated_at = now() WHERE user_id = p_user_id AND mission_id = ANY(p_mission_ids);
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
