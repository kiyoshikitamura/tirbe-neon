CREATE OR REPLACE FUNCTION public.create_guild_v2(p_user_id UUID, p_guild_name TEXT, p_creation_cost INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cash BIGINT;
  v_level INTEGER;
  v_last_left_at TIMESTAMPTZ;
  v_new_guild_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Only the current user can create a guild'; END IF;
  IF p_guild_name IS NULL OR char_length(trim(p_guild_name)) = 0 OR p_creation_cost <> 5000 THEN RAISE EXCEPTION 'Invalid guild creation request'; END IF;
  SELECT cash, level, last_guild_left_at INTO v_cash, v_level, v_last_left_at FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_level < 8 OR v_cash < 5000 THEN RAISE EXCEPTION 'Guild creation requirements are not met'; END IF;
  IF v_last_left_at IS NOT NULL AND v_last_left_at > now() - interval '24 hours' THEN RAISE EXCEPTION 'Guild rejoin cooldown is active'; END IF;
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'Leave the current guild before creating another guild'; END IF;
  INSERT INTO public.guilds (name, leader_id, level, xp, funds) VALUES (trim(p_guild_name), auth.uid(), 1, 0, 0) RETURNING id INTO v_new_guild_id;
  INSERT INTO public.guild_members (guild_id, user_id, role, weekly_contribution, total_contribution) VALUES (v_new_guild_id, auth.uid(), 'MASTER', 0, 0);
  UPDATE public.users SET cash = cash - 5000, guild_id = v_new_guild_id WHERE id = auth.uid();
  PERFORM public.evaluate_mission_progress(auth.uid(), 'GUILD_JOIN', 1);
  RETURN jsonb_build_object('status', 'success', 'guild_id', v_new_guild_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_guild(p_guild_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_level INTEGER;
  v_last_left_at TIMESTAMPTZ;
  v_approval_required BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  SELECT level, last_guild_left_at INTO v_level, v_last_left_at FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_level < 3 THEN RAISE EXCEPTION 'Guild joining requires user level 3'; END IF;
  IF v_last_left_at IS NOT NULL AND v_last_left_at > now() - interval '24 hours' THEN RAISE EXCEPTION 'Guild rejoin cooldown is active'; END IF;
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'Leave the current guild before joining another guild'; END IF;
  SELECT approval_required INTO v_approval_required FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guild not found'; END IF;
  IF COALESCE(v_approval_required, FALSE) THEN RAISE EXCEPTION 'Guild approval is required'; END IF;
  INSERT INTO public.guild_members (guild_id, user_id, role, weekly_contribution, total_contribution) VALUES (p_guild_id, auth.uid(), 'MEMBER', 0, 0);
  UPDATE public.users SET guild_id = p_guild_id WHERE id = auth.uid();
  PERFORM public.evaluate_mission_progress(auth.uid(), 'GUILD_JOIN', 1);
  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.create_guild_v2(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_guild(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guild_v2(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_guild(UUID) TO authenticated;
