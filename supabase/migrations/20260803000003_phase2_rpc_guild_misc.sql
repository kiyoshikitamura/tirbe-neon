-- 7. Guild non-economic RPCs
CREATE OR REPLACE FUNCTION public.update_guild_alignment(p_guild_id UUID, p_main TEXT, p_sub TEXT) RETURNS JSONB AS $$
BEGIN
    UPDATE public.guilds SET main_alignment = p_main, sub_alignment = p_sub WHERE id = p_guild_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.leave_guild(p_user_id UUID, p_guild_id UUID, p_is_master BOOLEAN, p_has_others BOOLEAN) RETURNS JSONB AS $$
BEGIN
    IF p_is_master AND NOT p_has_others THEN
        DELETE FROM public.guilds WHERE id = p_guild_id;
    ELSE
        DELETE FROM public.guild_members WHERE user_id = p_user_id;
    END IF;
    UPDATE public.users SET last_guild_left_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.transfer_guild_leader(p_guild_id UUID, p_old_id UUID, p_new_id UUID) RETURNS JSONB AS $$
BEGIN
    UPDATE public.guild_members SET role = 'SUBMASTER' WHERE user_id = p_old_id;
    UPDATE public.guild_members SET role = 'MASTER' WHERE user_id = p_new_id;
    UPDATE public.guilds SET leader_id = p_new_id WHERE id = p_guild_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.kick_guild_member(p_guild_id UUID, p_user_id UUID) RETURNS JSONB AS $$
BEGIN
    DELETE FROM public.guild_members WHERE user_id = p_user_id AND guild_id = p_guild_id;
    UPDATE public.users SET last_guild_left_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_guild_settings(p_guild_id UUID, p_desc TEXT, p_approval BOOLEAN, p_kick_days INTEGER) RETURNS JSONB AS $$
BEGIN
    UPDATE public.guilds SET description = p_desc, approval_required = p_approval, auto_kick_days = p_kick_days WHERE id = p_guild_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.equip_guild_decoration(p_guild_id UUID, p_type TEXT, p_item_id TEXT) RETURNS JSONB AS $$
BEGIN
    IF p_type = 'DECORATION' THEN
        UPDATE public.guilds SET equipped_decoration = p_item_id WHERE id = p_guild_id;
    ELSE
        UPDATE public.guilds SET equipped_banner = p_item_id WHERE id = p_guild_id;
    END IF;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
