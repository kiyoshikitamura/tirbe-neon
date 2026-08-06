-- リプレイ解決器の呼び出しに失敗した場合だけ、未確定攻撃のロックを解除する。
-- APは begin_gvg_attack 時点で確定しているため返還しない。
CREATE OR REPLACE FUNCTION public.cancel_unresolved_gvg_attack(p_attack_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.gvg_attack_logs
  WHERE id = p_attack_id
    AND attacker_user_id = auth.uid()
    AND battle_result = 'PENDING'
    AND battle_replay_session_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only an unresolved own GvG attack can be cancelled';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_unresolved_gvg_attack(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_unresolved_gvg_attack(UUID) TO authenticated;
