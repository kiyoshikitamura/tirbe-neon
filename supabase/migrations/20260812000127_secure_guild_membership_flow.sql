-- Open Beta M5: searchable guild lobby, approval flow, and guild RLS lockdown.

CREATE TABLE IF NOT EXISTS public.guild_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS guild_join_requests_one_pending_per_user
  ON public.guild_join_requests(user_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS guild_join_requests_guild_status_idx
  ON public.guild_join_requests(guild_id, status, requested_at);

CREATE OR REPLACE FUNCTION public.sync_user_guild_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET guild_id = NEW.guild_id WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
  UPDATE public.users SET guild_id = NULL WHERE id = OLD.user_id AND guild_id = OLD.guild_id;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS sync_user_guild_membership_trigger ON public.guild_members;
CREATE TRIGGER sync_user_guild_membership_trigger
AFTER INSERT OR DELETE ON public.guild_members
FOR EACH ROW EXECUTE FUNCTION public.sync_user_guild_membership();

CREATE OR REPLACE FUNCTION public.is_current_guild_member(p_guild_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_guild_master(p_guild_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id AND user_id = auth.uid() AND role = 'MASTER'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_guild_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_guild_master(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_guild_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_guild_master(uuid) TO authenticated;

ALTER TABLE public.guild_join_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guild_join_requests_read ON public.guild_join_requests;
CREATE POLICY guild_join_requests_read ON public.guild_join_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_current_guild_master(guild_id));
REVOKE ALL ON TABLE public.guild_join_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.guild_join_requests TO authenticated;

DROP POLICY IF EXISTS "Allow all access to guilds" ON public.guilds;
DROP POLICY IF EXISTS "Allow all access to guild_members" ON public.guild_members;
DROP POLICY IF EXISTS guilds_member_read ON public.guilds;
DROP POLICY IF EXISTS guild_members_same_guild_read ON public.guild_members;
CREATE POLICY guilds_member_read ON public.guilds FOR SELECT TO authenticated
USING (public.is_current_guild_member(id));
CREATE POLICY guild_members_same_guild_read ON public.guild_members FOR SELECT TO authenticated
USING (public.is_current_guild_member(guild_id));
REVOKE INSERT, UPDATE, DELETE ON TABLE public.guilds FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.guild_members FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_guilds(p_query text DEFAULT '')
RETURNS TABLE (
  id uuid,
  name text,
  level integer,
  description text,
  approval_required boolean,
  member_count bigint,
  member_limit integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF char_length(COALESCE(p_query, '')) > 30 THEN RAISE EXCEPTION 'Guild search query is too long'; END IF;
  RETURN QUERY
  SELECT guild.id, guild.name, guild.level, guild.description, guild.approval_required,
         count(member.id), LEAST(COALESCE(level_master.max_members, 10), 20)
  FROM public.guilds guild
  LEFT JOIN public.guild_members member ON member.guild_id = guild.id
  LEFT JOIN public.guild_level_master level_master ON level_master.level = guild.level
  WHERE trim(COALESCE(p_query, '')) = '' OR guild.name ILIKE '%' || trim(p_query) || '%'
  GROUP BY guild.id, guild.name, guild.level, guild.description, guild.approval_required, level_master.max_members
  ORDER BY guild.level DESC, guild.name ASC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_guild_join(p_guild_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_level integer;
  v_last_left_at timestamptz;
  v_approval_required boolean;
  v_request_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  SELECT level, last_guild_left_at INTO v_level, v_last_left_at
  FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_level < 3 THEN RAISE EXCEPTION 'Guild joining requires user level 3'; END IF;
  IF v_last_left_at IS NOT NULL AND v_last_left_at > now() - interval '24 hours' THEN RAISE EXCEPTION 'Guild rejoin cooldown is active'; END IF;
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'Already in a guild'; END IF;
  SELECT approval_required INTO v_approval_required FROM public.guilds WHERE id = p_guild_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guild not found'; END IF;
  IF NOT v_approval_required THEN RAISE EXCEPTION 'This guild accepts direct joins'; END IF;
  IF EXISTS (SELECT 1 FROM public.guild_join_requests WHERE user_id = auth.uid() AND status = 'PENDING') THEN
    RAISE EXCEPTION 'A pending guild application already exists';
  END IF;
  INSERT INTO public.guild_join_requests(guild_id, user_id)
  VALUES (p_guild_id, auth.uid()) RETURNING id INTO v_request_id;
  RETURN jsonb_build_object('status', 'pending', 'request_id', v_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_guild_join_request(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  UPDATE public.guild_join_requests
  SET status = 'CANCELLED', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_request_id AND user_id = auth.uid() AND status = 'PENDING';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending guild application not found'; END IF;
  RETURN jsonb_build_object('status', 'cancelled');
END;
$$;

CREATE OR REPLACE FUNCTION public.review_guild_join_request(p_request_id uuid, p_approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_request public.guild_join_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  SELECT * INTO v_request FROM public.guild_join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'PENDING' THEN RAISE EXCEPTION 'Pending guild application not found'; END IF;
  IF NOT public.is_current_guild_master(v_request.guild_id) THEN RAISE EXCEPTION 'Only the guild master can review applications'; END IF;
  IF p_approve THEN
    IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = v_request.user_id) THEN RAISE EXCEPTION 'Applicant already belongs to a guild'; END IF;
    INSERT INTO public.guild_members(guild_id, user_id, role, weekly_contribution, total_contribution)
    VALUES (v_request.guild_id, v_request.user_id, 'MEMBER', 0, 0);
    UPDATE public.users SET guild_id = v_request.guild_id WHERE id = v_request.user_id;
    UPDATE public.guild_join_requests
    SET status = 'CANCELLED', reviewed_at = now(), reviewed_by = auth.uid()
    WHERE user_id = v_request.user_id AND status = 'PENDING' AND id <> p_request_id;
    PERFORM public.evaluate_mission_progress(v_request.user_id, 'GUILD_JOIN', 1);
  END IF;
  UPDATE public.guild_join_requests
  SET status = CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
      reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_request_id;
  RETURN jsonb_build_object('status', CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
END;
$$;

REVOKE ALL ON FUNCTION public.search_guilds(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_guild_join(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_guild_join_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_guild_join_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_guilds(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_guild_join(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_guild_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_guild_join_request(uuid, boolean) TO authenticated;

-- Disable obsolete caller-authoritative guild mutation routes retained by old clients.
REVOKE ALL ON FUNCTION public.create_guild(uuid, text, text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_guild(uuid, numeric, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_add_guild_funds(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_guild_finals(uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.buy_guild_decoration(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.guild_activity_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type, source_id)
);
ALTER TABLE public.guild_activity_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guild_activity_grants_own_read ON public.guild_activity_grants;
CREATE POLICY guild_activity_grants_own_read ON public.guild_activity_grants FOR SELECT TO authenticated
USING (user_id = auth.uid());
REVOKE ALL ON TABLE public.guild_activity_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.guild_activity_grants TO authenticated;

CREATE OR REPLACE FUNCTION public.record_guild_activity(p_action_type text, p_source_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_guild_id uuid;
  v_xp_grant integer;
  v_contribution_grant integer;
  v_level integer;
  v_xp integer;
  v_next_xp integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF p_action_type <> 'QUEST' OR NOT EXISTS (
    SELECT 1 FROM public.user_patrols
    WHERE id = p_source_id AND user_id = auth.uid() AND status = 'COMPLETED'
  ) THEN RAISE EXCEPTION 'Invalid guild activity source'; END IF;
  SELECT guild_id INTO v_guild_id FROM public.guild_members WHERE user_id = auth.uid();
  IF v_guild_id IS NULL THEN RETURN jsonb_build_object('status', 'not_in_guild'); END IF;
  SELECT xp_grant, contribution_grant INTO v_xp_grant, v_contribution_grant
  FROM public.guild_xp_action_master WHERE action_type = p_action_type;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guild activity master not found'; END IF;
  INSERT INTO public.guild_activity_grants(guild_id, user_id, action_type, source_id)
  VALUES (v_guild_id, auth.uid(), p_action_type, p_source_id)
  ON CONFLICT (user_id, action_type, source_id) DO NOTHING;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'already_recorded'); END IF;
  UPDATE public.guild_members
  SET weekly_contribution = weekly_contribution + v_contribution_grant,
      total_contribution = total_contribution + v_contribution_grant,
      contribution_points = COALESCE(contribution_points, 0) + v_contribution_grant
  WHERE guild_id = v_guild_id AND user_id = auth.uid();
  SELECT level, xp INTO v_level, v_xp FROM public.guilds WHERE id = v_guild_id FOR UPDATE;
  SELECT next_xp INTO v_next_xp FROM public.guild_level_master WHERE level = v_level;
  IF v_next_xp IS NOT NULL AND v_xp + v_xp_grant >= v_next_xp
     AND EXISTS (SELECT 1 FROM public.guild_level_master WHERE level = v_level + 1) THEN
    UPDATE public.guilds SET level = level + 1, xp = v_xp + v_xp_grant - v_next_xp WHERE id = v_guild_id;
  ELSE
    UPDATE public.guilds SET xp = xp + v_xp_grant WHERE id = v_guild_id;
  END IF;
  RETURN jsonb_build_object('status', 'success', 'xp_gained', v_xp_grant, 'contribution_gained', v_contribution_grant);
END;
$$;
REVOKE ALL ON FUNCTION public.record_guild_activity(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_guild_activity(text, uuid) TO authenticated;
