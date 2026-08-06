CREATE OR REPLACE FUNCTION public.update_guild_alignment(p_guild_id UUID, p_main TEXT, p_sub TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid() AND role = 'MASTER'
  ) THEN
    RAISE EXCEPTION 'Only the guild master can change guild alignment';
  END IF;
  IF p_main NOT IN ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS') OR p_sub NOT IN ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS') THEN
    RAISE EXCEPTION 'Invalid guild alignment';
  END IF;
  UPDATE public.guilds SET main_alignment = p_main, sub_alignment = p_sub WHERE id = p_guild_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_guild(p_user_id UUID, p_guild_id UUID, p_is_master BOOLEAN, p_has_others BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_other_member_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Only the current user can leave a guild';
  END IF;
  SELECT role INTO v_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Guild membership required';
  END IF;
  SELECT count(*) INTO v_other_member_count
  FROM public.guild_members WHERE guild_id = p_guild_id AND user_id <> auth.uid();
  IF v_role = 'MASTER' AND v_other_member_count > 0 THEN
    RAISE EXCEPTION 'Transfer guild leadership before leaving';
  END IF;
  IF v_role = 'MASTER' THEN
    DELETE FROM public.guilds WHERE id = p_guild_id;
  ELSE
    DELETE FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid();
  END IF;
  UPDATE public.users SET last_guild_left_at = now() WHERE id = auth.uid();
  RETURN jsonb_build_object('status', 'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_guild_settings(p_guild_id UUID, p_desc TEXT, p_approval BOOLEAN, p_kick_days INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid() AND role = 'MASTER'
  ) THEN
    RAISE EXCEPTION 'Only the guild master can change guild settings';
  END IF;
  IF p_desc IS NULL OR char_length(p_desc) > 200 OR p_approval IS NULL OR p_kick_days IS NULL OR p_kick_days < 0 OR p_kick_days > 30 THEN
    RAISE EXCEPTION 'Invalid guild settings';
  END IF;
  UPDATE public.guilds
  SET description = p_desc, approval_required = p_approval, auto_kick_days = p_kick_days
  WHERE id = p_guild_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.update_guild_alignment(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_guild(UUID, UUID, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_guild_settings(UUID, TEXT, BOOLEAN, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_guild_alignment(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_guild(UUID, UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_guild_settings(UUID, TEXT, BOOLEAN, INTEGER) TO authenticated;
