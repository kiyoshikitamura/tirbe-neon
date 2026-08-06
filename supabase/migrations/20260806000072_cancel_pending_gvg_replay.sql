-- A failed Edge Function call can leave a PENDING replay attached to a PENDING
-- attack. Allow its owner to atomically remove that pair, but never permit a
-- resolved replay or attack to be cancelled.
CREATE OR REPLACE FUNCTION public.cancel_unresolved_gvg_attack(p_attack_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_replay_id UUID;
BEGIN
  SELECT battle_replay_session_id
  INTO v_replay_id
  FROM public.gvg_attack_logs
  WHERE id = p_attack_id
    AND attacker_user_id = auth.uid()
    AND battle_result = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only an unresolved own GvG attack can be cancelled';
  END IF;

  IF v_replay_id IS NOT NULL THEN
    PERFORM 1
    FROM public.battle_replay_sessions
    WHERE id = v_replay_id
      AND requester_user_id = auth.uid()
      AND battle_mode = 'GVG'
      AND source_reference_id = p_attack_id
      AND status = 'PENDING'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Only a pending GvG replay can be cancelled';
    END IF;

    DELETE FROM public.battle_replay_sessions WHERE id = v_replay_id;
  ELSE
    -- create_battle_replay_pending links by source_reference_id first; the
    -- attack log receives its direct replay ID only during final resolution.
    DELETE FROM public.battle_replay_sessions
    WHERE requester_user_id = auth.uid()
      AND battle_mode = 'GVG'
      AND source_reference_id = p_attack_id
      AND status = 'PENDING';
  END IF;

  DELETE FROM public.gvg_attack_logs WHERE id = p_attack_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_unresolved_gvg_attack(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_unresolved_gvg_attack(UUID) TO authenticated;
