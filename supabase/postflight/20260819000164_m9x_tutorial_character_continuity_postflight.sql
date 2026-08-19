with target as (
  select p.oid,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='complete_current_tutorial_formation'
), checks(display_order,check_name,status,detail) as (
  values
  (10,'tutorial_formation_rpc',case when to_regprocedure('public.complete_current_tutorial_formation()') is not null then 'PASS' else 'FAIL' end,'complete_current_tutorial_formation()'),
  (20,'formation_and_replay_deck_atomic',case when exists(select 1 from target where definition like '%save_main_formation(v_party)%' and definition like '%save_pvp_defense_deck(v_party,%') then 'PASS' else 'FAIL' end,'same canonical tutorial party feeds main formation and quest replay deck'),
  (25,'slot_ten_history_contract',case when exists(select 1 from target where definition like '%gacha_execution_history%' and definition like '%tutorial_slot%') then 'PASS' else 'FAIL' end,'slot 10 is resolved from authoritative tutorial gacha history'),
  (30,'owned_leader_contract',case when exists(select 1 from target where definition like '%leader_user_character_id%' and definition like '%guaranteed tutorial character is not owned%') then 'PASS' else 'FAIL' end,'returns the exact owned guaranteed-SSR leader id'),
  (40,'security_definer_and_search_path',case when exists(select 1 from target where prosecdef and 'search_path=public'=any(coalesce(proconfig,array[]::text[]))) then 'PASS' else 'FAIL' end,'SECURITY DEFINER / search_path=public'),
  (50,'authenticated_execute',case when exists(select 1 from target where has_function_privilege('authenticated',oid,'EXECUTE')) then 'PASS' else 'FAIL' end,'authenticated may execute'),
  (60,'anon_and_public_denied',case when not exists(select 1 from target where has_function_privilege('anon',oid,'EXECUTE') or has_function_privilege('public',oid,'EXECUTE')) then 'PASS' else 'FAIL' end,'anon and PUBLIC denied')
)
select * from checks order by display_order;
