-- Open Beta M7-1: canonical 30-cell login bonus contract and reward boundary.

ALTER TABLE public.login_bonus_master
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

UPDATE public.login_bonus_master
SET is_featured = (day_number IN (5, 10, 15, 20, 25, 30));

ALTER TABLE public.user_login_bonuses
  ADD COLUMN IF NOT EXISTS total_logins integer NOT NULL DEFAULT 0;

UPDATE public.user_login_bonuses
SET total_logins = GREATEST(total_logins, current_day, 1)
WHERE total_logins = 0;

ALTER TABLE public.user_login_bonuses
  DROP CONSTRAINT IF EXISTS user_login_bonuses_current_day_check;
ALTER TABLE public.user_login_bonuses
  ADD CONSTRAINT user_login_bonuses_current_day_check CHECK (current_day BETWEEN 1 AND 30);
ALTER TABLE public.user_login_bonuses
  DROP CONSTRAINT IF EXISTS user_login_bonuses_total_logins_check;
ALTER TABLE public.user_login_bonuses
  ADD CONSTRAINT user_login_bonuses_total_logins_check CHECK (total_logins >= 0);

CREATE OR REPLACE FUNCTION public.process_login_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_step integer;
  v_total_logins integer;
  v_last_claimed_at timestamptz;
  v_now timestamptz := clock_timestamp();
  v_today_jst date := (clock_timestamp() AT TIME ZONE 'Asia/Tokyo')::date;
  v_reward public.login_bonus_master%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Player authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':login_bonus', 0));

  SELECT current_day, total_logins, last_claimed_at
  INTO v_current_step, v_total_logins, v_last_claimed_at
  FROM public.user_login_bonuses
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND AND (v_last_claimed_at AT TIME ZONE 'Asia/Tokyo')::date = v_today_jst THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'already_claimed', true,
      'reason', 'ALREADY_CLAIMED',
      'current_step', v_current_step,
      'day_number', v_current_step,
      'total_logins', v_total_logins,
      'last_claimed_date', v_today_jst::text
    );
  END IF;

  IF NOT FOUND THEN
    v_current_step := 1;
    v_total_logins := 1;
  ELSE
    v_current_step := (v_current_step % 30) + 1;
    v_total_logins := v_total_logins + 1;
  END IF;

  SELECT * INTO v_reward
  FROM public.login_bonus_master
  WHERE day_number = v_current_step;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Login bonus master is missing for step %', v_current_step;
  END IF;

  INSERT INTO public.user_login_bonuses (
    user_id, current_day, total_logins, last_claimed_at
  ) VALUES (
    v_user_id, v_current_step, v_total_logins, v_now
  )
  ON CONFLICT (user_id) DO UPDATE
  SET current_day = EXCLUDED.current_day,
      total_logins = EXCLUDED.total_logins,
      last_claimed_at = EXCLUDED.last_claimed_at;

  INSERT INTO public.presents (
    user_id, item_id, quantity, message, status, sent_at, expire_at
  ) VALUES (
    v_user_id,
    v_reward.item_id,
    v_reward.quantity,
    'ログインボーナス: ' || v_reward.item_name,
    'UNCLAIMED',
    v_now,
    v_now + interval '30 days'
  );

  RETURN jsonb_build_object(
    'claimed', true,
    'already_claimed', false,
    'current_step', v_current_step,
    'day_number', v_current_step,
    'total_logins', v_total_logins,
    'last_claimed_date', v_today_jst::text,
    'item_id', v_reward.item_id,
    'quantity', v_reward.quantity,
    'item_name', v_reward.item_name,
    'reward', jsonb_build_object(
      'day_number', v_reward.day_number,
      'item_id', v_reward.item_id,
      'item_name', v_reward.item_name,
      'quantity', v_reward.quantity,
      'is_featured', v_reward.is_featured
    )
  );
END;
$$;

DROP POLICY IF EXISTS "Allow all access to user_login_bonuses" ON public.user_login_bonuses;
DROP POLICY IF EXISTS "owner access to user_login_bonuses" ON public.user_login_bonuses;
CREATE POLICY user_login_bonuses_owner_read
  ON public.user_login_bonuses FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.user_login_bonuses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_login_bonuses FROM authenticated;
GRANT SELECT ON public.user_login_bonuses TO authenticated;

DROP POLICY IF EXISTS "Allow all access to presents" ON public.presents;
DROP POLICY IF EXISTS presents_owner_read ON public.presents;
CREATE POLICY presents_owner_read
  ON public.presents FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.presents FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.presents FROM authenticated;
GRANT SELECT ON public.presents TO authenticated;

REVOKE ALL ON FUNCTION public.process_login_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_login_bonus() TO authenticated;
