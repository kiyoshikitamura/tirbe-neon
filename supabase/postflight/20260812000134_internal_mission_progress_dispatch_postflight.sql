WITH checks AS (
  SELECT 10 AS display_order, 'function:evaluate_mission_progress' AS check_name,
    CASE WHEN to_regprocedure('public.evaluate_mission_progress(uuid,text,integer)') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
    'evaluate_mission_progress(uuid,text,integer)' AS detail
  UNION ALL
  SELECT 20, 'normalization_trigger',
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/1 user_missions trigger(s)'
  FROM pg_trigger
  WHERE tgrelid = 'public.user_missions'::regclass
    AND tgname = 'normalize_user_mission_progress_trigger'
    AND NOT tgisinternal
  UNION ALL
  SELECT 30, 'security_definer_and_search_path',
    CASE WHEN p.prosecdef AND p.proconfig @> ARRAY['search_path=public'] THEN 'PASS' ELSE 'FAIL' END,
    'internal evaluator is SECURITY DEFINER / search_path=public'
  FROM pg_proc p
  WHERE p.oid = 'public.evaluate_mission_progress(uuid,text,integer)'::regprocedure
  UNION ALL
  SELECT 40, 'api_execute_denied',
    CASE WHEN NOT has_function_privilege('anon', 'public.evaluate_mission_progress(uuid,text,integer)', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.evaluate_mission_progress(uuid,text,integer)', 'EXECUTE')
    THEN 'PASS' ELSE 'FAIL' END,
    'anon/authenticated cannot manufacture mission progress'
  UNION ALL
  SELECT 50, 'existing_progress_normalized',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || ' invalid or desynchronized row(s)'
  FROM public.user_missions um
  JOIN public.missions m ON m.id = um.mission_id
  WHERE um.current_progress < 0
     OR um.current_progress > m.target_value
     OR um.progress_val <> um.current_progress
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
