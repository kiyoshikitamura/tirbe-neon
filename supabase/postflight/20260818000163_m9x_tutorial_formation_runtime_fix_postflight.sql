with target as (
  select p.oid,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='complete_current_tutorial_formation'
), checks(display_order,check_name,status,detail) as (
  values
  (10,'function:complete_current_tutorial_formation',case when to_regprocedure('public.complete_current_tutorial_formation()') is not null then 'PASS' else 'FAIL' end,'atomic tutorial formation RPC'),
  (20,'canonical_release_column',case when exists(select 1 from target where definition like '%release.is_enabled%' and definition not like '%release.enabled%') then 'PASS' else 'FAIL' end,'uses character_release_master.is_enabled'),
  (30,'security_definer_and_search_path',case when exists(select 1 from target where prosecdef and 'search_path=public'=any(coalesce(proconfig,array[]::text[]))) then 'PASS' else 'FAIL' end,'SECURITY DEFINER / search_path=public'),
  (40,'authenticated_execute',case when exists(select 1 from target where has_function_privilege('authenticated',oid,'EXECUTE')) then 'PASS' else 'FAIL' end,'authenticated may execute'),
  (50,'anon_execute_denied',case when not exists(select 1 from target where has_function_privilege('anon',oid,'EXECUTE')) then 'PASS' else 'FAIL' end,'anon may not execute'),
  (60,'public_execute_denied',case when not exists(select 1 from target where has_function_privilege('public',oid,'EXECUTE')) then 'PASS' else 'FAIL' end,'PUBLIC may not execute')
)
select * from checks order by display_order;
