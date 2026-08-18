-- Run in the Development project SQL editor after
-- 20260812000115_patrol_instant_costs.sql.

with checks as (
  select 10 as display_order,
         'column:daily_cash_skips_reset_date'::text as check_name,
         case when exists (
           select 1 from information_schema.columns
           where table_schema = 'public'
             and table_name = 'users'
             and column_name = 'daily_cash_skips_reset_date'
             and data_type = 'date'
         ) then 'PASS' else 'FAIL' end as status,
         'users.daily_cash_skips_reset_date date'::text as detail
  union all
  select 20,
         'function:complete_patrol_instantly(uuid,uuid,text)',
         case when to_regprocedure('public.complete_patrol_instantly(uuid,uuid,text)') is not null then 'PASS' else 'FAIL' end,
         coalesce(to_regprocedure('public.complete_patrol_instantly(uuid,uuid,text)')::text, 'missing')
  union all
  select 30,
         'security_definer_and_search_path',
         case when exists (
           select 1 from pg_proc proc
           where proc.oid = to_regprocedure('public.complete_patrol_instantly(uuid,uuid,text)')
             and proc.prosecdef
             and 'search_path=public' = any(proc.proconfig)
         ) then 'PASS' else 'FAIL' end,
         'SECURITY DEFINER with search_path=public'
  union all
  select 40,
         'authenticated_execute',
         case when has_function_privilege('authenticated', 'public.complete_patrol_instantly(uuid,uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
         'authenticated may execute'
  union all
  select 50,
         'anon_execute_denied',
         case when not has_function_privilege('anon', 'public.complete_patrol_instantly(uuid,uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
         'anon may not execute'
)
select * from checks order by display_order;
