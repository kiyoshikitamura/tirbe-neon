-- Character-scoped presentation. These are visual-only and never affect stats.
INSERT INTO public.cosmetic_master (id, owner_scope, slot, rarity, display_name, asset_key, source_type, source_reference)
VALUES
  ('char_aura_none', 'CHARACTER', 'CHARACTER_AURA', 'COMMON', 'オーラなし', 'none', 'SYSTEM', 'DEFAULT'),
  ('char_aura_neon', 'CHARACTER', 'CHARACTER_AURA', 'RARE', 'ネオン残光', 'char_aura_neon', 'EVENT', 'EVENT_REWARD'),
  ('char_aura_champion', 'CHARACTER', 'CHARACTER_AURA', 'EPIC', '覇者の火花', 'char_aura_champion', 'GVG', 'GVG_RANKING'),
  ('char_frame_none', 'CHARACTER', 'CHARACTER_FRAME', 'COMMON', 'フレームなし', 'none', 'SYSTEM', 'DEFAULT'),
  ('char_frame_chrome', 'CHARACTER', 'CHARACTER_FRAME', 'RARE', 'クロームフレーム', 'char_frame_chrome', 'SHOP', 'COSMETIC_SHOP'),
  ('char_plate_none', 'CHARACTER', 'CHARACTER_NAMEPLATE', 'COMMON', '標準ネームプレート', 'none', 'SYSTEM', 'DEFAULT'),
  ('char_plate_champion', 'CHARACTER', 'CHARACTER_NAMEPLATE', 'EPIC', 'チャンピオンプレート', 'char_plate_champion', 'RANKING', 'PVP_RANKING')
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    asset_key = EXCLUDED.asset_key,
    source_type = EXCLUDED.source_type,
    source_reference = EXCLUDED.source_reference;

CREATE OR REPLACE FUNCTION public.equip_character_cosmetic(
  p_user_character_id uuid,
  p_slot text,
  p_cosmetic_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_characters WHERE id = p_user_character_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'character is not owned by the current user';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.character_cosmetics cc
    JOIN public.cosmetic_master cm ON cm.id = cc.cosmetic_id
    WHERE cc.user_character_id = p_user_character_id
      AND cc.cosmetic_id = p_cosmetic_id
      AND cm.owner_scope = 'CHARACTER'
      AND cm.slot = p_slot
      AND (cc.expires_at IS NULL OR cc.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'cosmetic is not owned or is unavailable';
  END IF;

  INSERT INTO public.equipped_cosmetics (user_id, slot, cosmetic_id)
  VALUES (v_user_id, 'CHARACTER:' || p_user_character_id::text || ':' || p_slot, p_cosmetic_id)
  ON CONFLICT (user_id, slot) DO UPDATE
  SET cosmetic_id = EXCLUDED.cosmetic_id, equipped_at = now();

  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.equip_character_cosmetic(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.equip_character_cosmetic(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.provision_qa_character_cosmetic_fixture()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email_hash text := encode(extensions.digest(lower(COALESCE(auth.jwt() ->> 'email', '')), 'sha256'), 'hex');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF v_email_hash <> 'ec4caf39b8c3a960f9287ac282badc8fe2ab3f03326455d4274e8bfd2de53f42' THEN
    RAISE EXCEPTION 'qa fixture is not available for this account';
  END IF;

  INSERT INTO public.character_cosmetics (user_character_id, cosmetic_id)
  SELECT character_row.id, cosmetic.id
  FROM public.user_characters AS character_row
  CROSS JOIN public.cosmetic_master AS cosmetic
  WHERE character_row.user_id = v_user_id
    AND cosmetic.owner_scope = 'CHARACTER'
    AND cosmetic.active
  ON CONFLICT (user_character_id, cosmetic_id) DO NOTHING;

  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.provision_qa_character_cosmetic_fixture() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_qa_character_cosmetic_fixture() TO authenticated;
