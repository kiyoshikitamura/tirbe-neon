CREATE OR REPLACE FUNCTION public.process_gvg_battle_result_v2(
  p_guild_id UUID, p_battle_id TEXT, p_points INTEGER, p_is_guild_a BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Legacy GvG result RPC is retired; use server replay resolution';
END;
$$;

CREATE OR REPLACE FUNCTION public.process_stripe_shop_purchase(
  p_user_id UUID, p_product_id TEXT, p_stripe_session_id TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Stripe purchases must be fulfilled by a verified webhook';
END;
$$;
