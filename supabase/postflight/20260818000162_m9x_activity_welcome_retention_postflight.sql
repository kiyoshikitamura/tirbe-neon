with c(display_order,check_name,status,detail) as (values
 (10,'preopen_speedup',case when to_regprocedure('public.complete_patrol_preopen(uuid)') is not null then 'PASS' else 'FAIL' end,'server level/state guard'),
 (20,'activity_triggers',case when (select count(*) from pg_trigger where tgname in('m9x_gacha_activity_trigger','m9x_guild_created_activity_trigger','m9x_power_leader_activity_trigger'))=3 then 'PASS' else 'FAIL' end,'real events only'),
 (30,'human_response_triggers',case when (select count(*) from pg_trigger where tgname in('m9x_join_approved_metric_trigger','m9x_first_human_response_trigger'))=2 then 'PASS' else 'FAIL' end,'system/self excluded'),
 (40,'authenticated_execute',case when has_function_privilege('authenticated','public.complete_patrol_preopen(uuid)','EXECUTE') and has_function_privilege('authenticated','public.set_current_guild_welcome_message(text)','EXECUTE') then 'PASS' else 'FAIL' end,'2/2'),
 (50,'anon_execute_denied',case when not has_function_privilege('anon','public.complete_patrol_preopen(uuid)','EXECUTE') and not has_function_privilege('anon','public.set_current_guild_welcome_message(text)','EXECUTE') then 'PASS' else 'FAIL' end,'0/2 unexpected')
) select * from c order by display_order;
