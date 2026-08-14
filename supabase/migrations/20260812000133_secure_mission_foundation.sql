-- Open Beta M7-2a: secure, master-driven mission lifecycle foundation.

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS condition_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS prerequisite_mission_id text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_repeatable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_provisional boolean NOT NULL DEFAULT false;

UPDATE public.missions
SET description = COALESCE(description, desc_text, ''),
    category = CASE WHEN category = 'DAILY' THEN 'DAILY' ELSE 'NORMAL' END,
    is_repeatable = (category = 'DAILY'),
    reward_quantity = COALESCE(NULLIF(reward_quantity, 0), reward_qty, 1);

ALTER TABLE public.missions
  DROP CONSTRAINT IF EXISTS missions_category_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_category_check CHECK (category IN ('DAILY', 'NORMAL'));
ALTER TABLE public.missions
  DROP CONSTRAINT IF EXISTS missions_target_value_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_target_value_check CHECK (target_value > 0);
ALTER TABLE public.missions
  DROP CONSTRAINT IF EXISTS missions_reward_quantity_check;
ALTER TABLE public.missions
  ADD CONSTRAINT missions_reward_quantity_check CHECK (reward_quantity > 0);

ALTER TABLE public.user_missions
  ADD COLUMN IF NOT EXISTS cycle_date date;

UPDATE public.user_missions
SET status = CASE status
  WHEN 'IN_PROGRESS' THEN 'PROGRESS'
  WHEN 'COMPLETED' THEN 'CLEAR'
  ELSE status
END,
current_progress = GREATEST(current_progress, progress_val, 0);

ALTER TABLE public.user_missions
  DROP CONSTRAINT IF EXISTS user_missions_status_check;
ALTER TABLE public.user_missions
  ADD CONSTRAINT user_missions_status_check CHECK (status IN ('PROGRESS', 'CLEAR', 'CLAIMED'));
ALTER TABLE public.user_missions
  DROP CONSTRAINT IF EXISTS user_missions_progress_check;
ALTER TABLE public.user_missions
  ADD CONSTRAINT user_missions_progress_check CHECK (current_progress >= 0);

CREATE OR REPLACE FUNCTION public.sync_current_missions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cycle_date date := ((clock_timestamp() AT TIME ZONE 'Asia/Tokyo') - interval '4 hours')::date;
  v_rescue record;
  v_rescued integer := 0;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Player authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':missions', 0));

  FOR v_rescue IN
    SELECT um.mission_id, m.title, m.reward_item_id, m.reward_quantity
    FROM public.user_missions um
    JOIN public.missions m ON m.id = um.mission_id
    WHERE um.user_id = v_user_id
      AND m.category = 'DAILY'
      AND um.cycle_date IS DISTINCT FROM v_cycle_date
      AND um.status = 'CLEAR'
    FOR UPDATE OF um
  LOOP
    INSERT INTO public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
    VALUES (
      v_user_id, v_rescue.reward_item_id, v_rescue.reward_quantity,
      'デイリーミッション未受取救済: ' || v_rescue.title,
      'UNCLAIMED', clock_timestamp(), clock_timestamp() + interval '24 hours'
    );
    v_rescued := v_rescued + 1;
  END LOOP;

  UPDATE public.user_missions um
  SET current_progress = 0,
      progress_val = 0,
      status = 'PROGRESS',
      claimed_at = NULL,
      cycle_date = v_cycle_date,
      updated_at = clock_timestamp()
  FROM public.missions m
  WHERE um.user_id = v_user_id
    AND um.mission_id = m.id
    AND m.category = 'DAILY'
    AND um.cycle_date IS DISTINCT FROM v_cycle_date;

  INSERT INTO public.user_missions (user_id, mission_id, current_progress, progress_val, status, cycle_date)
  SELECT
    v_user_id, m.id, 0, 0, 'PROGRESS',
    CASE WHEN m.category = 'DAILY' THEN v_cycle_date ELSE NULL END
  FROM public.missions m
  WHERE m.is_enabled
    AND (
      m.category = 'DAILY'
      OR (
        m.category = 'NORMAL'
        AND (
          m.prerequisite_mission_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_missions prerequisite
            WHERE prerequisite.user_id = v_user_id
              AND prerequisite.mission_id = m.prerequisite_mission_id
              AND prerequisite.status = 'CLAIMED'
          )
        )
      )
    )
  ON CONFLICT (user_id, mission_id) DO NOTHING;

  UPDATE public.user_missions um
  SET current_progress = m.target_value,
      progress_val = m.target_value,
      status = 'CLEAR',
      updated_at = clock_timestamp()
  FROM public.missions m
  WHERE um.user_id = v_user_id
    AND um.mission_id = m.id
    AND m.category = 'DAILY'
    AND m.trigger_type = 'DAILY_LOGIN'
    AND um.cycle_date = v_cycle_date
    AND um.status = 'PROGRESS';

  RETURN jsonb_build_object('cycle_date', v_cycle_date, 'rescued_count', v_rescued);
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_mission_progress(
  p_user_id uuid,
  p_trigger_type text,
  p_progress_increment integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Mission progress owner mismatch';
  END IF;
  IF p_trigger_type IS NULL OR btrim(p_trigger_type) = '' OR p_progress_increment NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Invalid mission progress event';
  END IF;

  UPDATE public.user_missions um
  SET current_progress = LEAST(m.target_value, um.current_progress + p_progress_increment),
      progress_val = LEAST(m.target_value, um.current_progress + p_progress_increment),
      status = CASE WHEN um.current_progress + p_progress_increment >= m.target_value THEN 'CLEAR' ELSE 'PROGRESS' END,
      updated_at = clock_timestamp()
  FROM public.missions m
  WHERE um.user_id = p_user_id
    AND um.mission_id = m.id
    AND m.is_enabled
    AND m.trigger_type = p_trigger_type
    AND um.status = 'PROGRESS';
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_mission_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_mission public.missions%ROWTYPE;
  v_user_mission public.user_missions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR p_mission_id IS NULL THEN
    RAISE EXCEPTION 'Player authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':missions', 0));
  PERFORM public.sync_current_missions();

  SELECT * INTO v_user_mission
  FROM public.user_missions
  WHERE user_id = v_user_id AND mission_id = p_mission_id
  FOR UPDATE;

  IF NOT FOUND OR v_user_mission.status <> 'CLEAR' THEN
    RAISE EXCEPTION 'Mission reward is not claimable';
  END IF;

  SELECT * INTO STRICT v_mission FROM public.missions
  WHERE id = p_mission_id AND is_enabled;

  UPDATE public.user_missions
  SET status = 'CLAIMED', claimed_at = clock_timestamp(), updated_at = clock_timestamp()
  WHERE id = v_user_mission.id;

  INSERT INTO public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
  VALUES (
    v_user_id, v_mission.reward_item_id, v_mission.reward_quantity,
    'ミッション報酬: ' || v_mission.title,
    'UNCLAIMED', clock_timestamp(), clock_timestamp() + interval '24 hours'
  );

  INSERT INTO public.user_missions (user_id, mission_id, current_progress, progress_val, status)
  SELECT v_user_id, next_mission.id, 0, 0, 'PROGRESS'
  FROM public.missions next_mission
  WHERE next_mission.is_enabled
    AND next_mission.category = 'NORMAL'
    AND next_mission.prerequisite_mission_id = p_mission_id
  ON CONFLICT (user_id, mission_id) DO NOTHING;

  RETURN jsonb_build_object(
    'claimed', true,
    'mission_id', p_mission_id,
    'item_id', v_mission.reward_item_id,
    'quantity', v_mission.reward_quantity
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_all_mission_rewards(p_mission_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry record;
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL OR p_mission_ids IS NULL OR cardinality(p_mission_ids) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid mission claim request';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':missions', 0));
  PERFORM public.sync_current_missions();

  FOR v_entry IN
    SELECT um.id AS user_mission_id, um.mission_id, m.title, m.reward_item_id, m.reward_quantity
    FROM public.user_missions um
    JOIN public.missions m ON m.id = um.mission_id AND m.is_enabled
    WHERE um.user_id = v_user_id
      AND um.status = 'CLEAR'
      AND um.mission_id IN (SELECT DISTINCT unnest(p_mission_ids))
    FOR UPDATE OF um
  LOOP
    UPDATE public.user_missions
    SET status = 'CLAIMED', claimed_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE id = v_entry.user_mission_id;

    INSERT INTO public.presents (user_id, item_id, quantity, message, status, sent_at, expire_at)
    VALUES (
      v_user_id, v_entry.reward_item_id, v_entry.reward_quantity,
      'ミッション報酬: ' || v_entry.title,
      'UNCLAIMED', clock_timestamp(), clock_timestamp() + interval '24 hours'
    );

    INSERT INTO public.user_missions (user_id, mission_id, current_progress, progress_val, status)
    SELECT v_user_id, next_mission.id, 0, 0, 'PROGRESS'
    FROM public.missions next_mission
    WHERE next_mission.is_enabled
      AND next_mission.category = 'NORMAL'
      AND next_mission.prerequisite_mission_id = v_entry.mission_id
    ON CONFLICT (user_id, mission_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('claimed_count', v_count);
END;
$$;

DROP POLICY IF EXISTS "Allow all access to missions" ON public.missions;
DROP POLICY IF EXISTS missions_authenticated_read ON public.missions;
CREATE POLICY missions_authenticated_read
  ON public.missions FOR SELECT TO authenticated
  USING (is_enabled);
REVOKE ALL ON public.missions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.missions FROM authenticated;
GRANT SELECT ON public.missions TO authenticated;

DROP POLICY IF EXISTS "Allow all access to user_missions" ON public.user_missions;
DROP POLICY IF EXISTS "owner access to user_missions" ON public.user_missions;
DROP POLICY IF EXISTS user_missions_owner_read ON public.user_missions;
CREATE POLICY user_missions_owner_read
  ON public.user_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.user_missions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_missions FROM authenticated;
GRANT SELECT ON public.user_missions TO authenticated;

REVOKE ALL ON FUNCTION public.sync_current_missions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_mission_reward(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_all_mission_rewards(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_current_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mission_reward(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_all_mission_rewards(text[]) TO authenticated;

-- Internal-only event evaluator. Existing secure gameplay RPCs may invoke it
-- as function owner, but clients cannot manufacture mission progress.
REVOKE ALL ON FUNCTION public.evaluate_mission_progress(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- Retire caller-authority and manual reset interfaces.
REVOKE ALL ON FUNCTION public.claim_mission_reward(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_all_mission_rewards(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reset_daily_missions(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_daily_reset(uuid) FROM PUBLIC, anon, authenticated;
