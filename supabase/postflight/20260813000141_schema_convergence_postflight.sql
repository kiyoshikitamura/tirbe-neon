WITH checks AS (
  SELECT 10 AS display_order, 'pvp_points_functions' AS check_name,
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END AS status,
    format('%s/2 canonical PvP point function(s)', count(*)) AS detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('sync_and_recover_vitality_and_pvp_points', 'consume_pvp_point')
    AND pg_get_functiondef(p.oid) LIKE '%pvp_points%'
    AND pg_get_functiondef(p.oid) NOT LIKE '%pvp_tickets%'

  UNION ALL
  SELECT 20, 'single_loadout_overloads',
    CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/2 canonical text[] loadout function(s)', count(*))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.oid::regprocedure::text IN ('save_pvp_defense_deck(text[],text)', 'save_gvg_defense_deck(text[])')

  UNION ALL
  SELECT 30, 'server_master_rls',
    CASE WHEN count(*) FILTER (WHERE c.relrowsecurity) = 4 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/4 server master table(s) with RLS', count(*) FILTER (WHERE c.relrowsecurity))
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('character_battle_master','equipment_battle_master','character_level_up_master','skill_battle_master')

  UNION ALL
  SELECT 40, 'ui_review_policies_absent',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s UI-review-only policy/policies remain', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN ('authenticated read gvg match sessions','authenticated read gvg snapshots','owner read gvg attack logs')

  UNION ALL
  SELECT 50, 'client_qa_functions_absent',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s QA fixture function(s) remain', count(*))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('provision_qa_fixture','provision_qa_cosmetic_fixture','provision_qa_character_cosmetic_fixture','provision_qa_ui1_fixture','apply_qa_ui1_fixture')
)
SELECT display_order, check_name, status, detail FROM checks ORDER BY display_order;
