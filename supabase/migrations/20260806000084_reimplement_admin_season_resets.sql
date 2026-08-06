CREATE OR REPLACE FUNCTION public.gvg_season_reset()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN RAISE EXCEPTION 'admin role required'; END IF;
  DELETE FROM public.user_gvg_ranks;
  UPDATE public.guild_base_controls SET daily_points = 0, total_seasonal_days = 0, is_controlling = false, updated_at = now();
  INSERT INTO public.gvg_season_status (id, current_day, updated_at) VALUES (1, 1, now())
  ON CONFLICT (id) DO UPDATE SET current_day = 1, updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.pvp_season_reset(p_user_id UUID, p_current_rate INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reward public.pvp_rewards_master%ROWTYPE;
BEGIN
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN RAISE EXCEPTION 'admin role required'; END IF;
  SELECT * INTO v_reward FROM public.pvp_rewards_master WHERE threshold_points <= p_current_rate ORDER BY threshold_points DESC LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
    VALUES (p_user_id, v_reward.reward_item_id, v_reward.reward_quantity, 'PvP season reward', 'UNCLAIMED', now(), now() + interval '1 day');
  END IF;
  UPDATE public.pvp_ranks SET rank_points = 1000, daily_wins = 0, season_wins = 0, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.raid_boss_defeat()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN RAISE EXCEPTION 'admin role required'; END IF;
  UPDATE public.raid_bosses SET current_hp = max_hp, status = 'ACTIVE', expires_at = now() + interval '1 day';
  DELETE FROM public.raid_damage_logs;
END;
$$;

CREATE OR REPLACE FUNCTION public.raid_season_reset()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN RAISE EXCEPTION 'admin role required'; END IF;
  DELETE FROM public.raid_damage_logs;
  DELETE FROM public.user_raid_claimed_rewards;
  UPDATE public.raid_bosses SET current_hp = max_hp, status = 'ACTIVE', expires_at = now() + interval '1 day';
END;
$$;

CREATE OR REPLACE FUNCTION public.process_gvg_battle_result_v2(
  p_user_id UUID, p_guild_id UUID, p_base_id TEXT, p_is_practice BOOLEAN, p_is_win BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_is_practice THEN RETURN jsonb_build_object('status', 'success', 'practice', true); END IF;
  RAISE EXCEPTION 'Official GvG results must be resolved through resolve-battle';
END;
$$;
