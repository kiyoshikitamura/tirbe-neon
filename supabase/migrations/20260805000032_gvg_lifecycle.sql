-- Scheduler-only GvG lifecycle functions. No client grants are issued.
CREATE OR REPLACE FUNCTION public.activate_gvg_match_session(p_match_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_match public.gvg_match_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM public.gvg_match_sessions WHERE id = p_match_session_id FOR UPDATE;
  IF NOT FOUND OR v_match.status <> 'CONFIRMED' THEN RAISE EXCEPTION 'GvG match is not confirmed'; END IF;
  IF now() < v_match.scheduled_start_at OR now() >= v_match.scheduled_end_at THEN RAISE EXCEPTION 'GvG match is outside its active window'; END IF;
  IF v_match.guild_a_phase_max_hp < 1 OR v_match.guild_b_phase_max_hp < 1 THEN RAISE EXCEPTION 'GvG phase HP is not initialized'; END IF;
  UPDATE public.gvg_match_sessions SET status = 'ACTIVE' WHERE id = p_match_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_gvg_match_on_timeout(p_match_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.gvg_match_sessions%ROWTYPE;
  v_a_progress NUMERIC;
  v_b_progress NUMERIC;
  v_winner UUID;
  v_reason TEXT;
BEGIN
  SELECT * INTO v_match FROM public.gvg_match_sessions WHERE id = p_match_session_id FOR UPDATE;
  IF NOT FOUND OR v_match.status <> 'ACTIVE' THEN RAISE EXCEPTION 'GvG match is not active'; END IF;
  IF now() < v_match.scheduled_end_at THEN RAISE EXCEPTION 'GvG match has not ended'; END IF;
  v_a_progress := v_match.guild_a_collapses + ((v_match.guild_a_phase_max_hp - v_match.guild_a_phase_hp)::NUMERIC / v_match.guild_a_phase_max_hp);
  v_b_progress := v_match.guild_b_collapses + ((v_match.guild_b_phase_max_hp - v_match.guild_b_phase_hp)::NUMERIC / v_match.guild_b_phase_max_hp);
  IF v_a_progress > v_b_progress THEN v_winner := v_match.guild_b_id; v_reason := 'TIMEOUT_PROGRESS';
  ELSIF v_b_progress > v_a_progress THEN v_winner := v_match.guild_a_id; v_reason := 'TIMEOUT_PROGRESS';
  ELSE v_winner := NULL; v_reason := 'DRAW';
  END IF;
  UPDATE public.gvg_match_sessions SET status = 'COMPLETED', completed_at = now(), winner_guild_id = v_winner, result_reason = v_reason
  WHERE id = p_match_session_id;
  RETURN jsonb_build_object('winner_guild_id', v_winner, 'reason', v_reason, 'guild_a_progress', v_a_progress, 'guild_b_progress', v_b_progress);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_gvg_match_session(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_gvg_match_on_timeout(UUID) FROM PUBLIC;
