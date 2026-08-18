with expected(name, identity_args) as (
  values
    ('get_pvp_opponents', 'p_user_id uuid, p_my_points integer'),
    ('get_current_skill_display', 'p_skill_ids text[]')
), resolved as (
  select e.name, p.oid, p.prosecdef, p.proconfig
  from expected e
  left join pg_proc p on p.proname=e.name and pg_get_function_identity_arguments(p.oid)=e.identity_args
  left join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
)
select 10 as display_order, 'required_functions' as check_name,
  case when count(oid)=2 then 'PASS' else 'FAIL' end as status,
  count(oid)||'/2 function(s)' as detail from resolved
union all
select 20, 'security_definer_and_search_path',
  case when count(*) filter(where prosecdef and proconfig @> array['search_path=public'])=2 then 'PASS' else 'FAIL' end,
  count(*) filter(where prosecdef and proconfig @> array['search_path=public'])||'/2 hardened function(s)' from resolved
union all
select 30, 'authenticated_execute',
  case when count(*) filter(where has_function_privilege('authenticated',oid,'EXECUTE'))=2 then 'PASS' else 'FAIL' end,
  count(*) filter(where has_function_privilege('authenticated',oid,'EXECUTE'))||'/2 executable function(s)' from resolved
union all
select 40, 'anon_execute_denied',
  case when count(*) filter(where has_function_privilege('anon',oid,'EXECUTE'))=0 then 'PASS' else 'FAIL' end,
  count(*) filter(where has_function_privilege('anon',oid,'EXECUTE'))||'/2 unexpectedly executable function(s)' from resolved
union all
select 50, 'pvp_public_snapshot_shape',
  case when pg_get_functiondef((select oid from resolved where name='get_pvp_opponents')) like '%defense_characters%'
    and pg_get_functiondef((select oid from resolved where name='get_pvp_opponents')) like '%opponent_power%'
    and pg_get_functiondef((select oid from resolved where name='get_pvp_opponents')) like '%opponent_rank%' then 'PASS' else 'FAIL' end,
  'power, rank, guild and display-safe defense snapshots are server-resolved'
union all
select 60, 'skill_owned_scope',
  case when pg_get_functiondef((select oid from resolved where name='get_current_skill_display')) like '%skill.user_id = v_user_id%'
    and pg_get_functiondef((select oid from resolved where name='get_current_skill_display')) not like '%status_chance%' then 'PASS' else 'FAIL' end,
  'owned skills only; hidden status probability is not returned'
order by display_order;
