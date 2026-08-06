-- These RPCs target tables removed from the canonical schema. Keep their
-- signatures temporarily, but fail closed instead of attempting partial or
-- client-controlled state changes.

CREATE OR REPLACE FUNCTION public.process_gvg_battle_result_v2(
  p_user_id UUID, p_guild_id UUID, p_base_id TEXT, p_is_practice BOOLEAN, p_is_win BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Legacy GvG result RPC is retired; use server replay resolution';
END;
$$;

CREATE OR REPLACE FUNCTION public.process_stripe_shop_purchase(
  p_user_id UUID, p_stripe_session_id TEXT, p_product_id TEXT, p_amount_jpy INTEGER,
  p_items JSONB, p_product_title TEXT, p_is_beginner BOOLEAN DEFAULT false, p_purchase_limit INTEGER DEFAULT 0
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Stripe purchases must be fulfilled by a verified webhook';
END;
$$;

CREATE OR REPLACE FUNCTION public.gvg_season_reset()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Legacy GvG season reset is retired';
END;
$$;

CREATE OR REPLACE FUNCTION public.raid_boss_defeat()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Legacy raid boss reset is retired';
END;
$$;

CREATE OR REPLACE FUNCTION public.raid_season_reset()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Legacy raid season reset is retired';
END;
$$;
