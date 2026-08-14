WITH target_tables(table_name) AS (
  VALUES
    ('user_daily_gacha_claims'::text),
    ('user_gacha_pity_points'::text)
), checks AS (
  SELECT 10 AS display_order, 'rls_enabled' AS check_name,
    CASE WHEN count(*) FILTER (WHERE c.relrowsecurity) = 2 THEN 'PASS' ELSE 'FAIL' END AS status,
    format('%s/2 gacha state table(s)', count(*) FILTER (WHERE c.relrowsecurity)) AS detail
  FROM target_tables t
  JOIN pg_class c ON c.relname = t.table_name
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'

  UNION ALL

  SELECT 20, 'owner_read_policies',
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/2 owner-scoped read policy/policies', count(*))
  FROM pg_policies p
  JOIN target_tables t ON t.table_name = p.tablename
  WHERE p.schemaname = 'public'
    AND p.cmd = 'SELECT'
    AND p.roles = ARRAY['authenticated']::name[]
    AND p.qual = '(auth.uid() = user_id)'

  UNION ALL

  SELECT 30, 'authenticated_read_only',
    CASE WHEN count(*) FILTER (
      WHERE has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
        AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
        AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
        AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
    ) = 2 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/2 table(s) readable but not directly mutable', count(*) FILTER (
      WHERE has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
        AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
        AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
        AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
    ))
  FROM target_tables

  UNION ALL

  SELECT 40, 'anon_denied',
    CASE WHEN count(*) FILTER (
      WHERE NOT has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
        AND NOT has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
        AND NOT has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
        AND NOT has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
    ) = 2 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/2 table(s) fully denied to anon', count(*) FILTER (
      WHERE NOT has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
        AND NOT has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
        AND NOT has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
        AND NOT has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
    ))
  FROM target_tables
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
