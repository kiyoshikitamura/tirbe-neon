WITH required_functions(name) AS (
  VALUES ('search_guilds'), ('request_guild_join'), ('cancel_guild_join_request'),
         ('review_guild_join_request'), ('is_current_guild_member'),
         ('is_current_guild_master'), ('record_guild_activity')
), function_rows AS (
  SELECT p.oid, p.proname, p.prosecdef, p.proconfig
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN required_functions required ON required.name = p.proname
  WHERE n.nspname = 'public'
), checks AS (
  SELECT 10 AS display_order, 'table:guild_join_requests'::text AS check_name,
         CASE WHEN to_regclass('public.guild_join_requests') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
         COALESCE(to_regclass('public.guild_join_requests')::text, 'missing') AS detail

  UNION ALL
  SELECT 20, 'required_functions', CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || '/7 function(s)' FROM function_rows

  UNION ALL
  SELECT 30, 'security_definer_and_search_path',
         CASE WHEN count(*) FILTER (WHERE prosecdef AND 'search_path=public' = ANY(COALESCE(proconfig, ARRAY[]::text[]))) = 7 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE prosecdef AND 'search_path=public' = ANY(COALESCE(proconfig, ARRAY[]::text[]))) || '/7 hardened function(s)'
  FROM function_rows

  UNION ALL
  SELECT 40, 'authenticated_execute',
         CASE WHEN count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE')) = 7 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE')) || '/7 function(s) executable'
  FROM function_rows

  UNION ALL
  SELECT 50, 'anon_execute_denied',
         CASE WHEN count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE')) = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE')) || '/7 function(s) unexpectedly executable'
  FROM function_rows

  UNION ALL
  SELECT 60, 'direct_guild_writes_denied',
         CASE WHEN NOT has_table_privilege('authenticated', 'public.guilds', 'INSERT,UPDATE,DELETE')
                AND NOT has_table_privilege('authenticated', 'public.guild_members', 'INSERT,UPDATE,DELETE')
                AND NOT has_table_privilege('authenticated', 'public.guild_join_requests', 'INSERT,UPDATE,DELETE')
              THEN 'PASS' ELSE 'FAIL' END,
         'authenticated cannot bypass guild membership RPCs'

  UNION ALL
  SELECT 70, 'scoped_read_policies',
         CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || '/3 scoped guild read policy/policies'
  FROM pg_policies
  WHERE schemaname = 'public' AND policyname IN (
    'guilds_member_read', 'guild_members_same_guild_read', 'guild_join_requests_read'
  )

  UNION ALL
  SELECT 80, 'membership_integrity_triggers',
         CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || '/2 membership cap/sync trigger(s)'
  FROM pg_trigger trigger_row
  WHERE NOT trigger_row.tgisinternal AND trigger_row.tgname IN (
    'enforce_guild_member_cap_trigger', 'sync_user_guild_membership_trigger'
  )

  UNION ALL
  SELECT 90, 'legacy_mutation_execute_denied',
         CASE WHEN count(*) FILTER (
           WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')
              OR has_function_privilege('anon', p.oid, 'EXECUTE')
         ) = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (
           WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')
              OR has_function_privilege('anon', p.oid, 'EXECUTE')
         ) || '/' || count(*) || ' legacy function(s) unexpectedly executable'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'create_guild', 'admin_update_guild', 'admin_add_guild_funds',
    'admin_update_guild_finals', 'buy_guild_decoration'
  )

  UNION ALL
  SELECT 100, 'existing_membership_integrity',
         CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || ' user(s) have mismatched users.guild_id'
  FROM public.guild_members member
  JOIN public.users player ON player.id = member.user_id
  WHERE player.guild_id IS DISTINCT FROM member.guild_id
)
SELECT display_order, check_name, status, detail FROM checks ORDER BY display_order;
