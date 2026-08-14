WITH checks AS (
  SELECT 10 AS display_order,
         'canonical_prices'::text AS check_name,
         CASE WHEN count(*) FILTER (
           WHERE (id LIKE '%_NORMAL' AND cost_cash = 1000 AND cost_diamond = 100)
              OR (id LIKE '%_SPECIAL' AND cost_cash = 3000 AND cost_diamond = 300)
         ) = count(*) AND count(*) >= 4 THEN 'PASS' ELSE 'FAIL' END AS status,
         count(*) FILTER (
           WHERE (id LIKE '%_NORMAL' AND cost_cash = 1000 AND cost_diamond = 100)
              OR (id LIKE '%_SPECIAL' AND cost_cash = 3000 AND cost_diamond = 300)
         ) || '/' || count(*) || ' installed canonical master row(s)' AS detail
  FROM public.gacha_masters
  WHERE id IN ('CHAR_NORMAL', 'CHAR_SPECIAL', 'SKILL_NORMAL', 'SKILL_SPECIAL', 'EQUIP_NORMAL', 'EQUIP_SPECIAL')

  UNION ALL
  SELECT 20, 'required_functions',
         CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || '/2 public gacha function(s)'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('execute_asset_gacha', 'execute_character_gacha')
    AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid, p_gacha_id text, p_pull_count integer, p_currency_type text'

  UNION ALL
  SELECT 30, 'normal_only_free_guard',
         CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || '/2 wrapper(s) contain the normal-only free guard'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('execute_asset_gacha', 'execute_character_gacha')
    AND pg_get_functiondef(p.oid) LIKE '%daily free is only available for normal gacha%'

  UNION ALL
  SELECT 40, 'security_definer_and_search_path',
         CASE WHEN count(*) FILTER (WHERE p.prosecdef AND 'search_path=public' = ANY(COALESCE(p.proconfig, ARRAY[]::text[]))) = 2 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE p.prosecdef AND 'search_path=public' = ANY(COALESCE(p.proconfig, ARRAY[]::text[]))) || '/2 hardened wrapper(s)'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('execute_asset_gacha', 'execute_character_gacha')

  UNION ALL
  SELECT 50, 'authenticated_execute',
         CASE WHEN count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')) = 2 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')) || '/2 wrapper(s) executable'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('execute_asset_gacha', 'execute_character_gacha')

  UNION ALL
  SELECT 60, 'anon_execute_denied',
         CASE WHEN count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'EXECUTE')) = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'EXECUTE')) || '/2 wrapper(s) unexpectedly executable'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('execute_asset_gacha', 'execute_character_gacha')

  UNION ALL
  SELECT 70, 'core_execute_denied',
         CASE WHEN count(*) FILTER (
           WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')
              OR has_function_privilege('anon', p.oid, 'EXECUTE')
         ) = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (
           WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')
              OR has_function_privilege('anon', p.oid, 'EXECUTE')
         ) || '/2 core function(s) unexpectedly executable'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('execute_asset_gacha_core_20260812', 'execute_character_gacha_core_20260812')
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
