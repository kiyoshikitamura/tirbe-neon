-- Run after 20260812000121_secure_provisional_progression.sql on Development only.
-- Expected result: every row is PASS.

with required_functions(signature) as (
  values
    ('public.level_up_character(uuid,text,integer)'),
    ('public.level_up_equipment(uuid,text,integer)'),
    ('public.limit_break_equipment(uuid,boolean,uuid)'),
    ('public.limit_break_skill(uuid,boolean,uuid)')
), function_checks as (
  select signature, to_regprocedure(signature) as function_oid from required_functions
), checks as (
  select 10 as display_order, 'provisional_master_coverage'::text as check_name,
    case when
      (select count(*) from public.character_level_up_master) = 99 and
      (select count(*) from public.equipment_level_up_master) = 99 and
      (select count(*) from public.equipment_limit_break_master) = 10 and
      (select count(*) from public.skill_limit_break_master) = 10
    then 'PASS' else 'FAIL' end as status,
    format('character=%s, equipment=%s, equipment_lb=%s, skill_lb=%s',
      (select count(*) from public.character_level_up_master),
      (select count(*) from public.equipment_level_up_master),
      (select count(*) from public.equipment_limit_break_master),
      (select count(*) from public.skill_limit_break_master)) as detail
  union all
  select 20, 'provisional_master_values',
    case when
      (select count(*) from public.character_level_up_master where cost_cash = 100 and required_material_count = 1) = 99 and
      (select count(*) from public.equipment_level_up_master where cost_cash = 50 and required_exp = 1) = 99 and
      (select count(*) from public.equipment_limit_break_master where cost_cash = plus_val * 1000 and required_hammer = 1 and success_rate = 1) = 10 and
      (select count(*) from public.skill_limit_break_master where cost_cash = plus_val * 1000 and required_book = 1) = 10
    then 'PASS' else 'FAIL' end,
    'release-review provisional values are installed'
  union all
  select 30, 'required_functions',
    case when count(function_oid) = 4 then 'PASS' else 'FAIL' end,
    count(function_oid)::text || '/4 function(s)'
  from function_checks
  union all
  select 40, 'security_definer_and_search_path',
    case when count(*) filter (where proc.prosecdef and array_to_string(proc.proconfig, ',') like '%search_path=public%') = 4 then 'PASS' else 'FAIL' end,
    count(*) filter (where proc.prosecdef and array_to_string(proc.proconfig, ',') like '%search_path=public%')::text || '/4 hardened function(s)'
  from function_checks checked join pg_proc proc on proc.oid = checked.function_oid
  union all
  select 50, 'authenticated_execute',
    case when count(*) filter (where has_function_privilege('authenticated', signature, 'EXECUTE')) = 4 then 'PASS' else 'FAIL' end,
    count(*) filter (where has_function_privilege('authenticated', signature, 'EXECUTE'))::text || '/4 function(s) executable'
  from function_checks
  union all
  select 60, 'anon_execute_denied',
    case when count(*) filter (where has_function_privilege('anon', signature, 'EXECUTE')) = 0 then 'PASS' else 'FAIL' end,
    count(*) filter (where has_function_privilege('anon', signature, 'EXECUTE'))::text || '/4 function(s) unexpectedly executable'
  from function_checks
  union all
  select 70, 'direct_progression_updates_denied',
    case when
      not has_column_privilege('authenticated', 'public.user_characters', 'level', 'UPDATE') and
      not has_column_privilege('authenticated', 'public.user_characters', 'awakening_level', 'UPDATE') and
      not has_column_privilege('authenticated', 'public.user_equipments', 'level', 'UPDATE') and
      not has_column_privilege('authenticated', 'public.user_equipments', 'plus_val', 'UPDATE') and
      not has_column_privilege('authenticated', 'public.user_skills', 'plus_val', 'UPDATE')
    then 'PASS' else 'FAIL' end,
    'authenticated cannot bypass server-authoritative economic progression'
  union all
  select 80, 'legacy_caller_authority_rpcs_denied',
    case when
      not coalesce(has_function_privilege('authenticated', to_regprocedure('public.character_level_up(uuid,text,text,integer,integer)'), 'EXECUTE'), false) and
      not coalesce(has_function_privilege('authenticated', to_regprocedure('public.upgrade_gear(uuid,uuid,text,integer,integer)'), 'EXECUTE'), false) and
      not coalesce(has_function_privilege('authenticated', to_regprocedure('public.limit_break_gear_v2(uuid,uuid,integer,boolean,uuid,jsonb)'), 'EXECUTE'), false) and
      not coalesce(has_function_privilege('authenticated', to_regprocedure('public.limit_break_skill_v2(uuid,uuid,integer,boolean,uuid,text)'), 'EXECUTE'), false)
    then 'PASS' else 'FAIL' end,
    'legacy caller-supplied user/cost/material RPCs are absent or denied'
)
select * from checks order by display_order;
