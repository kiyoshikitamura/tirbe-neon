-- 20260804000001_vitality_timer_recovery.sql

CREATE OR REPLACE FUNCTION sync_and_recover_vitality_and_tickets(p_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user record;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_elapsed_sec INT;
    v_recovery_amount INT;
    v_pvp_elapsed_sec INT;
    v_pvp_recovery INT;
    v_out_vitality INT;
    v_out_pvp_tickets INT;
BEGIN
    SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- 行動力 (5分 = 300秒 / 1pt, 上限100)
    v_out_vitality := v_user.vitality;
    IF v_user.vitality < 100 THEN
        v_elapsed_sec := EXTRACT(EPOCH FROM (v_now - COALESCE(v_user.vitality_last_recovered_at, v_now)));
        v_recovery_amount := FLOOR(v_elapsed_sec / 300);
        IF v_recovery_amount > 0 THEN
            v_out_vitality := LEAST(100, v_user.vitality + v_recovery_amount);
            UPDATE users SET vitality = v_out_vitality, vitality_last_recovered_at = v_now WHERE id = p_user_id;
        END IF;
    END IF;

    -- PvPポイント (30分 = 1800秒 / 1pt, 上限5)
    v_out_pvp_tickets := v_user.pvp_tickets;
    IF v_user.pvp_tickets < 5 THEN
        v_pvp_elapsed_sec := EXTRACT(EPOCH FROM (v_now - COALESCE(v_user.pvp_tickets_last_recovered_at, v_now)));
        v_pvp_recovery := FLOOR(v_pvp_elapsed_sec / 1800);
        IF v_pvp_recovery > 0 THEN
            v_out_pvp_tickets := LEAST(5, v_user.pvp_tickets + v_pvp_recovery);
            UPDATE users SET pvp_tickets = v_out_pvp_tickets, pvp_tickets_last_recovered_at = v_now WHERE id = p_user_id;
        END IF;
    END IF;

    RETURN json_build_object(
        'out_vitality', v_out_vitality,
        'out_pvp_tickets', v_out_pvp_tickets
    );
END;
$$;
