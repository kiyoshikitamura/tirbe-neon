UPDATE public.guild_level_master
SET max_members = CASE level
  WHEN 1 THEN 10
  WHEN 2 THEN 12
  WHEN 3 THEN 15
  WHEN 4 THEN 18
  ELSE 20
END;

CREATE OR REPLACE FUNCTION public.enforce_guild_member_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level INTEGER;
  v_cap INTEGER;
  v_count INTEGER;
BEGIN
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
  SELECT level INTO v_level FROM public.guilds WHERE id = NEW.guild_id FOR UPDATE;
  IF v_level IS NULL THEN RAISE EXCEPTION 'Guild not found'; END IF;
  SELECT max_members INTO v_cap FROM public.guild_level_master WHERE level = v_level;
  v_cap := LEAST(COALESCE(v_cap, 10), 20);
  SELECT count(*) INTO v_count FROM public.guild_members WHERE guild_id = NEW.guild_id;
  IF v_count >= v_cap THEN RAISE EXCEPTION 'Guild member limit reached (% members)', v_cap; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_guild_member_cap_trigger ON public.guild_members;
CREATE TRIGGER enforce_guild_member_cap_trigger
BEFORE INSERT ON public.guild_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_guild_member_cap();
