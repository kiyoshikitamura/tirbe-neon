-- Run after 20260812000123_replaceable_skill_battle_master.sql on Development only.
-- Expected result: every row is PASS.

with replay_definition as (
  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')) as body
), checks as (
  select 10 as display_order, 'skill_master_coverage'::text as check_name,
    case when count(*) = 70 and count(*) filter (where enabled) = 50 and count(*) filter (where not enabled) = 20 then 'PASS' else 'FAIL' end as status,
    format('%s total / %s enabled / %s disabled', count(*), count(*) filter (where enabled), count(*) filter (where not enabled)) as detail
  from public.skill_battle_master
  union all
  select 20, 'placeholder_exclusive_skills_disabled',
    case when count(*) = 20 and count(*) filter (where enabled or exclusive_character_id is not null) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || '/20 placeholder skill(s) disabled without invented character mapping'
  from public.skill_battle_master where skill_id between 'SKILL_051' and 'SKILL_070'
  union all
  select 30, 'finalized_effect_constraints',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' invalid executable skill row(s)'
  from public.skill_battle_master
  where kind not in ('ATTACK','HEAL','BUFF','DEBUFF')
    or (target = 'ENEMY_ALL' and status in ('SILENCE','STUN'))
    or modifier_percent > 25
    or (kind = 'HEAL' and ((target = 'ALLY_SINGLE' and power_percent > 30) or (target = 'ALLY_ALL' and power_percent > 18)))
  union all
  select 40, 'patrol_snapshot_uses_skill_master',
    case when body like '%join public.skill_battle_master%' and body like '%' || quote_literal('skills') || ', canonical.equipped_skill_refs%' then 'PASS' else 'FAIL' end,
    'QUEST snapshot resolves executable skills from the replaceable master'
  from replay_definition
  union all
  select 50, 'unlocked_slots_and_exclusive_guard',
    case when body like '%owned.slot_index between 0 and least(5, 2 + greatest(coalesce(base.awakening_level, 0), 0))%'
          and body like '%master.exclusive_character_id is null or master.exclusive_character_id = base.character_id%'
      then 'PASS' else 'FAIL' end,
    'snapshot enforces awakening slots and future exclusive character mappings'
  from replay_definition
  union all
  select 60, 'security_definer_and_search_path',
    case when proc.prosecdef and array_to_string(proc.proconfig, ',') like '%search_path=public%' then 'PASS' else 'FAIL' end,
    case when proc.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end || ' / ' || coalesce(array_to_string(proc.proconfig, ','), 'no config')
  from pg_proc proc where proc.oid = to_regprocedure('public.create_patrol_battle_replay(uuid,text)')
  union all
  select 70, 'authenticated_execute',
    case when has_function_privilege('authenticated', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'authenticated may create owned patrol replays'
  union all
  select 80, 'anon_execute_denied',
    case when not has_function_privilege('anon', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
    'anon may not create patrol replays'
  union all
  select 90, 'client_master_write_denied',
    case when not has_table_privilege('authenticated', 'public.skill_battle_master', 'INSERT')
           and not has_table_privilege('authenticated', 'public.skill_battle_master', 'UPDATE')
           and not has_table_privilege('authenticated', 'public.skill_battle_master', 'DELETE')
      then 'PASS' else 'FAIL' end,
    'authenticated cannot mutate canonical executable skill definitions'
)
select * from checks order by display_order;
