with functions as (
  select p.oid,p.proname,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in(
    'complete_current_tutorial_formation','apply_tutorial_player_snapshot',
    'apply_tutorial_enemy_snapshot','create_patrol_battle_replay'
  )
), checks(display_order,check_name,status,detail) as (
  values
  (10,'required_functions',case when (select count(*) from functions)=4 then 'PASS' else 'FAIL' end,(select count(*)||'/4 function(s)' from functions)),
  (20,'starter_skill_contract',case when exists(select 1 from functions where proname='complete_current_tutorial_formation' and definition like '%SKILL_001%' and definition like '%starter_skill_granted%') then 'PASS' else 'FAIL' end,'existing enabled SKILL_001 is the Fresh User fallback'),
  (30,'starter_skill_idempotency',case when exists(select 1 from functions where proname='complete_current_tutorial_formation' and definition like '%select id into v_skill from public.user_skills%') then 'PASS' else 'FAIL' end,'retry cannot duplicate or limit-break the starter'),
  (40,'tutorial_snapshot_only',case when exists(select 1 from functions where proname='apply_tutorial_player_snapshot' and definition like '%TUTORIAL_BATTLE%') and exists(select 1 from functions where proname='apply_tutorial_enemy_snapshot' and definition like '%TUTORIAL_BATTLE%') then 'PASS' else 'FAIL' end,'cooldown and battle length shaping are tutorial-only'),
  (50,'patrol_snapshot_hook',case when exists(select 1 from functions where proname='create_patrol_battle_replay' and definition like '%apply_tutorial_player_snapshot%') then 'PASS' else 'FAIL' end,'authoritative patrol snapshot applies tutorial shaping'),
  (60,'security_definer_and_search_path',case when (select count(*) from functions where prosecdef and 'search_path=public'=any(coalesce(proconfig,array[]::text[])))=4 then 'PASS' else 'FAIL' end,'4/4 hardened functions'),
  (70,'authenticated_execute',case when exists(select 1 from functions where proname='complete_current_tutorial_formation' and has_function_privilege('authenticated',oid,'EXECUTE')) and exists(select 1 from functions where proname='create_patrol_battle_replay' and has_function_privilege('authenticated',oid,'EXECUTE')) then 'PASS' else 'FAIL' end,'only public tutorial endpoints are callable'),
  (80,'helper_execute_denied',case when not exists(select 1 from functions where proname like 'apply_tutorial_%' and (has_function_privilege('authenticated',oid,'EXECUTE') or has_function_privilege('anon',oid,'EXECUTE') or has_function_privilege('public',oid,'EXECUTE'))) then 'PASS' else 'FAIL' end,'internal snapshot helpers are not client-callable'),
  (90,'anon_public_endpoint_denied',case when not exists(select 1 from functions where proname in('complete_current_tutorial_formation','create_patrol_battle_replay') and (has_function_privilege('anon',oid,'EXECUTE') or has_function_privilege('public',oid,'EXECUTE'))) then 'PASS' else 'FAIL' end,'anon and PUBLIC denied')
)
select * from checks order by display_order;
