with checks as (
  select 10 display_order, 'mission_midnight_jst' check_name,
    case when pg_get_functiondef('public.sync_current_missions()'::regprocedure) like '%Asia/Tokyo%'
      and pg_get_functiondef('public.sync_current_missions()'::regprocedure) not like '%interval ''4 hours''%'
      then 'PASS' else 'FAIL' end status,
    'Daily Mission cycle uses the JST calendar date' detail
  union all
  select 20, 'raid_midnight_jst',
    case when pg_get_functiondef('public.start_raid_battle(uuid,text[],text)'::regprocedure) like '%Asia/Tokyo%'
      and pg_get_functiondef('public.get_current_raid_attempt_state()'::regprocedure) like '%Asia/Tokyo%'
      then 'PASS' else 'FAIL' end,
    'Raid daily attempts use the JST calendar date'
  union all
  select 30, 'gacha_midnight_jst',
    case when coalesce(character_gacha.proconfig,array[]::text[])@>array['TimeZone=Asia/Tokyo']
      and coalesce(asset_gacha.proconfig,array[]::text[])@>array['TimeZone=Asia/Tokyo']
      then 'PASS' else 'FAIL' end,
    'Daily free Gacha uses its canonical JST date'
  from pg_proc character_gacha, pg_proc asset_gacha
  where character_gacha.oid='public.execute_character_gacha(uuid,text,integer,text)'::regprocedure
    and asset_gacha.oid='public.execute_asset_gacha(uuid,text,integer,text)'::regprocedure
  union all
  select 40, 'login_bonus_midnight_jst',
    case when pg_get_functiondef('public.process_login_bonus()'::regprocedure) like '%Asia/Tokyo%'
      then 'PASS' else 'FAIL' end,
    'Login Bonus uses the JST calendar date'
  union all
  select 50, 'mission_function_hardening',
    case when p.prosecdef and coalesce(p.proconfig,array[]::text[])@>array['search_path=public']
      and has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')
      then 'PASS' else 'FAIL' end,
    'sync_current_missions is hardened and authenticated-only'
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.oid='public.sync_current_missions()'::regprocedure
)
select * from checks order by display_order;
