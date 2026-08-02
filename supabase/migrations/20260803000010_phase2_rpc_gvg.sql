-- 14. GVG Battle Result Full RPC
CREATE OR REPLACE FUNCTION public.process_gvg_battle_result_v2(
    p_user_id UUID, 
    p_guild_id UUID, 
    p_base_id TEXT, 
    p_is_practice BOOLEAN, 
    p_is_win BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_season_rec record;
    v_current_day INTEGER := 1;
    v_is_final_day BOOLEAN := false;
    v_match public.gvg_matches%ROWTYPE;
    v_is_guild_a BOOLEAN;
    v_my_next_pts INTEGER;
    v_opp_next_pts INTEGER;
    v_rank public.user_gvg_ranks%ROWTYPE;
    v_base public.guild_base_controls%ROWTYPE;
BEGIN
    IF p_is_practice THEN
        -- Practice match, just returns success
        RETURN jsonb_build_object('status', 'success', 'practice', true);
    END IF;

    -- Fetch current day
    SELECT current_day INTO v_current_day FROM public.gvg_season_status WHERE id = 1;
    IF v_current_day = 7 THEN v_is_final_day := true; END IF;

    -- Fetch match
    SELECT * INTO v_match FROM public.gvg_matches WHERE status = 'ONGOING' AND is_finals = v_is_final_day AND (guild_a_id = p_guild_id OR guild_b_id = p_guild_id) LIMIT 1;
    IF v_match.id IS NOT NULL THEN
        v_is_guild_a := (v_match.guild_a_id = p_guild_id);
    END IF;

    IF p_is_win THEN
        -- Win Logic
        IF v_match.id IS NOT NULL THEN
            IF v_is_guild_a THEN
                UPDATE public.gvg_matches SET guild_a_points = COALESCE(guild_a_points, 0) + 250 WHERE id = v_match.id;
            ELSE
                UPDATE public.gvg_matches SET guild_b_points = COALESCE(guild_b_points, 0) + 250 WHERE id = v_match.id;
            END IF;
        END IF;

        INSERT INTO public.user_gvg_ranks (user_id, season_points) VALUES (p_user_id, 250)
        ON CONFLICT (user_id) DO UPDATE SET season_points = public.user_gvg_ranks.season_points + 250;

        INSERT INTO public.guild_base_controls (base_id, guild_id, daily_points) VALUES (p_base_id, p_guild_id, 250)
        ON CONFLICT (base_id, guild_id) DO UPDATE SET daily_points = public.guild_base_controls.daily_points + 250;

    ELSE
        -- Loss Logic
        IF v_match.id IS NOT NULL THEN
            IF v_is_guild_a THEN
                UPDATE public.gvg_matches SET 
                    guild_a_points = GREATEST(COALESCE(guild_a_points, 0) - 100, 0),
                    guild_b_points = COALESCE(guild_b_points, 0) + 100
                WHERE id = v_match.id;
            ELSE
                UPDATE public.gvg_matches SET 
                    guild_b_points = GREATEST(COALESCE(guild_b_points, 0) - 100, 0),
                    guild_a_points = COALESCE(guild_a_points, 0) + 100
                WHERE id = v_match.id;
            END IF;
        END IF;

        INSERT INTO public.user_gvg_ranks (user_id, season_points) VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO UPDATE SET season_points = GREATEST(public.user_gvg_ranks.season_points - 100, 0);

        INSERT INTO public.guild_base_controls (base_id, guild_id, daily_points) VALUES (p_base_id, p_guild_id, 0)
        ON CONFLICT (base_id, guild_id) DO UPDATE SET daily_points = GREATEST(public.guild_base_controls.daily_points - 100, 0);

    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
