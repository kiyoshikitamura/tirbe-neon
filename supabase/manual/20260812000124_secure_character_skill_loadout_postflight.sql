-- Run after 20260812000124_secure_character_skill_loadout.sql on Development only.
with checks(display_order, check_name, status, detail) as (
  values
    (10, 'required_functions', case when
      to_regprocedure('public.set_character_skill(uuid,uuid,integer)') is not null and
      to_regprocedure('public.unequip_character_skill(uuid)') is not null and
      to_regprocedure('public.set_character_skill_loadout(uuid,uuid[],integer[])') is not null
      then 'PASS' else 'FAIL' end, '3/3 secure skill loadout functions'),
    (20, 'security_definer_and_search_path', case when (
      select count(*) from pg_proc p where p.oid in (
        to_regprocedure('public.set_character_skill(uuid,uuid,integer)'),
        to_regprocedure('public.unequip_character_skill(uuid)'),
        to_regprocedure('public.set_character_skill_loadout(uuid,uuid[],integer[])')
      ) and p.prosecdef and coalesce(array_to_string(p.proconfig, ','),'') like '%search_path=public%'
    ) = 3 then 'PASS' else 'FAIL' end, '3/3 hardened function(s)'),
    (30, 'authenticated_execute', case when
      has_function_privilege('authenticated','public.set_character_skill(uuid,uuid,integer)','EXECUTE') and
      has_function_privilege('authenticated','public.unequip_character_skill(uuid)','EXECUTE') and
      has_function_privilege('authenticated','public.set_character_skill_loadout(uuid,uuid[],integer[])','EXECUTE')
      then 'PASS' else 'FAIL' end, 'authenticated may manage owned skill loadouts'),
    (40, 'anon_execute_denied', case when not
      has_function_privilege('anon','public.set_character_skill(uuid,uuid,integer)','EXECUTE') and not
      has_function_privilege('anon','public.unequip_character_skill(uuid)','EXECUTE') and not
      has_function_privilege('anon','public.set_character_skill_loadout(uuid,uuid[],integer[])','EXECUTE')
      then 'PASS' else 'FAIL' end, 'anon may not manage skill loadouts'),
    (50, 'direct_skill_update_denied', case when
      not has_table_privilege('authenticated','public.user_skills','UPDATE') and
      not has_column_privilege('authenticated','public.user_skills','equipped_character_id','UPDATE') and
      not has_column_privilege('authenticated','public.user_skills','slot_index','UPDATE')
      then 'PASS' else 'FAIL' end, 'authenticated cannot bypass skill loadout/progression RPCs'),
    (60, 'legacy_user_id_rpc_denied', case when
      (to_regprocedure('public.equip_skill_bulk(text,uuid,jsonb)') is null or not has_function_privilege('authenticated','public.equip_skill_bulk(text,uuid,jsonb)','EXECUTE')) and
      (to_regprocedure('public.unequip_skill_bulk(text,uuid)') is null or not has_function_privilege('authenticated','public.unequip_skill_bulk(text,uuid)','EXECUTE'))
      then 'PASS' else 'FAIL' end, 'legacy caller-supplied user_id RPCs are absent or denied')
)
select * from checks order by display_order;
