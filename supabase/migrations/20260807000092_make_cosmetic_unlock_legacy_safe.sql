-- Production projects created from older schemas do not always expose the
-- same profile column set. Read the profile as JSON so missing legacy fields
-- never make cosmetic syncing fail.
CREATE OR REPLACE FUNCTION public.unlock_eligible_user_cosmetics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_level integer := 1;
  v_cash bigint := 0;
  v_pvp_points integer := 0;
  v_has_guild boolean;
  v_character_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT to_jsonb(user_row) INTO v_profile
  FROM public.users AS user_row
  WHERE user_row.id = v_user_id;
  IF v_profile IS NULL THEN RAISE EXCEPTION 'player profile not found'; END IF;

  v_level := COALESCE(NULLIF(v_profile ->> 'level', '')::integer, NULLIF(v_profile ->> 'user_level', '')::integer, 1);
  v_cash := COALESCE(NULLIF(v_profile ->> 'cash', '')::bigint, NULLIF(v_profile ->> 'money', '')::bigint, 0);
  v_pvp_points := COALESCE(NULLIF(v_profile ->> 'pvp_points', '')::integer, NULLIF(v_profile ->> 'pvp_score', '')::integer, 0);

  SELECT EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = v_user_id)
    INTO v_has_guild;
  SELECT count(*) INTO v_character_count
    FROM public.user_characters WHERE user_id = v_user_id;

  INSERT INTO public.user_cosmetics (user_id, cosmetic_id, source_type, source_reference)
  SELECT v_user_id, id, 'PROGRESSION', source_reference
  FROM public.cosmetic_master
  WHERE owner_scope = 'USER'
    AND (
      id IN ('bg_default', 'effect_none', 'interior_none')
      OR (id = 'bg_kabukicho' AND v_level >= 5)
      OR (id = 'bg_wharf' AND v_has_guild)
      OR (id = 'bg_bazar' AND v_cash >= 20000)
      OR (id = 'effect_lightning' AND v_pvp_points >= 1050)
      OR (id = 'effect_sparks' AND v_level >= 10)
      OR (id = 'effect_smoke' AND v_character_count >= 3)
    )
  ON CONFLICT (user_id, cosmetic_id) DO NOTHING;

  RETURN jsonb_build_object('status', 'success');
END;
$$;
