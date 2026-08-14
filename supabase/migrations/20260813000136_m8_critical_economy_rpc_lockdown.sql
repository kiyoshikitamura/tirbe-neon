-- Open Beta M8-1: remove consumer access to development, administration,
-- retired gacha, and unverified billing mutation routes.

BEGIN;

DO $$
DECLARE
  v_function regprocedure;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'add_test_cash',
        'add_test_diamonds',
        'add_user_vitality',
        'admin_add_guild_funds',
        'admin_respawn_raid_boss',
        'admin_update_guild',
        'admin_update_guild_finals',
        'buy_avatar_part',
        'buy_normal_shop_product',
        'claim_daily_pass_reward',
        'execute_gacha',
        'gvg_season_reset',
        'process_stripe_shop_purchase',
        'purchase_monthly_pass',
        'pvp_season_reset',
        'raid_boss_defeat',
        'raid_season_reset',
        'reset_daily_power_rankings',
        'reset_seasonal_power_rankings',
        'update_favorite_character'
      ])
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_function
    );
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_function);
  END LOOP;
END;
$$;

-- The legacy inventory RPC trusted a caller-supplied user id. The canonical
-- overload derives ownership from the JWT and atomically consumes one item.
CREATE OR REPLACE FUNCTION public.use_energy_drink()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_quantity integer;
  v_vitality integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.user_items
  SET quantity = quantity - 1
  WHERE user_id = v_user_id
    AND item_id = 'ENERGY_DRINK'
    AND quantity >= 1
  RETURNING quantity INTO v_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'energy drink is not available';
  END IF;

  UPDATE public.users
  SET vitality = LEAST(vitality + 50, 200)
  WHERE id = v_user_id
  RETURNING vitality INTO v_vitality;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player profile is not initialized';
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'quantity', v_quantity,
    'vitality', v_vitality
  );
END;
$$;

REVOKE ALL ON FUNCTION public.use_energy_drink(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_energy_drink(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.use_energy_drink() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_energy_drink() TO authenticated, service_role;

-- A player may edit presentation/profile columns only. Currency, AP, progress,
-- guild membership, login state, and reward counters remain RPC-only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.users FROM authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (
  username,
  bio,
  avatar_url,
  current_base_id,
  favorite_character_id,
  equipped_background,
  equipped_front_effect,
  selected_bg_mode,
  interior_item,
  sound_settings
) ON TABLE public.users TO authenticated;

-- Payment records are written only by a trusted webhook/service process.
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.payment_transactions',
      v_policy.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY "owner read payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.payment_transactions FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.payment_transactions FROM authenticated;
GRANT SELECT ON TABLE public.payment_transactions TO authenticated;
GRANT ALL ON TABLE public.payment_transactions TO service_role;

-- Monthly/VIP passes are post-Beta billing features. Keep existing data readable
-- by its owner, but permit no client-side purchase, claim, or direct mutation.
ALTER TABLE public.user_monthly_passes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_monthly_passes'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.user_monthly_passes',
      v_policy.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY "owner read monthly passes"
ON public.user_monthly_passes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.user_monthly_passes FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.user_monthly_passes FROM authenticated;
GRANT SELECT ON TABLE public.user_monthly_passes TO authenticated;
GRANT ALL ON TABLE public.user_monthly_passes TO service_role;

COMMIT;
