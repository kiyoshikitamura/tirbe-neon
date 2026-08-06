ALTER TABLE public.raid_bosses
  ADD COLUMN IF NOT EXISTS cycle_id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.raid_rewards_master
  ADD COLUMN IF NOT EXISTS reward_xp INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.raid_completion_xp_grants (
  raid_cycle_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_xp INTEGER NOT NULL CHECK (reward_xp >= 0),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (raid_cycle_id, user_id)
);

ALTER TABLE public.raid_completion_xp_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own raid completion xp" ON public.raid_completion_xp_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_raid_boss_damage_v2(
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
  v_boss public.raid_bosses%ROWTYPE;
  v_remaining_hp BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_damage IS NULL OR p_damage <= 0 THEN
    RAISE EXCEPTION 'Damage must be positive';
  END IF;

  SELECT * INTO v_boss
  FROM public.raid_bosses
  WHERE boss_id = p_boss_id AND status = 'ACTIVE' AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Raid boss is not active';
  END IF;

  v_remaining_hp := GREATEST(0, v_boss.current_hp - p_damage);
  UPDATE public.raid_bosses
  SET current_hp = v_remaining_hp,
      status = CASE WHEN v_remaining_hp = 0 THEN 'DEFEATED' ELSE 'ACTIVE' END
  WHERE id = v_boss.id;

  INSERT INTO public.raid_damage_logs (boss_id, user_id, damage)
  VALUES (p_boss_id, p_user_id, p_damage);

  RETURN jsonb_build_object(
    'status', 'success',
    'remaining_hp', v_remaining_hp,
    'defeated', v_remaining_hp = 0
  );
END;
$$;

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
        PERFORM public.add_user_xp(v_participant.user_id, v_reward_xp);
        v_granted := v_granted + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_granted;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_respawn_raid_boss(
  p_boss_id TEXT,
  p_max_hp INTEGER,
  p_base_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raid_bosses
  SET current_hp = p_max_hp,
      max_hp = p_max_hp,
      base_id = p_base_id,
      status = 'ACTIVE',
      cycle_id = gen_random_uuid(),
      expires_at = now() + interval '24 hours'
  WHERE boss_id = p_boss_id;

  DELETE FROM public.raid_damage_logs WHERE boss_id = p_boss_id;
  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.grant_raid_completion_xp(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_raid_completion_xp(TEXT) TO authenticated;
