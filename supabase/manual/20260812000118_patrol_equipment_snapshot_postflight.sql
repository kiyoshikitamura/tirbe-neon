-- Run after 20260812000118_patrol_equipment_snapshot.sql on Development only.
-- Expected result: every row is PASS (MANUAL rows require a Dashboard check).

with checks as (
  select 10 as display_order, 'table:equipment_battle_master'::text as check_name,
    case when to_regclass('public.equipment_battle_master') is not null then 'PASS' else 'FAIL' end as status,
    coalesce(to_regclass('public.equipment_battle_master')::text, 'missing') as detail
  union all
  select 20, 'equipment_master_row_count',
    case when (select count(*) from public.equipment_battle_master) = 172 then 'PASS' else 'FAIL' end,
    (select count(*)::text || '/172 row(s)' from public.equipment_battle_master)
  union all
  select 30, 'owned_equipment_master_coverage',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' owned equipment row(s) have no battle master'
  from public.user_equipments owned
  left join public.equipment_battle_master master
    on master.equipment_id = coalesce(nullif(owned.equipment_id, ''), owned.equipment_master_id)
  where master.equipment_id is null
  union all
  select 40, 'function:create_patrol_battle_replay',
    case when to_regprocedure('public.create_patrol_battle_replay(uuid,text)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')::text, 'missing')
  union all
  select 50, 'server_equipment_snapshot',
    case when lower(pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)'))) like '%equipment_battle_master%'
           and pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')) like '%equippedSkillRefs%'
      then 'PASS' else 'FAIL' end,
    'equipment stats and pending skill references are resolved inside the RPC'
  union all
  select 60, 'security_definer_and_search_path',
    case when p.prosecdef and array_to_string(p.proconfig, ',') like '%search_path=public%' then 'PASS' else 'FAIL' end,
    case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end || ' / ' || coalesce(array_to_string(p.proconfig, ','), 'no config')
  from pg_proc p where p.oid = to_regprocedure('public.create_patrol_battle_replay(uuid,text)')
  union all
  select 70, 'authenticated_execute',
    case when has_function_privilege('authenticated', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'authenticated execute privilege'
  union all
  select 80, 'anon_execute_denied',
    case when not has_function_privilege('anon', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'anon execute privilege denied'
  union all
  select 90, 'client_master_write_denied',
    case when not has_table_privilege('authenticated', 'public.equipment_battle_master', 'INSERT,UPDATE,DELETE') then 'PASS' else 'FAIL' end,
    'authenticated cannot mutate canonical equipment mappings'
)
select * from checks order by display_order;
