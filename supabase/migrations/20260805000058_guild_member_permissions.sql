CREATE OR REPLACE FUNCTION public.transfer_guild_leader(p_guild_id UUID, p_old_id UUID, p_new_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_old_id THEN
    RAISE EXCEPTION 'Only the current guild master can transfer leadership';
  END IF;
  IF p_old_id = p_new_id OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_old_id AND role = 'MASTER'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_new_id
  ) THEN
    RAISE EXCEPTION 'Invalid guild leadership transfer';
  END IF;
  UPDATE public.guild_members
  SET role = CASE WHEN user_id = p_old_id THEN 'SUBMASTER' ELSE 'MASTER' END
  WHERE guild_id = p_guild_id AND user_id IN (p_old_id, p_new_id);
  UPDATE public.guilds SET leader_id = p_new_id WHERE id = p_guild_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_guild_member_role(p_guild_id UUID, p_target_user_id UUID, p_new_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid() AND role = 'MASTER'
  ) THEN
    RAISE EXCEPTION 'Only the guild master can change member roles';
  END IF;
  IF p_target_user_id = auth.uid() OR p_new_role IS NULL OR p_new_role NOT IN ('MEMBER', 'SUBMASTER') OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_target_user_id AND role <> 'MASTER'
  ) THEN
    RAISE EXCEPTION 'Invalid guild role change';
  END IF;
  UPDATE public.guild_members SET role = p_new_role
  WHERE guild_id = p_guild_id AND user_id = p_target_user_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.kick_guild_member(p_guild_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_role TEXT;
  v_target_role TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid guild member removal';
  END IF;
  SELECT role INTO v_actor_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid();
  SELECT role INTO v_target_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_user_id;
  IF NOT COALESCE(
    (v_actor_role = 'MASTER' AND v_target_role IN ('SUBMASTER', 'MEMBER'))
    OR (v_actor_role = 'SUBMASTER' AND v_target_role = 'MEMBER'),
    FALSE
  ) THEN
    RAISE EXCEPTION 'Insufficient guild member removal permission';
  END IF;
  DELETE FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_user_id;
  UPDATE public.users SET last_guild_left_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_guild_leader(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_guild_member_role(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kick_guild_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_guild_leader(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_guild_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_guild_member(UUID, UUID) TO authenticated;
