-- Keep the RPC signature during the client migration, but never trust its seed argument.
CREATE OR REPLACE FUNCTION public.create_battle_replay_pending(
  p_battle_mode TEXT,
  p_tactic_id TEXT,
  p_random_seed BIGINT,
  p_player_snapshot JSONB,
  p_enemy_snapshot JSONB,
  p_source_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID := auth.uid(); v_id UUID; v_server_seed BIGINT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF p_battle_mode NOT IN ('QUEST', 'PVP', 'RAID', 'GVG') THEN RAISE EXCEPTION 'Invalid battle mode'; END IF;
  IF p_tactic_id NOT IN ('ATTACK_PRIORITY', 'HEAL_PRIORITY', 'SKILL_PRIORITY', 'BALANCED', 'WEAKNESS_FOCUS') THEN RAISE EXCEPTION 'Invalid tactic'; END IF;
  IF jsonb_typeof(p_player_snapshot) <> 'array' OR jsonb_array_length(p_player_snapshot) NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'Invalid player roster'; END IF;
  IF jsonb_typeof(p_enemy_snapshot) <> 'array' OR jsonb_array_length(p_enemy_snapshot) NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'Invalid enemy roster'; END IF;
  v_server_seed := floor(random() * 2147483646)::BIGINT + 1;
  INSERT INTO public.battle_replay_sessions (
    requester_user_id, battle_mode, source_reference_id, tactic_id, random_seed, player_snapshot, enemy_snapshot
  ) VALUES (
    v_user_id, p_battle_mode, p_source_reference_id, p_tactic_id, v_server_seed, p_player_snapshot, p_enemy_snapshot
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
