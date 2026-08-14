WITH blocked_functions AS (
  SELECT
    p.oid::regprocedure AS function_signature,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
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
), checks AS (
  SELECT 10 AS display_order, 'consumer_execute_denied' AS check_name,
    CASE WHEN count(*) FILTER (WHERE anon_can_execute OR authenticated_can_execute) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    format('%s/%s blocked function(s) unexpectedly executable',
      count(*) FILTER (WHERE anon_can_execute OR authenticated_can_execute), count(*)) AS detail
  FROM blocked_functions

  UNION ALL

  SELECT 20, 'service_role_execute',
    CASE WHEN count(*) FILTER (WHERE service_role_can_execute) = count(*) THEN 'PASS' ELSE 'FAIL' END,
    format('%s/%s blocked function(s) reserved for service_role',
      count(*) FILTER (WHERE service_role_can_execute), count(*))
  FROM blocked_functions

  UNION ALL

  SELECT 30, 'users_economy_update_denied',
    CASE WHEN has_column_privilege('authenticated', 'public.users', 'username', 'UPDATE')
           AND has_column_privilege('authenticated', 'public.users', 'sound_settings', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'cash', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'neon_diamonds', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'vitality', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'level', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'xp', 'UPDATE')
      THEN 'PASS' ELSE 'FAIL' END,
    'authenticated may update profile columns but not economy/progression columns'

  UNION ALL

  SELECT 40, 'inventory_consume_rpc',
    CASE WHEN to_regprocedure('public.use_energy_drink()') IS NOT NULL
           AND has_function_privilege('authenticated', 'public.use_energy_drink()', 'EXECUTE')
           AND NOT has_function_privilege('anon', 'public.use_energy_drink()', 'EXECUTE')
           AND NOT has_function_privilege('authenticated', 'public.use_energy_drink(uuid)', 'EXECUTE')
      THEN 'PASS' ELSE 'FAIL' END,
    'canonical item consumption derives the player from auth.uid()'

  UNION ALL

  SELECT 50, 'payment_transactions_read_only',
    CASE WHEN has_table_privilege('authenticated', 'public.payment_transactions', 'SELECT')
           AND NOT has_table_privilege('authenticated', 'public.payment_transactions', 'INSERT')
           AND NOT has_table_privilege('authenticated', 'public.payment_transactions', 'UPDATE')
           AND NOT has_table_privilege('authenticated', 'public.payment_transactions', 'DELETE')
      THEN 'PASS' ELSE 'FAIL' END,
    'authenticated may read owned payment records but cannot forge them'

  UNION ALL

  SELECT 60, 'monthly_passes_read_only',
    CASE WHEN has_table_privilege('authenticated', 'public.user_monthly_passes', 'SELECT')
           AND NOT has_table_privilege('authenticated', 'public.user_monthly_passes', 'INSERT')
           AND NOT has_table_privilege('authenticated', 'public.user_monthly_passes', 'UPDATE')
           AND NOT has_table_privilege('authenticated', 'public.user_monthly_passes', 'DELETE')
      THEN 'PASS' ELSE 'FAIL' END,
    'authenticated may read owned pass state but cannot purchase or claim client-side'

  UNION ALL

  SELECT 70, 'owner_read_policies',
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/2 owner-scoped read policy/policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (tablename = 'payment_transactions' AND policyname = 'owner read payment transactions')
      OR (tablename = 'user_monthly_passes' AND policyname = 'owner read monthly passes')
    )

  UNION ALL

  SELECT 80, 'canonical_gacha_execute',
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/2 canonical gacha wrapper privilege(s)', count(*))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = ANY (ARRAY['execute_character_gacha', 'execute_asset_gacha'])
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
