CREATE POLICY "Read own guild GvG matches"
  ON public.gvg_match_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members member
      WHERE member.user_id = auth.uid()
        AND (member.guild_id = guild_a_id OR member.guild_id = guild_b_id)
    )
  );
