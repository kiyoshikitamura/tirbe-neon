-- Run in the Development project SQL editor after
-- 20260812000116_patrol_ap_atomicity.sql.

with function_info as (
  select proc.prosecdef,
         proc.proconfig,
         pg_get_functiondef(proc.oid) as definition
  from pg_proc proc
  where proc.oid = to_regprocedure('public.start_patrol(text,text)')
), checks as (
  select 10 as display_order,
         'function:start_patrol(text,text)'::text as check_name,
         case when exists (select 1 from function_info) then 'PASS' else 'FAIL' end as status,
         coalesce(to_regprocedure('public.start_patrol(text,text)')::text, 'missing') as detail
  union all
  select 20,
         'atomic_recovery_before_consumption',
         case when exists (
           select 1 from function_info
           where definition like '%sync_and_recover_vitality_and_pvp_points(v_user_id)%'
             and definition like '%v_vitality := v_vitality - v_cost_vitality%'
         ) then 'PASS' else 'FAIL' end,
         'recovery and AP consumption are inside start_patrol'
  union all
  select 30,
         'authoritative_remaining_vitality',
         case when exists (
           select 1 from function_info where definition like '%remaining_vitality%'
         ) then 'PASS' else 'FAIL' end,
         'RPC returns the committed remaining AP'
  union all
  select 40,
         'security_definer_and_search_path',
         case when exists (
           select 1 from function_info
           where prosecdef and 'search_path=public' = any(proconfig)
         ) then 'PASS' else 'FAIL' end,
         'SECURITY DEFINER with search_path=public'
  union all
  select 50,
         'authenticated_execute',
         case when has_function_privilege('authenticated', 'public.start_patrol(text,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
         'authenticated may execute'
  union all
  select 60,
         'anon_execute_denied',
         case when not has_function_privilege('anon', 'public.start_patrol(text,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
         'anon may not execute'
)
select * from checks order by display_order;
