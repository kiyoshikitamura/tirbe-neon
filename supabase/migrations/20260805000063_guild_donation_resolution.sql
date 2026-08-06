ALTER TABLE public.guild_members ADD COLUMN IF NOT EXISTS weekly_contribution INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.guild_members ADD COLUMN IF NOT EXISTS total_contribution INTEGER NOT NULL DEFAULT 0;

INSERT INTO public.guild_xp_action_master (action_type, xp_grant, contribution_grant) VALUES
  ('DONATE_SMALL', 20, 10),
  ('DONATE_MEDIUM', 120, 60),
  ('DONATE_LARGE', 300, 150)
ON CONFLICT (action_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.donate_to_guild(p_user_id UUID, p_guild_id UUID, p_amount INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_action_type TEXT;
  v_xp_grant INTEGER;
  v_contribution_grant INTEGER;
  v_cash BIGINT;
  v_funds BIGINT;
  v_level INTEGER;
  v_xp INTEGER;
  v_next_xp INTEGER;
  v_next_level INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Only the current user can donate'; END IF;
  v_action_type := CASE p_amount WHEN 1000 THEN 'DONATE_SMALL' WHEN 5000 THEN 'DONATE_MEDIUM' WHEN 10000 THEN 'DONATE_LARGE' ELSE NULL END;
  IF v_action_type IS NULL THEN RAISE EXCEPTION 'Invalid donation amount'; END IF;
  SELECT xp_grant, contribution_grant INTO v_xp_grant, v_contribution_grant FROM public.guild_xp_action_master WHERE action_type = v_action_type;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guild donation master is not configured'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Guild membership required'; END IF;
  SELECT cash INTO v_cash FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF v_cash < p_amount THEN RAISE EXCEPTION 'Insufficient cash'; END IF;
  SELECT funds, level, xp INTO v_funds, v_level, v_xp FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guild not found'; END IF;
  SELECT next_xp INTO v_next_xp FROM public.guild_level_master WHERE level = v_level;
  v_next_level := v_level;
  IF v_next_xp IS NOT NULL AND v_xp + v_xp_grant >= v_next_xp AND EXISTS (SELECT 1 FROM public.guild_level_master WHERE level = v_level + 1) THEN
    v_next_level := v_level + 1;
    v_xp := v_xp + v_xp_grant - v_next_xp;
  ELSE
    v_xp := v_xp + v_xp_grant;
  END IF;
  UPDATE public.users SET cash = cash - p_amount WHERE id = auth.uid() RETURNING cash INTO v_cash;
  UPDATE public.guilds SET funds = COALESCE(v_funds, 0) + p_amount, level = v_next_level, xp = v_xp WHERE id = p_guild_id RETURNING funds INTO v_funds;
  UPDATE public.guild_members
  SET weekly_contribution = weekly_contribution + v_contribution_grant,
      total_contribution = total_contribution + v_contribution_grant,
      contribution_points = COALESCE(contribution_points, 0) + v_contribution_grant
  WHERE guild_id = p_guild_id AND user_id = auth.uid();
  RETURN jsonb_build_object('status', 'success', 'next_cash', v_cash, 'next_funds', v_funds, 'xp_gained', v_xp_grant, 'contribution_gained', v_contribution_grant, 'level', v_next_level, 'xp', v_xp);
END;
$$;

REVOKE ALL ON FUNCTION public.donate_to_guild(UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.donate_to_guild(UUID, UUID, INTEGER) TO authenticated;
