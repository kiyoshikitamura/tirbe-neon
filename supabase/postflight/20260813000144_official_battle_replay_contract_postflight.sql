with checks(display_order, check_name, status, detail) as (
  select 10, 'official_replay_columns',
    case when count(*) = 3 then 'PASS' else 'FAIL' end,
    count(*)::text || '/3 finalization column(s)'
  from information_schema.columns
  where table_schema = 'public' and table_name = 'battle_replay_sessions'
    and column_name in ('finalization_status', 'finalized_at', 'finalization_result')
  union all
  select 20, 'snapshot_builder',
    case when to_regprocedure('public.build_server_battle_snapshot(uuid,text[],text)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.build_server_battle_snapshot(uuid,text[],text)')::text, 'missing')
  union all
  select 30, 'result_validator',
    case when to_regprocedure('public.validate_official_battle_result(jsonb)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.validate_official_battle_result(jsonb)')::text, 'missing')
  union all
  select 40, 'security_definer_and_search_path',
    case when count(*) filter (where p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=public%') = 1 then 'PASS' else 'FAIL' end,
    count(*) filter (where p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=public%')::text || '/1 hardened snapshot function(s)'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.oid = to_regprocedure('public.build_server_battle_snapshot(uuid,text[],text)')
  union all
  select 50, 'consumer_execute_denied',
    case when not has_function_privilege('anon', 'public.build_server_battle_snapshot(uuid,text[],text)', 'EXECUTE')
          and not has_function_privilege('authenticated', 'public.build_server_battle_snapshot(uuid,text[],text)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.validate_official_battle_result(jsonb)', 'EXECUTE')
          and not has_function_privilege('authenticated', 'public.validate_official_battle_result(jsonb)', 'EXECUTE')
         then 'PASS' else 'FAIL' end,
    'official snapshot/result helpers are not consumer-callable'
  union all
  select 60, 'service_role_execute',
    case when has_function_privilege('service_role', 'public.build_server_battle_snapshot(uuid,text[],text)', 'EXECUTE')
          and has_function_privilege('service_role', 'public.validate_official_battle_result(jsonb)', 'EXECUTE')
         then 'PASS' else 'FAIL' end,
    '2/2 helper function(s) reserved for trusted server execution'
)
select * from checks order by display_order;
