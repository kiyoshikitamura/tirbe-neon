-- Phase 3-A: Missing SQL Stubs

-- 1. initialize_new_user
CREATE OR REPLACE FUNCTION public.initialize_new_user(p_user_id UUID, p_name TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. donate_to_guild
CREATE OR REPLACE FUNCTION public.donate_to_guild(p_user_id UUID, p_guild_id UUID, p_amount INTEGER)
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. claim_gvg_base
CREATE OR REPLACE FUNCTION public.claim_gvg_base(p_guild_id UUID, p_base_id TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. reset_daily_power_rankings
CREATE OR REPLACE FUNCTION public.reset_daily_power_rankings()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. reset_seasonal_power_rankings
CREATE OR REPLACE FUNCTION public.reset_seasonal_power_rankings()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. admin_update_guild (used in Phase 2-G)
CREATE OR REPLACE FUNCTION public.admin_update_guild(p_guild_id UUID, p_funds NUMERIC, p_level INTEGER, p_xp INTEGER)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.guilds SET funds = p_funds, level = p_level, xp = p_xp WHERE id = p_guild_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. admin_add_guild_funds (used in Phase 2-G)
CREATE OR REPLACE FUNCTION public.admin_add_guild_funds(p_guild_id UUID, p_amount NUMERIC)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.guilds SET funds = funds + p_amount WHERE id = p_guild_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. admin_update_guild_finals (used in Phase 2-G)
CREATE OR REPLACE FUNCTION public.admin_update_guild_finals(p_guild_id UUID, p_funds_add NUMERIC, p_decorations JSONB)
RETURNS JSONB AS $$
BEGIN
    UPDATE public.guilds SET funds = funds + p_funds_add, unlocked_decorations = p_decorations WHERE id = p_guild_id;
    RETURN jsonb_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
