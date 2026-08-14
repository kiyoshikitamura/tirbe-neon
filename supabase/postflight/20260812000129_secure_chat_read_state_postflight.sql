WITH checks AS (
  SELECT 10 AS display_order, 'table:chat_read_states' AS check_name,
    CASE WHEN to_regclass('public.chat_read_states') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
    COALESCE(to_regclass('public.chat_read_states')::text, 'missing') AS detail
  UNION ALL
  SELECT 20, 'required_functions',
    CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/3 function(s)'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.oid IN (
      to_regprocedure('public.send_chat_message(text,text)'),
      to_regprocedure('public.mark_chat_channel_read(text)'),
      to_regprocedure('public.get_chat_unread_counts()')
    )
  UNION ALL
  SELECT 30, 'security_definer_and_search_path',
    CASE WHEN count(*) FILTER (WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public']) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public'])::text || '/3 hardened function(s)'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.oid IN (
      to_regprocedure('public.send_chat_message(text,text)'),
      to_regprocedure('public.mark_chat_channel_read(text)'),
      to_regprocedure('public.get_chat_unread_counts()')
    )
  UNION ALL
  SELECT 40, 'authenticated_execute',
    CASE WHEN count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE'))::text || '/3 executable function(s)'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.oid IN (
      to_regprocedure('public.send_chat_message(text,text)'),
      to_regprocedure('public.mark_chat_channel_read(text)'),
      to_regprocedure('public.get_chat_unread_counts()')
    )
  UNION ALL
  SELECT 50, 'anon_execute_denied',
    CASE WHEN count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'EXECUTE')) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'EXECUTE'))::text || '/3 unexpectedly executable function(s)'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.oid IN (
      to_regprocedure('public.send_chat_message(text,text)'),
      to_regprocedure('public.mark_chat_channel_read(text)'),
      to_regprocedure('public.get_chat_unread_counts()')
    )
  UNION ALL
  SELECT 60, 'authenticated_board_posts_read_only',
    CASE WHEN has_table_privilege('authenticated', 'public.board_posts', 'SELECT')
      AND NOT has_table_privilege('authenticated', 'public.board_posts', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
    'authenticated can select but cannot mutate board_posts directly'
  UNION ALL
  SELECT 70, 'anon_chat_table_denied',
    CASE WHEN NOT has_table_privilege('anon', 'public.board_posts', 'SELECT,INSERT,UPDATE,DELETE')
      AND NOT has_table_privilege('anon', 'public.user_chats', 'SELECT,INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
    'anon cannot read or mutate current/legacy chat tables'
  UNION ALL
  SELECT 80, 'scoped_board_posts_policy',
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/1 authenticated scoped read policy'
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'board_posts'
    AND policyname = 'board_posts_chat_read'
    AND roles = ARRAY['authenticated']::name[]
  UNION ALL
  SELECT 90, 'realtime_publication',
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/1 board_posts publication entry'
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'board_posts'
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
