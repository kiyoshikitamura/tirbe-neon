-- Enforce the complete guild-membership lock during an active GvG window.
CREATE OR REPLACE FUNCTION public.guard_gvg_membership_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_guild_ids UUID[];
BEGIN
  v_guild_ids := ARRAY_REMOVE(ARRAY[
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.guild_id ELSE NULL END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.guild_id ELSE NULL END
  ], NULL);
  IF EXISTS (
    SELECT 1 FROM public.gvg_match_sessions match
    WHERE match.status = 'ACTIVE'
      AND now() >= match.scheduled_start_at AND now() < match.scheduled_end_at
      AND (match.guild_a_id = ANY(v_guild_ids) OR match.guild_b_id = ANY(v_guild_ids))
  ) THEN
    RAISE EXCEPTION 'Guild membership and roles are locked during active GvG';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS guard_gvg_membership_lock_trigger ON public.guild_members;
CREATE TRIGGER guard_gvg_membership_lock_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.guild_members
FOR EACH ROW EXECUTE FUNCTION public.guard_gvg_membership_lock();
