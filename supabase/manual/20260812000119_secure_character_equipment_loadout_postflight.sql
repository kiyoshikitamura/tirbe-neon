-- Run after 20260812000119_secure_character_equipment_loadout.sql on Development only.
-- Expected result: every row is PASS.

with required_functions(signature) as (
  values
    ('public.set_character_equipment(uuid,uuid,integer)'),
    ('public.unequip_character_equipment(uuid)'),
    ('public.set_character_equipment_bulk(uuid,uuid[],integer[])'),
    ('public.unequip_character_equipment_bulk(uuid)')
), function_checks as (
  select signature, to_regprocedure(signature) as function_oid from required_functions
), checks as (
  select 10 as display_order, 'required_functions'::text as check_name,
    case when count(function_oid) = 4 then 'PASS' else 'FAIL' end as status,
    count(function_oid)::text || '/4 function(s)' as detail
  from function_checks
  union all
  select 20, 'security_definer_and_search_path',
    case when count(*) filter (where proc.prosecdef and array_to_string(proc.proconfig, ',') like '%search_path=public%') = 4 then 'PASS' else 'FAIL' end,
    count(*) filter (where proc.prosecdef and array_to_string(proc.proconfig, ',') like '%search_path=public%')::text || '/4 hardened function(s)'
  from function_checks checked join pg_proc proc on proc.oid = checked.function_oid
  union all
  select 30, 'authenticated_execute',
    case when count(*) filter (where has_function_privilege('authenticated', signature, 'EXECUTE')) = 4 then 'PASS' else 'FAIL' end,
    count(*) filter (where has_function_privilege('authenticated', signature, 'EXECUTE'))::text || '/4 function(s) executable'
  from function_checks
  union all
  select 40, 'anon_execute_denied',
    case when count(*) filter (where has_function_privilege('anon', signature, 'EXECUTE')) = 0 then 'PASS' else 'FAIL' end,
    count(*) filter (where has_function_privilege('anon', signature, 'EXECUTE'))::text || '/4 function(s) unexpectedly executable'
  from function_checks
  union all
  select 50, 'direct_equipment_update_denied',
    case when not has_table_privilege('authenticated', 'public.user_equipments', 'UPDATE') then 'PASS' else 'FAIL' end,
    'authenticated cannot bypass equipment progression/loadout RPCs'
  union all
  select 60, 'legacy_user_id_rpc_denied',
    case when not coalesce(has_function_privilege('authenticated', to_regprocedure('public.unequip_gear_bulk(text,uuid)'), 'EXECUTE'), false)
           and not coalesce(has_function_privilege('authenticated', to_regprocedure('public.equip_gear_bulk(text,uuid,jsonb)'), 'EXECUTE'), false)
      then 'PASS' else 'FAIL' end,
    'legacy caller-supplied user_id overloads are absent or denied'
  union all
  select 70, 'existing_slot_integrity',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' invalid equipped row(s)'
  from public.user_equipments owned
  left join public.equipment_battle_master master
    on master.equipment_id = coalesce(nullif(owned.equipment_id, ''), owned.equipment_master_id)
  where owned.equipped_character_id is not null
    and (
      owned.slot_index not between 0 and 6
      or master.equipment_id is null
      or master.slot_type <> case owned.slot_index
        when 0 then 'WEAPON' when 1 then 'WEAPON'
        when 2 then 'HEAD' when 3 then 'BODY' when 4 then 'LEGS'
        when 5 then 'ACCESSORY' when 6 then 'ACCESSORY'
      end
    )
)
select * from checks order by display_order;
