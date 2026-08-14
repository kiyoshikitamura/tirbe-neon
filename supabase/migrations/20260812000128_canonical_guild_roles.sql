-- Open Beta M5: canonicalize the finalized SUB_MASTER role identifier.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE role IS NULL OR role NOT IN ('MASTER', 'SUBMASTER', 'SUB_MASTER', 'MEMBER')
  ) THEN RAISE EXCEPTION 'Unsupported guild role must be remediated before canonicalization'; END IF;
END;
$$;

UPDATE public.guild_members SET role = 'SUB_MASTER' WHERE role = 'SUBMASTER';
ALTER TABLE public.guild_members DROP CONSTRAINT IF EXISTS guild_members_role_check;
ALTER TABLE public.guild_members ADD CONSTRAINT guild_members_role_check
  CHECK (role IN ('MASTER', 'SUB_MASTER', 'MEMBER'));

CREATE OR REPLACE FUNCTION public.transfer_guild_leader(p_guild_id uuid, p_old_id uuid, p_new_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_old_id THEN RAISE EXCEPTION 'Only the current guild master can transfer leadership'; END IF;
  IF p_old_id = p_new_id OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_old_id AND role = 'MASTER'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_new_id
  ) THEN RAISE EXCEPTION 'Invalid guild leadership transfer'; END IF;
  UPDATE public.guild_members
  SET role = CASE WHEN user_id = p_old_id THEN 'SUB_MASTER' ELSE 'MASTER' END
  WHERE guild_id = p_guild_id AND user_id IN (p_old_id, p_new_id);
  UPDATE public.guilds SET leader_id = p_new_id WHERE id = p_guild_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_guild_member_role(p_guild_id uuid, p_target_user_id uuid, p_new_role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_current_guild_master(p_guild_id) THEN RAISE EXCEPTION 'Only the guild master can change member roles'; END IF;
  IF p_target_user_id = auth.uid() OR p_new_role NOT IN ('MEMBER', 'SUB_MASTER') OR NOT EXISTS (
    SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_target_user_id AND role <> 'MASTER'
  ) THEN RAISE EXCEPTION 'Invalid guild role change'; END IF;
  UPDATE public.guild_members SET role = p_new_role WHERE guild_id = p_guild_id AND user_id = p_target_user_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.kick_guild_member(p_guild_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_role text; v_target_role text;
BEGIN
  IF auth.uid() IS NULL OR p_user_id = auth.uid() THEN RAISE EXCEPTION 'Invalid guild member removal'; END IF;
  SELECT role INTO v_actor_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid();
  SELECT role INTO v_target_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_user_id;
  IF NOT COALESCE(
    (v_actor_role = 'MASTER' AND v_target_role IN ('SUB_MASTER', 'MEMBER'))
    OR (v_actor_role = 'SUB_MASTER' AND v_target_role = 'MEMBER'), false
  ) THEN RAISE EXCEPTION 'Insufficient guild member removal permission'; END IF;
  DELETE FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = p_user_id;
  UPDATE public.users SET last_guild_left_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_guild_decoration_v2(
  p_guild_id uuid, p_type text, p_item_id text, p_cost bigint
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text; v_funds bigint; v_list jsonb; v_expected_cost bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  SELECT role INTO v_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid();
  IF COALESCE(v_role, '') NOT IN ('MASTER', 'SUB_MASTER') THEN RAISE EXCEPTION 'Only guild masters and submasters can purchase guild items'; END IF;
  v_expected_cost := CASE p_item_id
    WHEN 'bg_neon_kabukicho' THEN 5000 WHEN 'bg_industrial_docks' THEN 10000
    WHEN 'banner_neon_reign' THEN 3000 WHEN 'banner_kabukicho_king' THEN 8000 ELSE NULL END;
  IF p_type NOT IN ('DECORATION', 'BANNER') OR v_expected_cost IS NULL OR p_cost <> v_expected_cost
     OR (p_type = 'DECORATION' AND p_item_id NOT IN ('bg_neon_kabukicho', 'bg_industrial_docks'))
     OR (p_type = 'BANNER' AND p_item_id NOT IN ('banner_neon_reign', 'banner_kabukicho_king'))
  THEN RAISE EXCEPTION 'Invalid guild item purchase'; END IF;
  SELECT funds INTO v_funds FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guild not found'; END IF;
  IF v_funds < v_expected_cost THEN RETURN jsonb_build_object('error', 'Insufficient guild funds'); END IF;
  IF p_type = 'DECORATION' THEN
    SELECT COALESCE(unlocked_decorations, '[]'::jsonb) INTO v_list FROM public.guilds WHERE id = p_guild_id;
    IF v_list ? p_item_id THEN RETURN jsonb_build_object('error', 'Guild item already owned'); END IF;
    UPDATE public.guilds SET funds = funds - v_expected_cost, unlocked_decorations = v_list || to_jsonb(p_item_id) WHERE id = p_guild_id;
  ELSE
    SELECT COALESCE(unlocked_banners, '[]'::jsonb) INTO v_list FROM public.guilds WHERE id = p_guild_id;
    IF v_list ? p_item_id THEN RETURN jsonb_build_object('error', 'Guild item already owned'); END IF;
    UPDATE public.guilds SET funds = funds - v_expected_cost, unlocked_banners = v_list || to_jsonb(p_item_id) WHERE id = p_guild_id;
  END IF;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_guild_leader(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_guild_member_role(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.kick_guild_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.buy_guild_decoration_v2(uuid, text, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_guild_leader(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_guild_member_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_guild_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_guild_decoration_v2(uuid, text, text, bigint) TO authenticated;
