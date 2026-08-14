with checks(display_order,check_name,status,detail) as (
 select 10,'active_two_location_raids',case when count(*)=2 and count(distinct base_id)=2 then 'PASS' else 'FAIL' end,
   count(*)||' active / '||count(distinct base_id)||' distinct base(s)' from public.raid_bosses where status='ACTIVE' and expires_at>now()
 union all select 20,'required_functions',case when count(*)=7 then 'PASS' else 'FAIL' end,count(*)||'/7 Raid function(s)'
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.oid in(
  to_regprocedure('public.get_active_raids()'),to_regprocedure('public.start_raid_battle(uuid,text[],text)'),
  to_regprocedure('public.finalize_raid_battle(uuid,jsonb)'),to_regprocedure('public.get_raid_rankings(uuid)'),
  to_regprocedure('public.rotate_daily_raids()'),to_regprocedure('public.finalize_expired_raid_instance(uuid)'),to_regprocedure('public.grant_raid_reward(uuid,uuid,integer,text)'))
 union all select 30,'security_definer_and_search_path',case when count(*) filter(where p.prosecdef and coalesce(array_to_string(p.proconfig,','),'') like '%search_path=public%')=7 then 'PASS' else 'FAIL' end,
  count(*) filter(where p.prosecdef and coalesce(array_to_string(p.proconfig,','),'') like '%search_path=public%')||'/7 hardened function(s)'
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('get_active_raids','start_raid_battle','finalize_raid_battle','get_raid_rankings','rotate_daily_raids','finalize_expired_raid_instance','grant_raid_reward')
 union all select 40,'service_finalize_only',case when has_function_privilege('service_role','public.finalize_raid_battle(uuid,jsonb)','EXECUTE') and not has_function_privilege('authenticated','public.finalize_raid_battle(uuid,jsonb)','EXECUTE') and not has_function_privilege('anon','public.finalize_raid_battle(uuid,jsonb)','EXECUTE') then 'PASS' else 'FAIL' end,'consumer cannot submit Raid result'
 union all select 50,'authenticated_start_and_read',case when has_function_privilege('authenticated','public.start_raid_battle(uuid,text[],text)','EXECUTE') and has_function_privilege('authenticated','public.get_active_raids()','EXECUTE') and has_function_privilege('authenticated','public.get_raid_rankings(uuid)','EXECUTE') then 'PASS' else 'FAIL' end,'3/3 player contracts executable'
 union all select 60,'legacy_result_rpc_denied',case when to_regprocedure('public.record_raid_boss_damage_v2(uuid,text,integer)') is null or not has_function_privilege('authenticated','public.record_raid_boss_damage_v2(uuid,text,integer)','EXECUTE') then 'PASS' else 'FAIL' end,'client damage RPC remains retired'
 union all select 70,'guild_snapshot_columns',case when count(*)=5 then 'PASS' else 'FAIL' end,count(*)||'/5 canonical contribution column(s)' from information_schema.columns where table_schema='public' and table_name='raid_damage_logs' and column_name in('raid_boss_instance_id','battle_replay_session_id','guild_id','raw_damage','applied_damage')
 union all select 80,'reward_and_attempt_rls',case when count(*) filter(where relrowsecurity)=2 then 'PASS' else 'FAIL' end,count(*) filter(where relrowsecurity)||'/2 RLS table(s)' from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('user_raid_daily_attempts','raid_reward_grants')
)
select * from checks order by display_order;
