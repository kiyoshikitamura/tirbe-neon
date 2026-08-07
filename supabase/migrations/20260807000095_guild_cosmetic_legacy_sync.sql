-- Move existing guild decoration ownership into the shared cosmetics model
-- without changing the established guild funds and permission workflow.
INSERT INTO public.cosmetic_master (id, owner_scope, slot, rarity, display_name, asset_key, source_type, source_reference)
VALUES
  ('bg_neon_kabukicho', 'GUILD', 'GUILD_BASE_BACKGROUND', 'RARE', '歌舞伎町ネオン背景', 'bg_neon_kabukicho', 'GUILD_SHOP', 'GUILD_FUNDS'),
  ('bg_industrial_docks', 'GUILD', 'GUILD_BASE_BACKGROUND', 'EPIC', 'インダストリアルドック背景', 'bg_industrial_docks', 'GUILD_SHOP', 'GUILD_FUNDS'),
  ('banner_neon_reign', 'GUILD', 'GUILD_BANNER', 'RARE', 'ネオンレイン称号バナー', 'banner_neon_reign', 'GUILD_SHOP', 'GUILD_FUNDS'),
  ('banner_kabukicho_king', 'GUILD', 'GUILD_BANNER', 'EPIC', '歌舞伎町キング称号バナー', 'banner_kabukicho_king', 'GUILD_SHOP', 'GUILD_FUNDS')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, asset_key = EXCLUDED.asset_key, source_type = EXCLUDED.source_type, source_reference = EXCLUDED.source_reference;

CREATE OR REPLACE FUNCTION public.sync_legacy_guild_cosmetics(p_guild_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_guild public.guilds%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_user_id) THEN RAISE EXCEPTION 'guild membership required'; END IF;
  SELECT * INTO v_guild FROM public.guilds WHERE id = p_guild_id;
  INSERT INTO public.guild_cosmetics (guild_id, cosmetic_id, source_type, source_reference)
  SELECT p_guild_id, cosmetic_id, 'LEGACY', 'GUILD_MIGRATION'
  FROM jsonb_array_elements_text(COALESCE(v_guild.unlocked_decorations, '[]'::jsonb) || COALESCE(v_guild.unlocked_banners, '[]'::jsonb)) AS legacy_item(cosmetic_id)
  JOIN public.cosmetic_master cm ON cm.id = legacy_item.cosmetic_id
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('status', 'success');
END; $$;

REVOKE ALL ON FUNCTION public.sync_legacy_guild_cosmetics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_legacy_guild_cosmetics(uuid) TO authenticated;
