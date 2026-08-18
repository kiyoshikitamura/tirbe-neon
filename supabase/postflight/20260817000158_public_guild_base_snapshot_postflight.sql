with function_row as (
  select p.* from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.oid='public.get_public_guild_base_controls()'::regprocedure
), checks as (
  select 10 display_order,'public_base_snapshot_function' check_name,case when count(*)=1 then 'PASS' else 'FAIL' end status,count(*)||'/1 function(s)' detail from function_row
  union all select 20,'security_definer_and_search_path',case when bool_and(prosecdef and coalesce(proconfig,array[]::text[])@>array['search_path=public']) then 'PASS' else 'FAIL' end,'hardened public snapshot' from function_row
  union all select 30,'authenticated_execute',case when has_function_privilege('authenticated','public.get_public_guild_base_controls()','EXECUTE') then 'PASS' else 'FAIL' end,'authenticated may read public base state'
  union all select 40,'anon_execute_denied',case when not has_function_privilege('anon','public.get_public_guild_base_controls()','EXECUTE') then 'PASS' else 'FAIL' end,'anon may not read public base state'
  union all select 50,'retired_points_hidden',case when pg_get_functiondef('public.get_public_guild_base_controls()'::regprocedure) not like '%''daily_points''%' then 'PASS' else 'FAIL' end,'legacy daily points are not in the public contract'
)
select * from checks order by display_order;
