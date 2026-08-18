-- Run in the Development project SQL editor after
-- 20260812000117_mandatory_patrol_npc_battles.sql.

with function_info as (
  select proc.prosecdef,
         proc.proconfig,
         pg_get_functiondef(proc.oid) as definition
  from pg_proc proc
  where proc.oid = to_regprocedure('public.create_patrol_battle_replay(uuid,text)')
), checks as (
  select 10 as display_order,
         'table:character_battle_master'::text as check_name,
         case when to_regclass('public.character_battle_master') is not null then 'PASS' else 'FAIL' end as status,
         coalesce(to_regclass('public.character_battle_master')::text, 'missing') as detail
  union all
  select 20,
         'released_quests_have_npc',
         case when not exists (
           select 1 from public.quests quest
           where not exists (select 1 from public.patrol_npcs npc where npc.quest_id = quest.id)
         ) then 'PASS' else 'FAIL' end,
         (select count(distinct npc.quest_id)::text || '/' || count(distinct quest.id)::text || ' quest(s) covered'
          from public.quests quest left join public.patrol_npcs npc on npc.quest_id = quest.id)
  union all
  select 30,
         'mandatory_encounter_rate',
         case when not exists (select 1 from public.patrol_npcs where encounter_rate <> 1) then 'PASS' else 'FAIL' end,
         (select count(*)::text || ' NPC master(s) at 100%' from public.patrol_npcs where encounter_rate = 1)
  union all
  select 40,
         'function:create_patrol_battle_replay',
         case when exists (select 1 from function_info) then 'PASS' else 'FAIL' end,
         coalesce(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')::text, 'missing')
  union all
  select 50,
         'server_snapshot_and_seed',
         case when exists (
           select 1 from function_info
           where definition like '%PATROL_SERVER%'
             and definition like '%v_server_seed%'
             and definition like '%user_characters%'
             and definition like '%patrol_npcs%'
         ) then 'PASS' else 'FAIL' end,
         'formation ownership, NPC master, and random seed are resolved in the RPC'
  union all
  select 60,
         'security_definer_and_search_path',
         case when exists (
           select 1 from function_info
           where prosecdef and 'search_path=public' = any(proconfig)
         ) then 'PASS' else 'FAIL' end,
         'SECURITY DEFINER with search_path=public'
  union all
  select 70,
         'authenticated_execute',
         case when has_function_privilege('authenticated', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
         'authenticated may execute'
  union all
  select 80,
         'anon_execute_denied',
         case when not has_function_privilege('anon', 'public.create_patrol_battle_replay(uuid,text)', 'EXECUTE') then 'PASS' else 'FAIL' end,
         'anon may not execute'
  union all
  select 90,
         'client_master_write_denied',
         case when not has_table_privilege('authenticated', 'public.character_battle_master', 'INSERT,UPDATE,DELETE') then 'PASS' else 'FAIL' end,
         'authenticated cannot mutate canonical character battle mappings'
)
select * from checks order by display_order;
