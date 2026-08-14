WITH functions AS (
  SELECT p.oid, p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'transfer_guild_leader', 'set_guild_member_role', 'kick_guild_member', 'buy_guild_decoration_v2'
  )
), checks AS (
  SELECT 10 AS display_order, 'canonical_existing_roles'::text AS check_name,
         CASE WHEN count(*) FILTER (WHERE role NOT IN ('MASTER','SUB_MASTER','MEMBER')) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
         count(*) FILTER (WHERE role NOT IN ('MASTER','SUB_MASTER','MEMBER')) || ' noncanonical member role(s)' AS detail
  FROM public.guild_members
  UNION ALL
  SELECT 20, 'role_constraint', CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || '/1 canonical role constraint' FROM pg_constraint WHERE conname = 'guild_members_role_check' AND conrelid = 'public.guild_members'::regclass
  UNION ALL
  SELECT 30, 'required_functions', CASE WHEN count(*) = 4 THEN 'PASS' ELSE 'FAIL' END, count(*) || '/4 function(s)' FROM functions
  UNION ALL
  SELECT 40, 'canonical_function_definitions',
         CASE WHEN count(*) FILTER (WHERE definition LIKE '%SUB_MASTER%' AND definition NOT LIKE '%SUBMASTER%') = 4 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE definition LIKE '%SUB_MASTER%' AND definition NOT LIKE '%SUBMASTER%') || '/4 canonical function(s)' FROM functions
  UNION ALL
  SELECT 50, 'security_definer_and_search_path',
         CASE WHEN count(*) FILTER (WHERE prosecdef AND 'search_path=public' = ANY(COALESCE(proconfig, ARRAY[]::text[]))) = 4 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE prosecdef AND 'search_path=public' = ANY(COALESCE(proconfig, ARRAY[]::text[]))) || '/4 hardened function(s)' FROM functions
  UNION ALL
  SELECT 60, 'authenticated_execute', CASE WHEN count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE')) = 4 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE')) || '/4 executable function(s)' FROM functions
  UNION ALL
  SELECT 70, 'anon_execute_denied', CASE WHEN count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE')) = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE')) || '/4 unexpectedly executable function(s)' FROM functions
)
SELECT display_order, check_name, status, detail FROM checks ORDER BY display_order;
