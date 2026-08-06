-- 12. Battle & Events RPCs
CREATE OR REPLACE FUNCTION public.consume_pvp_point(p_user_id UUID) RETURNS JSONB AS $$
DECLARE
    v_points INTEGER;
BEGIN
    SELECT pvp_points INTO v_points FROM public.users WHERE id = p_user_id FOR UPDATE;
    IF v_points < 1 THEN
        RETURN jsonb_build_object('error', 'PvPポイントが不足しています。');
    END IF;

    UPDATE public.users 
    SET pvp_points = pvp_points - 1,
        pvp_points_last_recovered_at = CASE WHEN pvp_points = 5 THEN now() ELSE pvp_points_last_recovered_at END
    WHERE id = p_user_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_pvp_match_result_v2(p_user_id UUID, p_is_win BOOLEAN, p_point_diff INTEGER, p_cash_reward INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_next_daily INTEGER;
    v_next_season INTEGER;
    v_next_points INTEGER;
BEGIN
    INSERT INTO public.pvp_ranks (user_id, rank_points, daily_wins, season_wins)
    VALUES (p_user_id, GREATEST(1000 + p_point_diff, 0), CASE WHEN p_is_win THEN 1 ELSE 0 END, CASE WHEN p_is_win THEN 1 ELSE 0 END)
    ON CONFLICT (user_id) DO UPDATE SET 
        rank_points = GREATEST(public.pvp_ranks.rank_points + p_point_diff, 0),
        daily_wins = public.pvp_ranks.daily_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
        season_wins = public.pvp_ranks.season_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END;

    IF p_cash_reward > 0 THEN
        UPDATE public.users SET cash = cash + p_cash_reward WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_raid_boss_damage_v2(p_user_id UUID, p_boss_id TEXT, p_damage INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_boss public.raid_bosses%ROWTYPE;
BEGIN
    SELECT * INTO v_boss FROM public.raid_bosses WHERE id = p_boss_id;
    IF v_boss.id IS NULL OR v_boss.status = 'DEFEATED' THEN
        RETURN jsonb_build_object('error', 'ボスは既に討伐されています。');
    END IF;

    IF v_boss.current_hp - p_damage <= 0 THEN
        UPDATE public.raid_bosses SET current_hp = 0, status = 'DEFEATED', updated_at = now() WHERE id = p_boss_id;
    ELSE
        UPDATE public.raid_bosses SET current_hp = current_hp - p_damage, updated_at = now() WHERE id = p_boss_id;
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.process_gvg_battle_result_v2(p_guild_id UUID, p_battle_id TEXT, p_points INTEGER, p_is_guild_a BOOLEAN)
RETURNS JSONB AS $$
BEGIN
    IF p_is_guild_a THEN
        UPDATE public.gvg_battles SET guild_a_points = guild_a_points + p_points WHERE id = p_battle_id;
    ELSE
        UPDATE public.gvg_battles SET guild_b_points = guild_b_points + p_points WHERE id = p_battle_id;
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
