with checks(display_order,check_name,status,detail) as (
 select 10,'friend_tables',case when to_regclass('public.friend_requests') is not null and to_regclass('public.user_friends') is not null then 'PASS' else 'FAIL' end,'canonical request and friendship tables'
 union all select 20,'friend_functions',case when
  has_function_privilege('authenticated','public.search_user_by_name(text)','EXECUTE') and
  has_function_privilege('authenticated','public.send_friend_request(uuid)','EXECUTE') and
  has_function_privilege('authenticated','public.accept_friend_request(uuid)','EXECUTE') and
  has_function_privilege('authenticated','public.reject_friend_request(uuid)','EXECUTE') and
  has_function_privilege('authenticated','public.remove_friend(uuid)','EXECUTE') and
  has_function_privilege('authenticated','public.get_friend_helper_loadout(uuid)','EXECUTE')
 then 'PASS' else 'FAIL' end,'6/6 canonical Friend function(s)'
 union all select 30,'friend_direct_writes_denied',case when not has_table_privilege('authenticated','public.user_friends','INSERT') and not has_table_privilege('authenticated','public.friend_requests','INSERT') then 'PASS' else 'FAIL' end,'Friend mutation is RPC-only'
 union all select 40,'invitation_contract',case when to_regprocedure('public.initialize_current_player(text,text)') is not null and to_regprocedure('public.generate_current_user_invite_code()') is not null then 'PASS' else 'FAIL' end,'URL code can be atomically consumed during initialization'
 union all select 50,'invitation_uniqueness',case when count(*)=2 then 'PASS' else 'FAIL' end,count(*)||'/2 invitation unique index(es)' from pg_indexes where schemaname='public' and indexname in ('user_invitations_invitee_uidx','user_invitations_pair_uidx')
 union all select 60,'invitation_master',case when count(*)=10 and bool_and(is_provisional) then 'PASS' else 'FAIL' end,count(*)||'/10 replaceable invitation mission(s)' from public.missions where id like 'ob_invite_%'
 union all select 70,'raid_cost_master',case when count(*)=10 and bool_and(is_provisional) then 'PASS' else 'FAIL' end,count(*)||'/10 replaceable Raid attempt cost(s)' from public.raid_attempt_cost_master
 union all select 80,'raid_jst_and_master',case when pg_get_functiondef('public.start_raid_battle(uuid,text[],text)'::regprocedure) like '%Asia/Tokyo%' and pg_get_functiondef('public.start_raid_battle(uuid,text[],text)'::regprocedure) like '%raid_attempt_cost_master%' then 'PASS' else 'FAIL' end,'Raid daily boundary and costs are server-owned'
 union all select 90,'legacy_friend_execute_denied',case when not has_function_privilege('authenticated','public.send_friend_request(uuid,uuid)','EXECUTE') and not has_function_privilege('authenticated','public.accept_friend_request(uuid,uuid)','EXECUTE') and not has_function_privilege('authenticated','public.remove_friend(uuid,uuid)','EXECUTE') then 'PASS' else 'FAIL' end,'caller-id Friend RPCs remain retired'
)
select * from checks order by display_order;
