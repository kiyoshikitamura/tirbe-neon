CREATE UNIQUE INDEX IF NOT EXISTS gvg_attack_one_pending_per_attacker_idx
  ON public.gvg_attack_logs (match_session_id, attacker_user_id)
  WHERE battle_result = 'PENDING';
