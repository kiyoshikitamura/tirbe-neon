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
  v_expected_cost BIGINT;
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

  v_expected_cost := CASE p_item_id
    WHEN 'bg_neon_kabukicho' THEN 5000
    WHEN 'bg_industrial_docks' THEN 10000
    WHEN 'banner_neon_reign' THEN 3000
    WHEN 'banner_kabukicho_king' THEN 8000
    ELSE NULL
  END;

  IF p_type IS NULL OR p_type NOT IN ('DECORATION', 'BANNER') OR p_item_id IS NULL OR p_cost IS NULL OR v_expected_cost IS NULL OR p_cost <> v_expected_cost THEN
    RAISE EXCEPTION 'Invalid guild item purchase';
  END IF;

  IF (p_type = 'DECORATION' AND p_item_id NOT IN ('bg_neon_kabukicho', 'bg_industrial_docks'))
    OR (p_type = 'BANNER' AND p_item_id NOT IN ('banner_neon_reign', 'banner_kabukicho_king')) THEN
    RAISE EXCEPTION 'Invalid guild item type';
  END IF;

  SELECT funds INTO v_funds
  FROM public.guilds
  WHERE id = p_guild_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guild not found';
  END IF;

  IF v_funds < v_expected_cost THEN
    RETURN jsonb_build_object('error', 'Insufficient guild funds');
  END IF;

  IF p_type = 'DECORATION' THEN
    SELECT COALESCE(unlocked_decorations, '[]'::jsonb) INTO v_list
    FROM public.guilds WHERE id = p_guild_id;
    IF v_list ? p_item_id THEN
      RETURN jsonb_build_object('error', 'Guild item already owned');
    END IF;
    UPDATE public.guilds
    SET funds = funds - v_expected_cost,
        unlocked_decorations = v_list || to_jsonb(p_item_id)
    WHERE id = p_guild_id;
  ELSE
    SELECT COALESCE(unlocked_banners, '[]'::jsonb) INTO v_list
    FROM public.guilds WHERE id = p_guild_id;
    IF v_list ? p_item_id THEN
      RETURN jsonb_build_object('error', 'Guild item already owned');
    END IF;
    UPDATE public.guilds
    SET funds = funds - v_expected_cost,
        unlocked_banners = v_list || to_jsonb(p_item_id)
    WHERE id = p_guild_id;
  END IF;

  RETURN jsonb_build_object('status', 'success');
END;
$$;
