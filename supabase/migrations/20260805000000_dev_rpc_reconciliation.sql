-- Development reconciliation RPCs.
-- The existing development database was created without migration history.
-- Apply this file only after reviewing the remote schema and taking a backup.

CREATE OR REPLACE FUNCTION public.donate_to_guild(
  p_user_id UUID,
  p_guild_id UUID,
  p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash BIGINT;
  v_funds BIGINT;
  v_is_member BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'invalid donation amount';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id AND user_id = p_user_id
  ) INTO v_is_member;
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'guild membership required';
  END IF;

  UPDATE public.users
  SET cash = cash - p_amount
  WHERE id = p_user_id AND cash >= p_amount
  RETURNING cash INTO v_cash;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient cash';
  END IF;

  UPDATE public.guilds
  SET funds = COALESCE(funds, 0) + p_amount
  WHERE id = p_guild_id
  RETURNING funds INTO v_funds;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'guild not found';
  END IF;

  UPDATE public.guild_members
  SET contribution_points = COALESCE(contribution_points, 0) + p_amount
  WHERE guild_id = p_guild_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'next_cash', v_cash,
    'next_funds', v_funds
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_pvp_match_result(
  p_user_id UUID,
  p_target_user_id UUID,
  p_is_win BOOLEAN,
  p_point_diff INTEGER,
  p_cash_reward INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
  v_cash BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_point_diff IS NULL OR p_point_diff < -1000 OR p_point_diff > 1000 THEN
    RAISE EXCEPTION 'invalid point change';
  END IF;
  IF p_cash_reward IS NULL OR p_cash_reward < 0 OR p_cash_reward > 1000000 THEN
    RAISE EXCEPTION 'invalid cash reward';
  END IF;

  INSERT INTO public.pvp_ranks (user_id, rank_points, daily_wins, season_wins)
  VALUES (
    p_user_id,
    GREATEST(1000 + p_point_diff, 0),
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    CASE WHEN p_is_win THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    rank_points = GREATEST(COALESCE(public.pvp_ranks.rank_points, 0) + p_point_diff, 0),
    daily_wins = COALESCE(public.pvp_ranks.daily_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    season_wins = COALESCE(public.pvp_ranks.season_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    updated_at = now();

  UPDATE public.users
  SET cash = cash + p_cash_reward
  WHERE id = p_user_id
  RETURNING cash INTO v_cash;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  SELECT rank_points INTO v_points
  FROM public.pvp_ranks
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'rank_points', v_points,
    'cash', v_cash,
    'target_user_id', p_target_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_raid_boss_damage(
  p_user_id UUID,
  p_boss_id TEXT,
  p_damage INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_hp BIGINT;
  v_max_hp BIGINT;
  v_status TEXT;
  v_new_hp BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_damage IS NULL OR p_damage <= 0 OR p_damage > 1000000000 THEN
    RAISE EXCEPTION 'invalid damage';
  END IF;

  SELECT current_hp, max_hp, status
  INTO v_current_hp, v_max_hp, v_status
  FROM public.raid_bosses
  WHERE boss_id = p_boss_id AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND OR v_status = 'DEFEATED' OR COALESCE(v_current_hp, 0) <= 0 THEN
    RAISE EXCEPTION 'raid boss is not active';
  END IF;

  v_new_hp := GREATEST(v_current_hp - p_damage, 0);
  UPDATE public.raid_bosses
  SET current_hp = v_new_hp,
      status = CASE WHEN v_new_hp = 0 THEN 'DEFEATED' ELSE status END
  WHERE boss_id = p_boss_id;

  INSERT INTO public.raid_damage_logs (boss_id, user_id, damage)
  VALUES (p_boss_id, p_user_id, p_damage);

  RETURN jsonb_build_object(
    'status', 'success',
    'damage', p_damage,
    'remaining_hp', v_new_hp,
    'defeated', v_new_hp = 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_gvg_battle_result_v2(
  p_user_id UUID,
  p_guild_id UUID,
  p_base_id TEXT,
  p_is_practice BOOLEAN,
  p_is_win BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER := CASE WHEN p_is_win THEN 250 ELSE -100 END;
  v_season_points INTEGER;
  v_daily_points INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'guild membership required';
  END IF;
  IF p_is_practice THEN
    RETURN jsonb_build_object('status', 'success', 'practice', true);
  END IF;

  INSERT INTO public.user_gvg_ranks (user_id, season_points)
  VALUES (p_user_id, GREATEST(v_points, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    season_points = GREATEST(COALESCE(public.user_gvg_ranks.season_points, 0) + v_points, 0),
    updated_at = now();

  INSERT INTO public.guild_base_controls (base_id, guild_id, daily_points, is_controlling)
  VALUES (p_base_id, p_guild_id, GREATEST(v_points, 0), p_is_win)
  ON CONFLICT (base_id) DO UPDATE SET
    guild_id = CASE WHEN p_is_win THEN p_guild_id ELSE public.guild_base_controls.guild_id END,
    daily_points = CASE
      WHEN p_is_win AND public.guild_base_controls.guild_id = p_guild_id
        THEN COALESCE(public.guild_base_controls.daily_points, 0) + v_points
      WHEN p_is_win THEN GREATEST(v_points, 0)
      WHEN public.guild_base_controls.guild_id = p_guild_id
        THEN GREATEST(COALESCE(public.guild_base_controls.daily_points, 0) + v_points, 0)
      ELSE public.guild_base_controls.daily_points
    END,
    is_controlling = CASE WHEN p_is_win THEN true ELSE public.guild_base_controls.is_controlling END,
    updated_at = now();

  SELECT season_points INTO v_season_points
  FROM public.user_gvg_ranks WHERE user_id = p_user_id;
  SELECT daily_points INTO v_daily_points
  FROM public.guild_base_controls
  WHERE base_id = p_base_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'season_points', v_season_points,
    'daily_points', v_daily_points
  );
END;
$$;
