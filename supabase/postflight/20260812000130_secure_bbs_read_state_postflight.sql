WITH required_functions(signature) AS (
  VALUES
    ('public.create_bbs_thread(text,text,text)'),
    ('public.create_bbs_post(uuid,text)'),
    ('public.mark_bbs_thread_read(uuid)'),
    ('public.get_bbs_unread_counts()')
), resolved AS (
  SELECT signature, to_regprocedure(signature) AS oid FROM required_functions
), checks AS (
  SELECT 10 AS display_order, 'table:bbs_read_states' AS check_name,
    CASE WHEN to_regclass('public.bbs_read_states') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
    COALESCE(to_regclass('public.bbs_read_states')::text, 'missing') AS detail
  UNION ALL
  SELECT 20, 'required_functions',
    CASE WHEN count(oid) = 4 THEN 'PASS' ELSE 'FAIL' END,
    count(oid)::text || '/4 function(s)' FROM resolved
  UNION ALL
  SELECT 30, 'security_definer_and_search_path',
    CASE WHEN count(*) FILTER (WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public']) = 4 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public'])::text || '/4 hardened function(s)'
  FROM resolved r JOIN pg_proc p ON p.oid = r.oid
  UNION ALL
  SELECT 40, 'authenticated_execute',
    CASE WHEN count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE')) = 4 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE'))::text || '/4 executable function(s)'
  FROM resolved WHERE oid IS NOT NULL
  UNION ALL
  SELECT 50, 'anon_execute_denied',
    CASE WHEN count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE')) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE'))::text || '/4 unexpectedly executable function(s)'
  FROM resolved WHERE oid IS NOT NULL
  UNION ALL
  SELECT 60, 'authenticated_bbs_tables_read_only',
    CASE WHEN has_table_privilege('authenticated', 'public.bbs_threads', 'SELECT')
      AND has_table_privilege('authenticated', 'public.bbs_posts', 'SELECT')
      AND NOT has_table_privilege('authenticated', 'public.bbs_threads', 'INSERT,UPDATE,DELETE')
      AND NOT has_table_privilege('authenticated', 'public.bbs_posts', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
    'authenticated can select but cannot mutate BBS tables directly'
  UNION ALL
  SELECT 70, 'anon_bbs_tables_denied',
    CASE WHEN NOT has_table_privilege('anon', 'public.bbs_threads', 'SELECT,INSERT,UPDATE,DELETE')
      AND NOT has_table_privilege('anon', 'public.bbs_posts', 'SELECT,INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
    'anon cannot read or mutate BBS tables'
  UNION ALL
  SELECT 80, 'authenticated_read_policies',
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/2 authenticated BBS read policies'
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN ('bbs_threads_authenticated_read', 'bbs_posts_authenticated_read')
    AND roles = ARRAY['authenticated']::name[]
  UNION ALL
  SELECT 90, 'realtime_publication',
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/2 BBS publication entries'
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
    AND tablename IN ('bbs_threads', 'bbs_posts')
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
