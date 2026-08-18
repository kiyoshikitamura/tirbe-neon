-- Run after 20260812000122_equipment_level_battle_curve.sql on Development only.
-- Expected result: every row is PASS.

with replay_definition as (
  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')) as body
), checks as (
  select 10 as display_order, 'equipment_level_curve_points'::text as check_name,
    case when
      public.equipment_level_battle_scale(1) = 0.1 and
      public.equipment_level_battle_scale(50) = 0.6 and
      public.equipment_level_battle_scale(100) = 1.0
    then 'PASS' else 'FAIL' end as status,
    format('Lv1=%s, Lv50=%s, Lv100=%s',
      public.equipment_level_battle_scale(1),
      public.equipment_level_battle_scale(50),
      public.equipment_level_battle_scale(100)) as detail
  union all
  select 20, 'patrol_snapshot_uses_curve',
    case when (length(body) - length(replace(body, 'equipment_level_battle_scale', ''))) / length('equipment_level_battle_scale') = 3 then 'PASS' else 'FAIL' end,
    ((length(body) - length(replace(body, 'equipment_level_battle_scale', ''))) / length('equipment_level_battle_scale'))::text || '/3 stat expression(s)'
  from replay_definition
  union all
  select 30, 'security_definer_and_search_path',
    case when proc.prosecdef and array_to_string(proc.proconfig, ',') like '%search_path=public%' then 'PASS' else 'FAIL' end,
    case when proc.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end || ' / ' || coalesce(array_to_string(proc.proconfig, ','), 'no config')
  from pg_proc proc where proc.oid = to_regprocedure('public.create_patrol_battle_replay(uuid,text)')
  union all
  select 40, 'authenticated_execute',
    case when has_function_privilege('authenticated', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'authenticated may create owned patrol replays'
  union all
  select 50, 'anon_execute_denied',
    case when not has_function_privilege('anon', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'anon may not create patrol replays'
)
select * from checks order by display_order;
