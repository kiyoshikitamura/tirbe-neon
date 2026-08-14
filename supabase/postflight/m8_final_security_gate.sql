WITH critical_tables(table_name) AS (
  VALUES
    ('users'::text), ('user_characters'), ('user_equipments'), ('user_skills'),
    ('user_items'), ('user_daily_gacha_claims'), ('user_gacha_pity_points'),
    ('presents'), ('user_login_bonuses'), ('user_missions'), ('guilds'),
    ('guild_members'), ('guild_join_requests'), ('board_posts'), ('chat_read_states'),
    ('bbs_threads'), ('bbs_posts'), ('bbs_read_states'), ('direct_messages'),
    ('payment_transactions'), ('user_monthly_passes')
), existing_critical_tables AS (
  SELECT t.table_name, c.oid, c.relrowsecurity
  FROM critical_tables t
  JOIN pg_class c ON c.relname = t.table_name
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
), allowed_caller_id_functions(signature) AS (
  VALUES
    ('complete_patrol_instantly(uuid,uuid,text)'::text),
    ('consume_pvp_point(uuid)'),
    ('create_guild_v2(uuid,text,integer)'),
    ('donate_to_guild(uuid,uuid,integer)'),
    ('exchange_pity_reward(uuid,text,text)'),
    ('execute_asset_gacha(uuid,text,integer,text)'),
    ('execute_character_gacha(uuid,text,integer,text)'),
    ('generate_user_gift_code(uuid)'),
    ('get_public_battle_loadout(uuid)'),
    ('get_public_battle_roster(uuid)'),
    ('get_pvp_opponents(uuid,integer)'),
    ('kick_guild_member(uuid,uuid)'),
    ('leave_guild(uuid,uuid,boolean,boolean)'),
    ('set_guild_member_role(uuid,uuid,text)'),
    ('sync_and_recover_vitality_and_pvp_points(uuid)')
), caller_id_candidates AS (
  SELECT p.oid::regprocedure::text AS signature
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND EXISTS (
      SELECT 1
      FROM generate_subscripts(coalesce(p.proargnames, ARRAY[]::text[]), 1) argument_index
      WHERE p.proargnames[argument_index] IN ('p_user_id', 'user_id', 'target_user_id', 'p_target_user_id')
        AND (p.proargmodes IS NULL OR p.proargmodes[argument_index] IN ('i', 'b', 'v'))
    )
), checks AS (
  SELECT 10 AS display_order, 'critical_table_inventory' AS check_name,
    CASE WHEN count(*) = 21 THEN 'PASS' ELSE 'FAIL' END AS status,
    format('%s/21 critical table(s) resolved', count(*)) AS detail
  FROM existing_critical_tables

  UNION ALL

  SELECT 20, 'critical_rls_enabled',
    CASE WHEN count(*) FILTER (WHERE relrowsecurity) = count(*) THEN 'PASS' ELSE 'FAIL' END,
    format('%s/%s critical table(s)', count(*) FILTER (WHERE relrowsecurity), count(*))
  FROM existing_critical_tables

  UNION ALL

  SELECT 30, 'critical_direct_mutation_denied',
    CASE WHEN count(*) FILTER (
      WHERE has_table_privilege('authenticated', oid, 'INSERT')
         OR has_table_privilege('authenticated', oid, 'UPDATE')
         OR has_table_privilege('authenticated', oid, 'DELETE')
    ) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s critical table(s) retain table-level direct mutation privilege', count(*) FILTER (
      WHERE has_table_privilege('authenticated', oid, 'INSERT')
         OR has_table_privilege('authenticated', oid, 'UPDATE')
         OR has_table_privilege('authenticated', oid, 'DELETE')
    ))
  FROM existing_critical_tables

  UNION ALL

  SELECT 40, 'users_profile_columns_only',
    CASE WHEN has_column_privilege('authenticated', 'public.users', 'username', 'UPDATE')
           AND has_column_privilege('authenticated', 'public.users', 'sound_settings', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'cash', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'neon_diamonds', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'vitality', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'level', 'UPDATE')
           AND NOT has_column_privilege('authenticated', 'public.users', 'xp', 'UPDATE')
      THEN 'PASS' ELSE 'FAIL' END,
    'only approved presentation/profile columns are client-editable'

  UNION ALL

  SELECT 50, 'security_definer_search_path',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s authenticated SECURITY DEFINER function(s) have no fixed public search_path', count(*))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND NOT (coalesce(p.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=public'])

  UNION ALL

  SELECT 60, 'caller_id_allowlist',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s unexpected authenticated caller-id function(s)', count(*))
  FROM caller_id_candidates candidate
  LEFT JOIN allowed_caller_id_functions allowed ON allowed.signature = candidate.signature
  WHERE allowed.signature IS NULL

  UNION ALL

  SELECT 70, 'broad_policy_allowlist',
    CASE WHEN count(*) FILTER (
      WHERE NOT (tablename IN ('bbs_threads', 'bbs_posts') AND cmd = 'SELECT')
    ) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s unexpected broad critical policy/policies', count(*) FILTER (
      WHERE NOT (tablename IN ('bbs_threads', 'bbs_posts') AND cmd = 'SELECT')
    ))
  FROM pg_policies p
  JOIN critical_tables t ON t.table_name = p.tablename
  WHERE p.schemaname = 'public'
    AND (
      coalesce(p.qual, '') IN ('true', '(true)')
      OR coalesce(p.with_check, '') IN ('true', '(true)')
    )

  UNION ALL

  SELECT 80, 'client_qa_functions_absent',
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s QA fixture function(s) remain', count(*))
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
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
