WITH approved_ids(id) AS (
  VALUES
    ('ob_daily_login_01'), ('ob_daily_patrol_01'), ('ob_daily_char_level_01'), ('ob_daily_gear_level_01'),
    ('ob_normal_patrol_01'), ('ob_normal_patrol_02'), ('ob_normal_patrol_03'),
    ('ob_normal_char_level_01'), ('ob_normal_char_level_02'), ('ob_normal_char_level_03'),
    ('ob_normal_gear_level_01'), ('ob_normal_gear_level_02'), ('ob_normal_gear_level_03'),
    ('ob_normal_gear_lb_01'), ('ob_normal_gear_lb_02'),
    ('ob_normal_skill_lb_01'), ('ob_normal_skill_lb_02'),
    ('ob_normal_guild_join_01')
), checks AS (
  SELECT 10 AS display_order, 'approved_master_count' AS check_name,
    CASE WHEN count(*) = 18 THEN 'PASS' ELSE 'FAIL' END AS status,
    count(*)::text || '/18 enabled provisional mission(s)' AS detail
  FROM public.missions m JOIN approved_ids a ON a.id = m.id
  WHERE m.is_enabled AND m.is_provisional
  UNION ALL
  SELECT 20, 'category_distribution',
    CASE WHEN count(*) FILTER (WHERE category = 'DAILY') = 4
      AND count(*) FILTER (WHERE category = 'NORMAL') = 14 THEN 'PASS' ELSE 'FAIL' END,
    'DAILY=' || count(*) FILTER (WHERE category = 'DAILY')
      || ', NORMAL=' || count(*) FILTER (WHERE category = 'NORMAL')
  FROM public.missions m JOIN approved_ids a ON a.id = m.id WHERE m.is_enabled
  UNION ALL
  SELECT 25, 'user_mission_master_relationship',
    CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/1 mission foreign key(s)'
  FROM pg_constraint
  WHERE conrelid = 'public.user_missions'::regclass
    AND confrelid = 'public.missions'::regclass
    AND contype = 'f'
  UNION ALL
  SELECT 30, 'only_approved_set_enabled',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || ' unexpected enabled mission(s)'
  FROM public.missions m LEFT JOIN approved_ids a ON a.id = m.id
  WHERE m.is_enabled AND a.id IS NULL
  UNION ALL
  SELECT 40, 'daily_contract',
    CASE WHEN count(*) = 4
      AND bool_and(is_repeatable AND prerequisite_mission_id IS NULL) THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || '/4 repeatable root daily mission(s)'
  FROM public.missions m JOIN approved_ids a ON a.id = m.id
  WHERE m.category = 'DAILY' AND m.is_enabled
  UNION ALL
  SELECT 50, 'normal_prerequisite_integrity',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || ' invalid normal prerequisite(s)'
  FROM public.missions child
  LEFT JOIN public.missions parent ON parent.id = child.prerequisite_mission_id
  JOIN approved_ids a ON a.id = child.id
  WHERE child.category = 'NORMAL'
    AND child.prerequisite_mission_id IS NOT NULL
    AND (parent.id IS NULL OR parent.category <> 'NORMAL' OR NOT parent.is_enabled)
  UNION ALL
  SELECT 60, 'reward_contract',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || ' invalid reward row(s)'
  FROM public.missions m JOIN approved_ids a ON a.id = m.id
  WHERE m.reward_item_id NOT IN (
    'CASH','CHAR_EXP_S','CHAR_EXP_M','CHAR_EXP_L','EQUIP_EXP_S','EQUIP_EXP_M','EQUIP_EXP_L',
    'EQUIP_LB_HAMMER','SKILL_LB_BOOK','GACHA_TICKET'
  ) OR m.reward_quantity <= 0 OR m.reward_qty <> m.reward_quantity
  UNION ALL
  SELECT 70, 'server_backed_triggers_only',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || ' unsupported trigger row(s)'
  FROM public.missions m JOIN approved_ids a ON a.id = m.id
  WHERE m.trigger_type NOT IN (
    'DAILY_LOGIN','PATROL_CLEAR','CHAR_LEVEL_UP','GEAR_UPGRADE','GEAR_LIMIT_BREAK','SKILL_LIMIT_BREAK','GUILD_JOIN'
  )
  UNION ALL
  SELECT 80, 'root_assignment_coverage',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    count(*)::text || ' missing existing-user root assignment(s)'
  FROM public.users u
  CROSS JOIN public.missions m
  LEFT JOIN public.user_missions um ON um.user_id = u.id AND um.mission_id = m.id
  WHERE m.is_enabled
    AND (m.category = 'DAILY' OR (m.category = 'NORMAL' AND m.prerequisite_mission_id IS NULL))
    AND um.id IS NULL
  UNION ALL
  SELECT 90, 'mission_tables_read_only',
    CASE WHEN has_table_privilege('authenticated', 'public.missions', 'SELECT')
      AND has_table_privilege('authenticated', 'public.user_missions', 'SELECT')
      AND NOT has_table_privilege('authenticated', 'public.missions', 'INSERT,UPDATE,DELETE')
      AND NOT has_table_privilege('authenticated', 'public.user_missions', 'INSERT,UPDATE,DELETE')
    THEN 'PASS' ELSE 'FAIL' END,
    'authenticated reads but cannot forge master or progress'
  UNION ALL
  SELECT 100, 'canonical_present_functions',
    CASE WHEN to_regprocedure('public.claim_present(uuid)') IS NOT NULL
      AND to_regprocedure('public.claim_all_presents()') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    'claim_present(uuid), claim_all_presents()'
  UNION ALL
  SELECT 110, 'present_function_hardening',
    CASE WHEN count(*) FILTER (
      WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public']
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    ) = 2 THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (
      WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public']
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    )::text || '/2 hardened present function(s)'
  FROM pg_proc p
  WHERE p.oid IN (
    'public.claim_present(uuid)'::regprocedure,
    'public.claim_all_presents()'::regprocedure
  )
  UNION ALL
  SELECT 120, 'legacy_present_authority_denied',
    CASE WHEN count(*) FILTER (WHERE oid IS NOT NULL AND has_function_privilege('authenticated', oid, 'EXECUTE')) = 0
      THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE oid IS NOT NULL AND has_function_privilege('authenticated', oid, 'EXECUTE'))::text
      || '/2 legacy present function(s) unexpectedly executable'
  FROM (VALUES
    (to_regprocedure('public.claim_present(uuid,uuid)')),
    (to_regprocedure('public.claim_all_presents(uuid)'))
  ) legacy(oid)
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
