WITH checks AS (
  SELECT 10 AS display_order, 'login_bonus_master_30_cells' AS check_name,
    CASE WHEN count(*) = 30 AND min(day_number) = 1 AND max(day_number) = 30 THEN 'PASS' ELSE 'FAIL' END AS status,
    count(*)::text || ' row(s), range=' || COALESCE(min(day_number)::text, 'null') || '..' || COALESCE(max(day_number)::text, 'null') AS detail
  FROM public.login_bonus_master
  UNION ALL
  SELECT 20, 'login_bonus_master_values',
    CASE WHEN count(*) FILTER (WHERE item_id IS NULL OR quantity <= 0 OR item_name IS NULL OR btrim(item_name) = '') = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE item_id IS NULL OR quantity <= 0 OR item_name IS NULL OR btrim(item_name) = '')::text || ' invalid row(s)'
  FROM public.login_bonus_master
  UNION ALL
  SELECT 30, 'user_login_bonus_columns',
    CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/3 canonical state column(s)'
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'user_login_bonuses'
    AND column_name IN ('current_day', 'total_logins', 'last_claimed_at')
  UNION ALL
  SELECT 40, 'function:process_login_bonus',
    CASE WHEN to_regprocedure('public.process_login_bonus()') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    COALESCE(to_regprocedure('public.process_login_bonus()')::text, 'missing')
  UNION ALL
  SELECT 50, 'security_definer_and_search_path',
    CASE WHEN p.prosecdef AND p.proconfig @> ARRAY['search_path=public'] THEN 'PASS' ELSE 'FAIL' END,
    'SECURITY DEFINER / search_path=public'
  FROM pg_proc p WHERE p.oid = to_regprocedure('public.process_login_bonus()')
  UNION ALL
  SELECT 60, 'authenticated_execute',
    CASE WHEN has_function_privilege('authenticated', 'public.process_login_bonus()', 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END,
    'authenticated execute privilege'
  UNION ALL
  SELECT 70, 'anon_execute_denied',
    CASE WHEN NOT has_function_privilege('anon', 'public.process_login_bonus()', 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END,
    'anon execute privilege denied'
  UNION ALL
  SELECT 80, 'state_and_present_tables_read_only',
    CASE WHEN has_table_privilege('authenticated', 'public.user_login_bonuses', 'SELECT')
      AND has_table_privilege('authenticated', 'public.presents', 'SELECT')
      AND NOT has_table_privilege('authenticated', 'public.user_login_bonuses', 'INSERT,UPDATE,DELETE')
      AND NOT has_table_privilege('authenticated', 'public.presents', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
    'authenticated reads owned rows but cannot forge state or rewards'
  UNION ALL
  SELECT 90, 'owner_read_policies',
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/2 owner read policies'
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN ('user_login_bonuses_owner_read', 'presents_owner_read')
    AND roles = ARRAY['authenticated']::name[]
  UNION ALL
  SELECT 100, 'existing_state_integrity',
    CASE WHEN count(*) FILTER (WHERE current_day NOT BETWEEN 1 AND 30 OR total_logins < 0) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE current_day NOT BETWEEN 1 AND 30 OR total_logins < 0)::text || ' invalid state row(s)'
  FROM public.user_login_bonuses
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
