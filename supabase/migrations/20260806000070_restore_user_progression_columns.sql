-- The development baseline predates player progression columns, while several
-- RPCs and the client already depend on them. Restore the canonical defaults
-- without changing existing player rows.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_level_positive_check,
  ADD CONSTRAINT users_level_positive_check CHECK (level BETWEEN 1 AND 99) NOT VALID,
  DROP CONSTRAINT IF EXISTS users_xp_nonnegative_check,
  ADD CONSTRAINT users_xp_nonnegative_check CHECK (xp >= 0) NOT VALID;

-- Keep the progression mutation itself private so server-side reward grants
-- can award multiple users without exposing cross-user updates to clients.
CREATE OR REPLACE FUNCTION public.apply_user_xp(p_user_id UUID, p_xp_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level INTEGER;
  v_xp INTEGER;
  v_next_xp INTEGER;
  v_leveled_up BOOLEAN := false;
BEGIN
  IF p_xp_amount < 0 THEN
    RAISE EXCEPTION 'XP amount must not be negative';
  END IF;

  SELECT level, xp
  INTO v_level, v_xp
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_level < 99 THEN
    v_xp := v_xp + p_xp_amount;
    LOOP
      SELECT next_xp
      INTO v_next_xp
      FROM public.user_level_master
      WHERE level = v_level;

      EXIT WHEN v_next_xp IS NULL OR v_next_xp = 0 OR v_xp < v_next_xp OR v_level >= 99;
      v_xp := v_xp - v_next_xp;
      v_level := v_level + 1;
      v_leveled_up := true;
    END LOOP;

    IF v_level = 99 THEN
      v_xp := 0;
    END IF;

    UPDATE public.users
    SET level = v_level, xp = v_xp
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object('level', v_level, 'xp', v_xp, 'leveled_up', v_leveled_up);
END;
$$;

-- This is the only client-callable XP entry point. A player cannot add XP to
-- another account by substituting a different UUID.
CREATE OR REPLACE FUNCTION public.add_user_xp(p_user_id UUID, p_xp_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'You may only update your own XP';
  END IF;

  RETURN public.apply_user_xp(p_user_id, p_xp_amount);
END;
$$;

-- Raid completion awards all participants in one transaction, so it must use
-- the private mutation function rather than the player-facing wrapper.
CREATE OR REPLACE FUNCTION public.grant_raid_completion_xp(p_boss_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boss public.raid_bosses%ROWTYPE;
  v_participant RECORD;
  v_reward_xp INTEGER;
  v_granted INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.raid_damage_logs
    WHERE boss_id = p_boss_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Raid participation is required';
  END IF;

  SELECT * INTO v_boss
  FROM public.raid_bosses
  WHERE boss_id = p_boss_id AND status = 'DEFEATED'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Raid boss is not defeated';
  END IF;

  FOR v_participant IN
    SELECT user_id, SUM(damage)::BIGINT AS total_damage
    FROM public.raid_damage_logs
    WHERE boss_id = p_boss_id
    GROUP BY user_id
  LOOP
    SELECT COALESCE(MAX(reward_xp), 0) INTO v_reward_xp
    FROM public.raid_rewards_master
    WHERE reward_type = 'DEFEAT_XP'
      AND threshold_val <= v_participant.total_damage;

    IF v_reward_xp > 0 THEN
      INSERT INTO public.raid_completion_xp_grants (raid_cycle_id, user_id, reward_xp)
      VALUES (v_boss.cycle_id, v_participant.user_id, v_reward_xp)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN
        PERFORM public.apply_user_xp(v_participant.user_id, v_reward_xp);
        v_granted := v_granted + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_granted;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_user_xp(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_user_xp(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_user_xp(UUID, INTEGER) TO authenticated;
