-- GvGの反映値はクライアント引数ではなく、確定済みサーバーリプレイだけから得る。
ALTER FUNCTION public.resolve_gvg_attack(UUID, UUID, BOOLEAN, BIGINT)
  RENAME TO resolve_gvg_attack_legacy;

CREATE OR REPLACE FUNCTION public.resolve_gvg_attack(
  p_attack_id UUID, p_battle_replay_session_id UUID, p_is_victory BOOLEAN, p_raw_damage BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT result INTO v_result
  FROM public.battle_replay_sessions
  WHERE id = p_battle_replay_session_id
    AND requester_user_id = auth.uid()
    AND battle_mode = 'GVG'
    AND source_reference_id = p_attack_id
    AND status = 'RESOLVED';
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'The battle replay does not belong to this resolved GvG attack';
  END IF;
  p_is_victory := COALESCE(v_result->>'winner' = 'PLAYER', false);
  p_raw_damage := GREATEST(0, COALESCE((v_result->>'playerRawDamage')::BIGINT, 0));

  RETURN public.resolve_gvg_attack_legacy(p_attack_id, p_battle_replay_session_id, p_is_victory, p_raw_damage);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_gvg_attack_legacy(UUID, UUID, BOOLEAN, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_gvg_attack_legacy(UUID, UUID, BOOLEAN, BIGINT) FROM authenticated;
REVOKE ALL ON FUNCTION public.resolve_gvg_attack(UUID, UUID, BOOLEAN, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_gvg_attack(UUID, UUID, BOOLEAN, BIGINT) TO authenticated;
