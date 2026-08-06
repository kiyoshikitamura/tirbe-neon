CREATE OR REPLACE FUNCTION public.buy_guild_decoration_v2(
  p_guild_id UUID,
  p_type TEXT,
  p_item_id TEXT,
  p_cost BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_funds BIGINT;
  v_list JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_role
  FROM public.guild_members
  WHERE guild_id = p_guild_id AND user_id = auth.uid();

  IF COALESCE(v_role, '') NOT IN ('MASTER', 'SUBMASTER') THEN
    RAISE EXCEPTION 'Only guild masters and submasters can purchase guild items';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('DECORATION', 'BANNER') OR p_item_id IS NULL OR p_item_id = '' OR p_cost IS NULL OR p_cost < 0 THEN
    RAISE EXCEPTION 'Invalid guild item purchase';
  END IF;

  SELECT funds INTO v_funds
  FROM public.guilds
  WHERE id = p_guild_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guild not found';
  END IF;

  IF v_funds < p_cost THEN
    RETURN jsonb_build_object('error', 'Insufficient guild funds');
  END IF;

  IF p_type = 'DECORATION' THEN
    SELECT COALESCE(unlocked_decorations, '[]'::jsonb) INTO v_list
    FROM public.guilds WHERE id = p_guild_id;
    IF v_list ? p_item_id THEN
      RETURN jsonb_build_object('error', 'Guild item already owned');
    END IF;
    UPDATE public.guilds
    SET funds = funds - p_cost,
        unlocked_decorations = v_list || to_jsonb(p_item_id)
    WHERE id = p_guild_id;
  ELSE
    SELECT COALESCE(unlocked_banners, '[]'::jsonb) INTO v_list
    FROM public.guilds WHERE id = p_guild_id;
    IF v_list ? p_item_id THEN
      RETURN jsonb_build_object('error', 'Guild item already owned');
    END IF;
    UPDATE public.guilds
    SET funds = funds - p_cost,
        unlocked_banners = v_list || to_jsonb(p_item_id)
    WHERE id = p_guild_id;
  END IF;

  RETURN jsonb_build_object('status', 'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.equip_guild_decoration(
  p_guild_id UUID,
  p_type TEXT,
  p_item_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_list JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_role
  FROM public.guild_members
  WHERE guild_id = p_guild_id AND user_id = auth.uid();

  IF COALESCE(v_role, '') <> 'MASTER' THEN
    RAISE EXCEPTION 'Only the guild master can change guild page items';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('DECORATION', 'BANNER') THEN
    RAISE EXCEPTION 'Invalid guild item type';
  END IF;

  IF p_type = 'DECORATION' THEN
    SELECT COALESCE(unlocked_decorations, '[]'::jsonb) INTO v_list
    FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  ELSE
    SELECT COALESCE(unlocked_banners, '[]'::jsonb) INTO v_list
    FROM public.guilds WHERE id = p_guild_id FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guild not found';
  END IF;

  IF p_item_id IS NOT NULL AND NOT (v_list ? p_item_id) THEN
    RAISE EXCEPTION 'Guild item is not owned';
  END IF;

  IF p_type = 'DECORATION' THEN
    UPDATE public.guilds SET equipped_decoration = p_item_id WHERE id = p_guild_id;
  ELSE
    UPDATE public.guilds SET equipped_banner = p_item_id WHERE id = p_guild_id;
  END IF;

  RETURN jsonb_build_object('status', 'success');
END;
$$;

REVOKE ALL ON FUNCTION public.buy_guild_decoration_v2(UUID, TEXT, TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.equip_guild_decoration(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_guild_decoration_v2(UUID, TEXT, TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equip_guild_decoration(UUID, TEXT, TEXT) TO authenticated;
