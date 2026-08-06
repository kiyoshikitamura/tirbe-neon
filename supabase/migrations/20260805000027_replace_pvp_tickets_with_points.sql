-- PvP uses a regenerating point resource, not tickets.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pvp_points INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pvp_points_last_recovered_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.users DROP COLUMN IF EXISTS pvp_tickets;
ALTER TABLE public.users DROP COLUMN IF EXISTS pvp_tickets_last_recovered_at;

DROP FUNCTION IF EXISTS public.sync_and_recover_vitality_and_tickets(UUID);
DROP FUNCTION IF EXISTS public.consume_pvp_ticket(UUID);
DROP FUNCTION IF EXISTS public.sync_and_recover_vitality_and_pvp_points(UUID);

CREATE OR REPLACE FUNCTION public.sync_and_recover_vitality_and_pvp_points(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_vitality_recovered INTEGER;
  v_pvp_recovered INTEGER;
  v_out_vitality INTEGER;
  v_out_pvp_points INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found'; END IF;
  v_vitality_recovered := FLOOR(EXTRACT(EPOCH FROM (v_now - COALESCE(v_user.vitality_last_recovered_at, v_now))) / 300);
  v_pvp_recovered := FLOOR(EXTRACT(EPOCH FROM (v_now - COALESCE(v_user.pvp_points_last_recovered_at, v_now))) / 3600);
  UPDATE public.users SET
    vitality = LEAST(100, vitality + GREATEST(v_vitality_recovered, 0)),
    vitality_last_recovered_at = CASE WHEN v_vitality_recovered > 0 THEN v_now ELSE vitality_last_recovered_at END,
    pvp_points = LEAST(5, pvp_points + GREATEST(v_pvp_recovered, 0)),
    pvp_points_last_recovered_at = CASE WHEN v_pvp_recovered > 0 THEN v_now ELSE pvp_points_last_recovered_at END
  WHERE id = p_user_id
  RETURNING vitality, pvp_points INTO v_out_vitality, v_out_pvp_points;
  RETURN jsonb_build_object('out_vitality', v_out_vitality, 'out_pvp_points', v_out_pvp_points);
END; $$;

CREATE OR REPLACE FUNCTION public.consume_pvp_point(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_points INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT pvp_points INTO v_points FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF v_points IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF v_points < 1 THEN RAISE EXCEPTION 'insufficient pvp points'; END IF;
  UPDATE public.users SET pvp_points = pvp_points - 1,
    pvp_points_last_recovered_at = CASE WHEN pvp_points = 5 THEN now() ELSE pvp_points_last_recovered_at END
  WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END; $$;
