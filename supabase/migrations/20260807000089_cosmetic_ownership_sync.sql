-- Bridge the existing profile unlocks into the shared cosmetic ownership model.
-- Legacy profile columns remain display-compatible during the staged migration.

INSERT INTO public.cosmetic_master (id, owner_scope, slot, rarity, display_name, asset_key, source_type, source_reference)
VALUES
  ('bg_kabukicho', 'USER', 'HOME_BACKGROUND', 'RARE', '新宿ネオン街', 'bg_kabukicho', 'PROGRESSION', 'PLAYER_LEVEL_5'),
  ('bg_wharf', 'USER', 'HOME_BACKGROUND', 'RARE', '東京ドック埠頭', 'bg_wharf', 'GUILD', 'GUILD_MEMBER'),
  ('bg_bazar', 'USER', 'HOME_BACKGROUND', 'EPIC', '渋谷スクランブル', 'bg_bazar', 'PROGRESSION', 'CASH_20000'),
  ('effect_lightning', 'USER', 'HOME_FOREGROUND', 'EPIC', '紫電一閃', 'effect_lightning', 'RANKING', 'PVP_1050'),
  ('effect_sparks', 'USER', 'HOME_FOREGROUND', 'RARE', '百花繚乱', 'effect_sparks', 'PROGRESSION', 'PLAYER_LEVEL_10'),
  ('effect_smoke', 'USER', 'HOME_FOREGROUND', 'RARE', '硝煙黙示録', 'effect_smoke', 'COLLECTION', 'CHARACTER_COUNT_3')
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    asset_key = EXCLUDED.asset_key,
    source_type = EXCLUDED.source_type,
    source_reference = EXCLUDED.source_reference;

CREATE OR REPLACE FUNCTION public.unlock_eligible_user_cosmetics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_level integer;
  v_cash bigint;
  v_pvp_points integer;
  v_has_guild boolean;
  v_character_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT level, cash, pvp_points INTO v_level, v_cash, v_pvp_points
  FROM public.users WHERE id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'player profile not found'; END IF;

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

REVOKE ALL ON FUNCTION public.unlock_eligible_user_cosmetics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_eligible_user_cosmetics() TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_legacy_user_cosmetics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user public.users%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT * INTO v_user FROM public.users WHERE id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'player profile not found'; END IF;

  PERFORM public.unlock_eligible_user_cosmetics();

  INSERT INTO public.user_cosmetics (user_id, cosmetic_id, source_type, source_reference)
  SELECT v_user_id, id, 'LEGACY', 'PROFILE_MIGRATION'
  FROM public.cosmetic_master
  WHERE id IN (
    COALESCE(v_user.selected_bg_mode, 'bg_default'),
    COALESCE(v_user.equipped_front_effect, 'effect_none'),
    CASE WHEN v_user.interior_item = 'none' THEN 'interior_none' ELSE v_user.interior_item END
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.equipped_cosmetics (user_id, slot, cosmetic_id)
  SELECT v_user_id, 'HOME_BACKGROUND', 'bg_default'
  WHERE NOT EXISTS (SELECT 1 FROM public.equipped_cosmetics WHERE user_id = v_user_id AND slot = 'HOME_BACKGROUND')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.equipped_cosmetics (user_id, slot, cosmetic_id)
  SELECT v_user_id, 'HOME_FOREGROUND', 'effect_none'
  WHERE NOT EXISTS (SELECT 1 FROM public.equipped_cosmetics WHERE user_id = v_user_id AND slot = 'HOME_FOREGROUND')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.equipped_cosmetics (user_id, slot, cosmetic_id)
  SELECT v_user_id, 'HOME_INTERIOR', 'interior_none'
  WHERE NOT EXISTS (SELECT 1 FROM public.equipped_cosmetics WHERE user_id = v_user_id AND slot = 'HOME_INTERIOR')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.sync_legacy_user_cosmetics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_legacy_user_cosmetics() TO authenticated;
