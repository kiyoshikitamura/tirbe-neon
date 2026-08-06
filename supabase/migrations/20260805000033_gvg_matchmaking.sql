-- A schedule key is shared by all matches in the same GvG time slot.
ALTER TABLE public.gvg_match_sessions
  DROP CONSTRAINT IF EXISTS gvg_match_sessions_session_key_key;

CREATE INDEX IF NOT EXISTS gvg_match_sessions_schedule_idx
  ON public.gvg_match_sessions (session_key, status, scheduled_start_at);

-- Trusted scheduler entry point. The caller supplies the phase HP calculated from the
-- future level-design master; this function never hard-codes combat numbers.
CREATE OR REPLACE FUNCTION public.create_gvg_match_session(
  p_session_key TEXT,
  p_scheduled_start_at TIMESTAMPTZ,
  p_scheduled_end_at TIMESTAMPTZ,
  p_guild_a_id UUID,
  p_guild_b_id UUID,
  p_guild_a_phase_hp BIGINT,
  p_guild_b_phase_hp BIGINT,
  p_npc_guild_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_match_id UUID;
BEGIN
  IF p_scheduled_end_at <= p_scheduled_start_at THEN RAISE EXCEPTION 'Invalid GvG schedule'; END IF;
  IF p_guild_a_phase_hp < 1 OR p_guild_b_phase_hp < 1 THEN RAISE EXCEPTION 'Invalid GvG phase HP'; END IF;
  IF p_guild_b_id IS NOT NULL AND p_guild_a_id = p_guild_b_id THEN RAISE EXCEPTION 'A guild cannot match itself'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.gvg_match_sessions existing
    WHERE existing.session_key = p_session_key
      AND (existing.guild_a_id IN (p_guild_a_id, p_guild_b_id) OR existing.guild_b_id IN (p_guild_a_id, p_guild_b_id))
      AND existing.status IN ('MATCHING', 'CONFIRMED', 'ACTIVE')
  ) THEN RAISE EXCEPTION 'Guild already has a match in this GvG slot'; END IF;

  INSERT INTO public.gvg_match_sessions (
    session_key, scheduled_start_at, scheduled_end_at, status, is_npc_match,
    guild_a_id, guild_b_id, npc_guild_name,
    guild_a_phase_max_hp, guild_b_phase_max_hp, guild_a_phase_hp, guild_b_phase_hp
  ) VALUES (
    p_session_key, p_scheduled_start_at, p_scheduled_end_at, 'MATCHING', p_guild_b_id IS NULL,
    p_guild_a_id, p_guild_b_id, p_npc_guild_name,
    p_guild_a_phase_hp, p_guild_b_phase_hp, p_guild_a_phase_hp, p_guild_b_phase_hp
  ) RETURNING id INTO v_match_id;

  PERFORM public.snapshot_gvg_match_members(v_match_id);
  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_gvg_match_session(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BIGINT, BIGINT, TEXT) FROM PUBLIC;
