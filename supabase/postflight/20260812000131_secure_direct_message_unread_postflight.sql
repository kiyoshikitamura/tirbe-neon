WITH required_functions(signature) AS (
  VALUES
    ('public.send_direct_message(uuid,text)'),
    ('public.mark_direct_message_read(uuid)'),
    ('public.get_direct_message_unread_counts()')
), resolved AS (
  SELECT signature, to_regprocedure(signature) AS oid FROM required_functions
), checks AS (
  SELECT 10 AS display_order, 'required_functions' AS check_name,
    CASE WHEN count(oid) = 3 THEN 'PASS' ELSE 'FAIL' END AS status,
    count(oid)::text || '/3 function(s)' AS detail FROM resolved
  UNION ALL
  SELECT 20, 'security_definer_and_search_path',
    CASE WHEN count(*) FILTER (WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public']) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public'])::text || '/3 hardened function(s)'
  FROM resolved r JOIN pg_proc p ON p.oid = r.oid
  UNION ALL
  SELECT 30, 'authenticated_execute',
    CASE WHEN count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE')) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE'))::text || '/3 executable function(s)'
  FROM resolved WHERE oid IS NOT NULL
  UNION ALL
  SELECT 40, 'anon_execute_denied',
    CASE WHEN count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE')) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE'))::text || '/3 unexpectedly executable function(s)'
  FROM resolved WHERE oid IS NOT NULL
  UNION ALL
  SELECT 50, 'authenticated_direct_messages_read_only',
    CASE WHEN has_table_privilege('authenticated', 'public.direct_messages', 'SELECT')
      AND NOT has_table_privilege('authenticated', 'public.direct_messages', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
    'authenticated can select but cannot mutate direct_messages directly'
  UNION ALL
  SELECT 60, 'anon_direct_messages_denied',
    CASE WHEN NOT has_table_privilege('anon', 'public.direct_messages', 'SELECT,INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
    'anon cannot read or mutate direct_messages'
  UNION ALL
  SELECT 70, 'participant_read_policy',
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/1 participant-scoped read policy'
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'direct_messages'
    AND policyname = 'direct_messages_participant_read'
    AND roles = ARRAY['authenticated']::name[]
  UNION ALL
  SELECT 80, 'unread_index',
    CASE WHEN to_regclass('public.direct_messages_recipient_sender_unread_idx') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    COALESCE(to_regclass('public.direct_messages_recipient_sender_unread_idx')::text, 'missing')
  UNION ALL
  SELECT 90, 'realtime_publication',
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/1 direct_messages publication entry'
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_messages'
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
