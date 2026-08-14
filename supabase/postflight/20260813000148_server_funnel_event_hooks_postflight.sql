with checks(display_order,check_name,status,detail) as (
 select 10,'server_funnel_triggers',case when count(*)=5 then 'PASS' else 'FAIL' end,count(*)||'/5 trigger(s)'
 from pg_trigger where not tgisinternal and tgname in ('tutorial_complete_funnel_trigger','character_growth_funnel_trigger','equipment_growth_funnel_trigger','skill_growth_funnel_trigger','first_official_battle_funnel_trigger')
 union all select 20,'hook_function_hardening',case when count(*)=3 and bool_and(p.prosecdef and p.proconfig@>array['search_path=public']) then 'PASS' else 'FAIL' end,count(*)||'/3 hardened function(s)'
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('on_tutorial_complete_funnel','on_progression_growth_funnel','on_first_official_battle_funnel')
 union all select 30,'client_milestone_scope',case
  when lower(pg_get_functiondef('public.record_client_funnel_event(text,text,text,text,jsonb)'::regprocedure)) like '%p_event_name=''guild_detail_view''%'
   and lower(pg_get_functiondef('public.record_client_funnel_event(text,text,text,text,jsonb)'::regprocedure)) like '%valid guild target is required%'
   and lower(pg_get_functiondef('public.record_client_funnel_event(text,text,text,text,jsonb)'::regprocedure)) like '%record_funnel_milestone(v_user,''guild_detail_view''%'
   and lower(pg_get_functiondef('public.record_client_funnel_event(text,text,text,text,jsonb)'::regprocedure)) not like '%record_funnel_milestone(v_user,''first_pvp''%'
   and lower(pg_get_functiondef('public.record_client_funnel_event(text,text,text,text,jsonb)'::regprocedure)) not like '%record_funnel_milestone(v_user,''first_raid''%'
  then 'PASS' else 'FAIL' end,'only validated Guild Detail View may bridge a client event to a milestone'
 union all select 40,'gacha_server_hooks',case when count(*)=2 and bool_and(pg_get_functiondef(p.oid) like '%record_funnel_milestone%') then 'PASS' else 'FAIL' end,count(*)||'/2 canonical gacha wrapper(s)'
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.oid in('public.execute_character_gacha(uuid,text,integer,text)'::regprocedure,'public.execute_asset_gacha(uuid,text,integer,text)'::regprocedure)
 union all select 50,'consumer_hook_execute_denied',case when count(*) filter(where has_function_privilege('authenticated',p.oid,'EXECUTE'))=0 then 'PASS' else 'FAIL' end,'internal hook functions are not consumer-callable'
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('on_tutorial_complete_funnel','on_progression_growth_funnel','on_first_official_battle_funnel')
)
select * from checks order by display_order;
