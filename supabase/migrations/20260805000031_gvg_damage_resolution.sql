-- Only the trusted battle resolver may call this function. No client grant is issued.
CREATE OR REPLACE FUNCTION public.resolve_gvg_attack(
  p_attack_id UUID,
  p_battle_replay_session_id UUID,
  p_is_victory BOOLEAN,
  p_raw_damage BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attack public.gvg_attack_logs%ROWTYPE;
  v_match public.gvg_match_sessions%ROWTYPE;
  v_defender_side TEXT;
  v_applied BIGINT;
  v_next_hp BIGINT;
  v_next_phase SMALLINT;
  v_next_collapses SMALLINT;
BEGIN
  IF p_raw_damage < 0 THEN RAISE EXCEPTION 'Damage cannot be negative'; END IF;
  SELECT * INTO v_attack FROM public.gvg_attack_logs WHERE id = p_attack_id FOR UPDATE;
  IF NOT FOUND OR v_attack.battle_result <> 'PENDING' THEN RAISE EXCEPTION 'GvG attack is not pending'; END IF;
  SELECT * INTO v_match FROM public.gvg_match_sessions WHERE id = v_attack.match_session_id FOR UPDATE;
  IF NOT FOUND OR v_match.status <> 'ACTIVE' THEN RAISE EXCEPTION 'GvG match is not active'; END IF;
  SELECT side INTO v_defender_side FROM public.gvg_match_member_snapshots WHERE id = v_attack.defender_snapshot_id;
  IF v_defender_side IS NULL THEN RAISE EXCEPTION 'GvG defense snapshot is missing'; END IF;
  v_applied := CASE WHEN p_is_victory THEN FLOOR(p_raw_damage * 1.5) ELSE p_raw_damage END;

  IF v_defender_side = 'A' THEN
    v_next_hp := GREATEST(0, v_match.guild_a_phase_hp - v_applied);
    v_next_phase := v_match.guild_a_phase;
    v_next_collapses := v_match.guild_a_collapses;
    IF v_next_hp = 0 THEN
      v_next_collapses := v_next_collapses + 1;
      IF v_next_collapses < 2 THEN v_next_phase := v_next_phase + 1; v_next_hp := v_match.guild_a_phase_max_hp; END IF;
    END IF;
    UPDATE public.gvg_match_sessions SET guild_a_phase_hp = v_next_hp, guild_a_phase = v_next_phase,
      guild_a_collapses = v_next_collapses, guild_b_total_applied_damage = guild_b_total_applied_damage + v_applied
    WHERE id = v_match.id;
  ELSE
    v_next_hp := GREATEST(0, v_match.guild_b_phase_hp - v_applied);
    v_next_phase := v_match.guild_b_phase;
    v_next_collapses := v_match.guild_b_collapses;
    IF v_next_hp = 0 THEN
      v_next_collapses := v_next_collapses + 1;
      IF v_next_collapses < 2 THEN v_next_phase := v_next_phase + 1; v_next_hp := v_match.guild_b_phase_max_hp; END IF;
    END IF;
    UPDATE public.gvg_match_sessions SET guild_b_phase_hp = v_next_hp, guild_b_phase = v_next_phase,
      guild_b_collapses = v_next_collapses, guild_a_total_applied_damage = guild_a_total_applied_damage + v_applied
    WHERE id = v_match.id;
  END IF;

  UPDATE public.gvg_attack_logs SET battle_replay_session_id = p_battle_replay_session_id,
    battle_result = CASE WHEN p_is_victory THEN 'VICTORY' ELSE 'DEFEAT' END,
    raw_damage = p_raw_damage, applied_damage = v_applied,
    win_damage_multiplier = CASE WHEN p_is_victory THEN 1.50 ELSE 1.00 END, resolved_at = now()
  WHERE id = v_attack.id;

  IF v_next_collapses >= 2 THEN
    UPDATE public.gvg_match_sessions SET status = 'COMPLETED', completed_at = now(), result_reason = 'TWO_COLLAPSES',
      winner_guild_id = CASE WHEN v_defender_side = 'A' THEN guild_b_id ELSE guild_a_id END
    WHERE id = v_match.id;
  END IF;
  RETURN jsonb_build_object('applied_damage', v_applied, 'raw_damage', p_raw_damage,
    'victory_multiplier', CASE WHEN p_is_victory THEN 1.5 ELSE 1.0 END,
    'defender_side', v_defender_side, 'phase', v_next_phase, 'collapses', v_next_collapses, 'phase_hp', v_next_hp);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_gvg_attack(UUID, UUID, BOOLEAN, BIGINT) FROM PUBLIC;
