with checks(display_order,check_name,status,detail) as (
  values
  (10,'tutorial_gacha_rpc',case when to_regprocedure('public.execute_tutorial_character_gacha(uuid)') is not null then 'PASS' else 'FAIL' end,'one-time guaranteed SSR tutorial contract'),
  (20,'tutorial_formation_rpc',case when to_regprocedure('public.complete_current_tutorial_formation()') is not null then 'PASS' else 'FAIL' end,'formation advances directly to quest'),
  (30,'chat_reply_contract',case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='board_posts' and column_name='reply_to_message_id') then 'PASS' else 'FAIL' end,'reply reference'),
  (40,'social_activity_projection',case when to_regclass('public.social_activity_feed') is not null then 'PASS' else 'FAIL' end,'display-safe social activity'),
  (50,'human_response_metric',case when to_regclass('public.guild_human_response_metrics') is not null then 'PASS' else 'FAIL' end,'server metric storage'),
  (60,'security_definer_search_path',case when (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('execute_tutorial_character_gacha','complete_current_tutorial_formation') and p.prosecdef and 'search_path=public'=any(coalesce(p.proconfig,array[]::text[])))=2 then 'PASS' else 'FAIL' end,'2/2 hardened'),
  (70,'anon_execute_denied',case when (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('execute_tutorial_character_gacha','complete_current_tutorial_formation') and has_function_privilege('anon',p.oid,'EXECUTE'))=0 then 'PASS' else 'FAIL' end,'anon denied')
)
select * from checks order by display_order;
