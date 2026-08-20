with function_contract as (
  select
    pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')) as definition
)
select * from (values
  (10, 'function:create_patrol_battle_replay',
    case when to_regprocedure('public.create_patrol_battle_replay(uuid,text)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')::text, 'missing')),
  (20, 'encounter_serialization',
    case when (select definition like '%pg_advisory_xact_lock(hashtextextended(p_patrol_id::text, 0))%' from function_contract) then 'PASS' else 'FAIL' end,
    'official patrol replay creation is serialized by patrol id'),
  (30, 'existing_replay_return',
    case when (select definition like '%resolution_authority = ''PATROL_SERVER''%' and definition like '%status in (''PENDING'', ''RESOLVED'')%' from function_contract) then 'PASS' else 'FAIL' end,
    'retries return the existing PENDING/RESOLVED canonical replay'),
  (40, 'security_definer_and_search_path',
    case when exists (
      select 1 from pg_proc proc
      where proc.oid = to_regprocedure('public.create_patrol_battle_replay(uuid,text)')
        and proc.prosecdef
        and proc.proconfig @> array['search_path=public']
    ) then 'PASS' else 'FAIL' end,
    'SECURITY DEFINER / search_path=public'),
  (50, 'authenticated_execute',
    case when has_function_privilege('authenticated', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'authenticated may start an owned official patrol replay'),
  (60, 'anon_execute_denied',
    case when not has_function_privilege('anon', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'anon may not create patrol replays'),
  (70, 'public_execute_denied',
    case when not has_function_privilege('public', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'PUBLIC may not create patrol replays')
) checks(display_order, check_name, status, detail)
order by display_order;
