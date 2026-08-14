with functions as (
  select p.oid, p.proname, p.prosecdef, p.proconfig
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('prepare_current_tutorial_growth', 'advance_current_tutorial_after_growth')
), checks as (
  select 10 display_order, 'required_functions' check_name,
    case when count(*) = 2 then 'PASS' else 'FAIL' end status,
    count(*) || '/2 function(s)' detail
  from functions
  union all
  select 20, 'security_definer_and_search_path',
    case when count(*) filter(where prosecdef and 'search_path=public' = any(proconfig)) = 2 then 'PASS' else 'FAIL' end,
    count(*) filter(where prosecdef and 'search_path=public' = any(proconfig)) || '/2 hardened function(s)'
  from functions
  union all
  select 30, 'authenticated_execute',
    case when count(*) filter(where has_function_privilege('authenticated', oid, 'EXECUTE')) = 2 then 'PASS' else 'FAIL' end,
    count(*) filter(where has_function_privilege('authenticated', oid, 'EXECUTE')) || '/2 executable function(s)'
  from functions
  union all
  select 40, 'anon_execute_denied',
    case when count(*) filter(where has_function_privilege('anon', oid, 'EXECUTE')) = 0 then 'PASS' else 'FAIL' end,
    count(*) filter(where has_function_privilege('anon', oid, 'EXECUTE')) || '/2 unexpectedly executable function(s)'
  from functions
)
select * from checks order by display_order;
