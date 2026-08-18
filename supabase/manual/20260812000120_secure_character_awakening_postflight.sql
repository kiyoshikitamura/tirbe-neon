-- Run after 20260812000120_secure_character_awakening.sql on Development only.
-- Expected result: every row is PASS.

with checks as (
  select 10 as display_order, 'function:awaken_character'::text as check_name,
    case when to_regprocedure('public.awaken_character(uuid)') is not null then 'PASS' else 'FAIL' end as status,
    coalesce(to_regprocedure('public.awaken_character(uuid)')::text, 'missing') as detail
  union all
  select 20, 'awakening_master_coverage',
    case when count(*) = 5 and min(awakening_level) = 1 and max(awakening_level) = 5
      and count(*) filter (where required_cash > 0) = 5 then 'PASS' else 'FAIL' end,
    count(*)::text || '/5 level(s) with positive server costs'
  from public.character_awakening_master
  union all
  select 30, 'security_definer_and_search_path',
    case when proc.prosecdef and array_to_string(proc.proconfig, ',') like '%search_path=public%' then 'PASS' else 'FAIL' end,
    case when proc.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end || ' / ' || coalesce(array_to_string(proc.proconfig, ','), 'no config')
  from pg_proc proc where proc.oid = to_regprocedure('public.awaken_character(uuid)')
  union all
  select 40, 'authenticated_execute',
    case when has_function_privilege('authenticated', 'public.awaken_character(uuid)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'authenticated execute privilege'
  union all
  select 50, 'anon_execute_denied',
    case when not has_function_privilege('anon', 'public.awaken_character(uuid)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'anon execute privilege denied'
  union all
  select 60, 'legacy_caller_cost_rpc_denied',
    case when not coalesce(has_function_privilege('authenticated', to_regprocedure('public.character_awaken(uuid,text,integer)'), 'EXECUTE'), false)
      then 'PASS' else 'FAIL' end,
    'legacy caller-supplied user/cost overload is absent or denied'
)
select * from checks order by display_order;
