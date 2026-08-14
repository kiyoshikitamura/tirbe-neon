-- Read-only M8 inventory. Any returned row is a review candidate; this query
-- intentionally makes no schema or data changes.

WITH critical_tables(table_name) AS (
  VALUES
    ('users'::text),
    ('user_characters'),
    ('user_equipments'),
    ('user_skills'),
    ('user_items'),
    ('user_daily_gacha_claims'),
    ('user_gacha_pity_points'),
    ('presents'),
    ('user_login_bonuses'),
    ('user_missions'),
    ('guilds'),
    ('guild_members'),
    ('guild_join_requests'),
    ('board_posts'),
    ('chat_read_states'),
    ('bbs_threads'),
    ('bbs_posts'),
    ('bbs_read_states'),
    ('direct_messages'),
    ('payment_transactions'),
    ('user_monthly_passes')
), table_findings AS (
  SELECT
    'DIRECT_MUTATION'::text AS finding_type,
    format('public.%I', t.table_name) AS object_name,
    concat_ws(', ',
      CASE WHEN has_table_privilege('authenticated', c.oid, 'INSERT') THEN 'INSERT' END,
      CASE WHEN has_table_privilege('authenticated', c.oid, 'UPDATE') THEN 'UPDATE' END,
      CASE WHEN has_table_privilege('authenticated', c.oid, 'DELETE') THEN 'DELETE' END
    ) AS detail
  FROM critical_tables t
  JOIN pg_class c ON c.relname = t.table_name
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  WHERE has_table_privilege('authenticated', c.oid, 'INSERT')
     OR has_table_privilege('authenticated', c.oid, 'UPDATE')
     OR has_table_privilege('authenticated', c.oid, 'DELETE')
), policy_findings AS (
  SELECT
    'BROAD_POLICY'::text AS finding_type,
    format('public.%I / %I', p.tablename, p.policyname) AS object_name,
    format('cmd=%s roles=%s using=%s check=%s', p.cmd, p.roles, p.qual, p.with_check) AS detail
  FROM pg_policies p
  JOIN critical_tables t ON t.table_name = p.tablename
  WHERE p.schemaname = 'public'
    AND (
      coalesce(p.qual, '') IN ('true', '(true)')
      OR coalesce(p.with_check, '') IN ('true', '(true)')
    )
), function_findings AS (
  SELECT
    CASE
      WHEN p.prosecdef AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) config
        WHERE config = 'search_path=public'
      ) THEN 'UNFIXED_SEARCH_PATH'
      ELSE 'CALLER_USER_ID'
    END AS finding_type,
    p.oid::regprocedure::text AS object_name,
    format('security_definer=%s args=%s', p.prosecdef, coalesce(p.proargnames::text, '')) AS detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND (
      (p.prosecdef AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) config
        WHERE config = 'search_path=public'
      ))
      OR EXISTS (
        SELECT 1
        FROM generate_subscripts(coalesce(p.proargnames, ARRAY[]::text[]), 1) argument_index
        WHERE p.proargnames[argument_index] IN ('p_user_id', 'user_id', 'target_user_id', 'p_target_user_id')
          AND (p.proargmodes IS NULL OR p.proargmodes[argument_index] IN ('i', 'b', 'v'))
      )
    )
)
SELECT finding_type, object_name, detail
FROM (
  SELECT * FROM table_findings
  UNION ALL
  SELECT * FROM policy_findings
  UNION ALL
  SELECT * FROM function_findings
) findings
ORDER BY finding_type, object_name;
