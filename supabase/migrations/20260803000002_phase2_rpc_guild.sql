-- 6. create_guild_v2
CREATE OR REPLACE FUNCTION public.create_guild_v2(
    p_user_id UUID, 
    p_guild_name TEXT, 
    p_creation_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_cash INTEGER;
    v_new_guild_id UUID;
    v_name_exists BOOLEAN;
BEGIN
    SELECT cash INTO v_cash FROM public.users WHERE id = p_user_id;
    IF v_cash IS NULL OR v_cash < p_creation_cost THEN
        RETURN jsonb_build_object('error', 'キャッシュが不足しています。');
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.guilds WHERE name = p_guild_name) INTO v_name_exists;
    IF v_name_exists THEN
        RETURN jsonb_build_object('error', 'このギルド名は既に登録されています。');
    END IF;

    INSERT INTO public.guilds (name, leader_id, level, xp, funds)
    VALUES (p_guild_name, p_user_id, 1, 0, 0)
    RETURNING id INTO v_new_guild_id;

    INSERT INTO public.guild_members (guild_id, user_id, role, weekly_contribution, total_contribution)
    VALUES (v_new_guild_id, p_user_id, 'MASTER', 0, 0);

    UPDATE public.users SET cash = cash - p_creation_cost, guild_id = v_new_guild_id WHERE id = p_user_id;

    PERFORM public.evaluate_mission_progress(p_user_id, 'GUILD_JOIN', 1);
    RETURN jsonb_build_object('status', 'success', 'guild_id', v_new_guild_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
