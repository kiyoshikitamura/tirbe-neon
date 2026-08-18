select 10 as display_order,'required_functions' as check_name,
 case when count(*)=3 then 'PASS' else 'FAIL' end as status,
 count(*)||'/3 function(s)' as detail
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.oid in (
 'public.get_public_guild_detail(uuid)'::regprocedure,
 'public.record_funnel_milestone(uuid,text,jsonb)'::regprocedure,
 'public.record_client_funnel_event(text,text,text,text,jsonb)'::regprocedure)
union all select 20,'security_definer_and_search_path',
 case when count(*) filter(where p.prosecdef and p.proconfig @> array['search_path=public'])=3 then 'PASS' else 'FAIL' end,
 count(*) filter(where p.prosecdef and p.proconfig @> array['search_path=public'])||'/3 hardened function(s)'
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.oid in (
 'public.get_public_guild_detail(uuid)'::regprocedure,
 'public.record_funnel_milestone(uuid,text,jsonb)'::regprocedure,
 'public.record_client_funnel_event(text,text,text,text,jsonb)'::regprocedure)
union all select 30,'authenticated_execute',
 case when has_function_privilege('authenticated','public.get_public_guild_detail(uuid)','execute')
  and has_function_privilege('authenticated','public.record_client_funnel_event(text,text,text,text,jsonb)','execute') then 'PASS' else 'FAIL' end,
 'public display and allowlisted event RPCs executable'
union all select 40,'anon_execute_denied',
 case when not has_function_privilege('anon','public.get_public_guild_detail(uuid)','execute')
  and not has_function_privilege('anon','public.record_client_funnel_event(text,text,text,text,jsonb)','execute') then 'PASS' else 'FAIL' end,
 'anon cannot read Guild snapshots or record events'
union all select 50,'public_snapshot_excludes_private_fields',
 case when pg_get_functiondef('public.get_public_guild_detail(uuid)'::regprocedure) not like '%''funds''%'
  and pg_get_functiondef('public.get_public_guild_detail(uuid)'::regprocedure) not like '%''leader_id''%'
  and pg_get_functiondef('public.get_public_guild_detail(uuid)'::regprocedure) not like '%''user_id''%' then 'PASS' else 'FAIL' end,
 'no funds, leader id, or member user ids in the JSON contract'
union all select 60,'ranking_milestone_contract',
 case when pg_get_functiondef('public.record_funnel_milestone(uuid,text,jsonb)'::regprocedure) like '%''ranking_viewed''%'
  and pg_get_functiondef('public.record_client_funnel_event(text,text,text,text,jsonb)'::regprocedure) like '%record_funnel_milestone(v_user,''ranking_viewed''%' then 'PASS' else 'FAIL' end,
 'ranking_viewed uses the existing idempotent milestone foundation'
union all select 70,'existing_unlock_contracts',
 case when pg_get_functiondef('public.request_guild_join(uuid)'::regprocedure) like '%v_level < 3%'
  and pg_get_functiondef('public.join_guild(uuid)'::regprocedure) like '%v_level < 3%'
  and pg_get_functiondef('public.create_guild_v2(uuid,text,integer)'::regprocedure) like '%v_level < 8%'
  and pg_get_functiondef('public.create_guild_v2(uuid,text,integer)'::regprocedure) like '%5000%'
  and pg_get_functiondef('public.start_raid_battle(uuid,text[],text)'::regprocedure) like '%v_user.level<5%' then 'PASS' else 'FAIL' end,
 'Raid Lv5, Guild Join Lv3, Guild Create Lv8 / 5,000 CASH unchanged'
order by display_order;
