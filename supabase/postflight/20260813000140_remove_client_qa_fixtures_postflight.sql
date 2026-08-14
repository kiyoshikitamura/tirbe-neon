WITH qa_functions AS (
  SELECT p.oid::regprocedure AS function_signature
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = ANY (ARRAY[
      'provision_qa_fixture',
      'provision_qa_cosmetic_fixture',
      'provision_qa_character_cosmetic_fixture',
      'provision_qa_ui1_fixture',
      'apply_qa_ui1_fixture'
    ])
)
SELECT
  10 AS display_order,
  'client_qa_functions_absent' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
  format('%s QA fixture function(s) remain', count(*)) AS detail
FROM qa_functions;
