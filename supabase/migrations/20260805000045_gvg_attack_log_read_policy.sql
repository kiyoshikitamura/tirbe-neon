CREATE POLICY "Read own GvG attack logs"
  ON public.gvg_attack_logs
  FOR SELECT TO authenticated
  USING (attacker_user_id = auth.uid());
