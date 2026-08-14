with checks(display_order, check_name, status, detail) as (
  select 10, 'required_functions',
    case when count(*) = 2 then 'PASS' else 'FAIL' end,
    count(*)::text || '/2 official PvP function(s)'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.oid in (
    to_regprocedure('public.start_pvp_battle(uuid,text[],text)'),
    to_regprocedure('public.finalize_pvp_battle(uuid,jsonb)')
  )
  union all
  select 20, 'security_definer_and_search_path',
    case when count(*) filter (where p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=public%') = 2 then 'PASS' else 'FAIL' end,
    count(*) filter (where p.prosecdef and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=public%')::text || '/2 hardened function(s)'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.oid in (
    to_regprocedure('public.start_pvp_battle(uuid,text[],text)'),
    to_regprocedure('public.finalize_pvp_battle(uuid,jsonb)')
  )
  union all
  select 30, 'authenticated_start_only',
    case when has_function_privilege('authenticated', 'public.start_pvp_battle(uuid,text[],text)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.start_pvp_battle(uuid,text[],text)', 'EXECUTE')
         then 'PASS' else 'FAIL' end,
    'authenticated may start; anon may not'
  union all
  select 40, 'service_role_finalize_only',
    case when has_function_privilege('service_role', 'public.finalize_pvp_battle(uuid,jsonb)', 'EXECUTE')
          and not has_function_privilege('authenticated', 'public.finalize_pvp_battle(uuid,jsonb)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.finalize_pvp_battle(uuid,jsonb)', 'EXECUTE')
         then 'PASS' else 'FAIL' end,
    'consumer cannot submit a PvP result'
  union all
  select 50, 'legacy_result_rpc_stays_denied',
    case when to_regprocedure('public.process_pvp_match_result_v2(uuid,boolean,integer,integer)') is null
           or (not has_function_privilege('authenticated', 'public.process_pvp_match_result_v2(uuid,boolean,integer,integer)', 'EXECUTE')
               and not has_function_privilege('anon', 'public.process_pvp_match_result_v2(uuid,boolean,integer,integer)', 'EXECUTE'))
         then 'PASS' else 'FAIL' end,
    'legacy client-authored outcome remains retired'
  union all
  select 60, 'canonical_match_rewards',
    case when count(*) = 2 then 'PASS' else 'FAIL' end,
    count(*)::text || '/2 result reward row(s)'
  from public.pvp_match_rewards_master where result in ('VICTORY', 'DEFEAT')
)
select * from checks order by display_order;
