CREATE OR REPLACE FUNCTION public.equip_guild_cosmetic(p_guild_id uuid, p_slot text, p_cosmetic_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_role text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT role INTO v_role FROM public.guild_members WHERE guild_id = p_guild_id AND user_id = v_user_id;
  IF v_role <> 'MASTER' THEN RAISE EXCEPTION 'guild master permission required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.guild_cosmetics gc JOIN public.cosmetic_master cm ON cm.id = gc.cosmetic_id WHERE gc.guild_id = p_guild_id AND gc.cosmetic_id = p_cosmetic_id AND cm.owner_scope = 'GUILD' AND cm.slot = p_slot AND (gc.expires_at IS NULL OR gc.expires_at > now())) THEN RAISE EXCEPTION 'guild cosmetic is not owned or is unavailable'; END IF;
  INSERT INTO public.guild_equipped_cosmetics (guild_id, slot, cosmetic_id) VALUES (p_guild_id, p_slot, p_cosmetic_id)
  ON CONFLICT (guild_id, slot) DO UPDATE SET cosmetic_id = EXCLUDED.cosmetic_id, equipped_at = now();
  IF p_slot = 'GUILD_BASE_BACKGROUND' THEN UPDATE public.guilds SET equipped_decoration = p_cosmetic_id WHERE id = p_guild_id; END IF;
  IF p_slot = 'GUILD_BANNER' THEN UPDATE public.guilds SET equipped_banner = p_cosmetic_id WHERE id = p_guild_id; END IF;
  RETURN jsonb_build_object('status', 'success');
END; $$;
REVOKE ALL ON FUNCTION public.equip_guild_cosmetic(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.equip_guild_cosmetic(uuid, text, text) TO authenticated;
