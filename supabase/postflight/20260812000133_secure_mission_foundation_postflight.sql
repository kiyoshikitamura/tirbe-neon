WITH required_functions(signature) AS (
  VALUES
    ('public.sync_current_missions()'),
    ('public.claim_mission_reward(text)'),
    ('public.claim_all_mission_rewards(text[])')
), resolved AS (
  SELECT signature, to_regprocedure(signature) AS oid FROM required_functions
), checks AS (
  SELECT 10 AS display_order, 'mission_master_columns' AS check_name,
    CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END AS status,
    count(*)::text || '/7 replaceable master column(s)' AS detail
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'missions'
    AND column_name IN ('description','condition_params','prerequisite_mission_id','display_order','is_enabled','is_repeatable','is_provisional')
  UNION ALL
  SELECT 20, 'required_functions',
    CASE WHEN count(oid) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(oid)::text || '/3 public mission function(s)' FROM resolved
  UNION ALL
  SELECT 30, 'security_definer_and_search_path',
    CASE WHEN count(*) FILTER (WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public']) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public'])::text || '/3 hardened function(s)'
  FROM resolved r JOIN pg_proc p ON p.oid = r.oid
  UNION ALL
  SELECT 40, 'authenticated_execute',
    CASE WHEN count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE')) = 3 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE'))::text || '/3 executable function(s)'
  FROM resolved WHERE oid IS NOT NULL
  UNION ALL
  SELECT 50, 'anon_execute_denied',
    CASE WHEN count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE')) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE'))::text || '/3 unexpectedly executable function(s)'
  FROM resolved WHERE oid IS NOT NULL
  UNION ALL
  SELECT 60, 'direct_mission_writes_denied',
    CASE WHEN has_table_privilege('authenticated', 'public.missions', 'SELECT')
      AND has_table_privilege('authenticated', 'public.user_missions', 'SELECT')
      AND NOT has_table_privilege('authenticated', 'public.missions', 'INSERT,UPDATE,DELETE')
      AND NOT has_table_privilege('authenticated', 'public.user_missions', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
    'authenticated cannot forge mission master or progress'
  UNION ALL
  SELECT 70, 'legacy_caller_authority_denied',
    CASE WHEN count(*) FILTER (WHERE oid IS NOT NULL AND has_function_privilege('authenticated', oid, 'EXECUTE')) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE oid IS NOT NULL AND has_function_privilege('authenticated', oid, 'EXECUTE'))::text || '/4 legacy function(s) unexpectedly executable'
  FROM (VALUES
    (to_regprocedure('public.evaluate_mission_progress(uuid,text,integer)')),
    (to_regprocedure('public.claim_mission_reward(uuid,text)')),
    (to_regprocedure('public.claim_all_mission_rewards(uuid,text[])')),
    (to_regprocedure('public.admin_reset_daily_missions(uuid,text[])'))
  ) legacy(oid)
  UNION ALL
  SELECT 80, 'canonical_categories_and_statuses',
    CASE WHEN
      (SELECT count(*) FROM public.missions WHERE category NOT IN ('DAILY','NORMAL')) = 0
      AND (SELECT count(*) FROM public.user_missions WHERE status NOT IN ('PROGRESS','CLEAR','CLAIMED')) = 0
    THEN 'PASS' ELSE 'FAIL' END,
    'mission categories and user statuses are canonical'
  UNION ALL
  SELECT 90, 'existing_progress_integrity',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || ' invalid progress row(s)'
  FROM public.user_missions um
  LEFT JOIN public.missions m ON m.id = um.mission_id
  WHERE m.id IS NULL OR um.current_progress < 0 OR um.current_progress > m.target_value
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
