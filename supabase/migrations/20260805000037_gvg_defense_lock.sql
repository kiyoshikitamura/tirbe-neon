CREATE OR REPLACE FUNCTION public.guard_gvg_defense_deck_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  IF EXISTS (
    SELECT 1
    FROM public.guild_members member
    JOIN public.gvg_match_sessions match ON match.guild_a_id = member.guild_id OR match.guild_b_id = member.guild_id
    WHERE member.user_id = v_user_id
      AND match.status = 'ACTIVE'
      AND now() >= match.scheduled_start_at AND now() < match.scheduled_end_at
  ) THEN
    RAISE EXCEPTION 'GvG defense decks are locked during active GvG';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS guard_gvg_defense_deck_lock_trigger ON public.gvg_defense_decks;
CREATE TRIGGER guard_gvg_defense_deck_lock_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.gvg_defense_decks
FOR EACH ROW EXECUTE FUNCTION public.guard_gvg_defense_deck_lock();
