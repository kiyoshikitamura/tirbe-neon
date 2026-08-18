-- Read-only verification for the M9 Gacha / Launch Control P0 contract.

with checks(display_order, check_name, status, detail) as (
  select 10, 'feature_operating_states',
    case when count(*) = 3 and bool_and(state = 'CLOSED') then 'PASS' else 'FAIL' end,
    count(*) || '/3 feature state(s); all initially CLOSED'
  from public.feature_operating_states
  where feature_key in ('SPECIAL_GACHA', 'GVG', 'PAYMENT')

  union all
  select 20, 'rarity_bucket_contract',
    case when count(*) = 18 and sum(weight) = 600 then 'PASS' else 'FAIL' end,
    count(*) || '/18 bucket row(s), aggregate weight=' || coalesce(sum(weight), 0)
  from public.gacha_rarity_rates

  union all
  select 25, 'pool_bucket_coverage',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*) || ' configured rarity bucket(s) have no drawable item'
  from public.gacha_rarity_rates rates
  where not exists (
    select 1 from public.gacha_items_master items
    where items.gacha_id = rates.gacha_id and items.rarity = rates.rarity
  )
  union all
  select 30, 'skill_pool_enabled_only',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*) || ' disabled/placeholder skill pool row(s)'
  from public.gacha_items_master pool
  left join public.skill_battle_master master on master.skill_id = pool.item_id
  where pool.gacha_id in ('SKILL_NORMAL', 'SKILL_SPECIAL')
    and (master.skill_id is null or not master.enabled or master.exclusive_character_id is not null)

  union all
  select 40, 'equipment_canonical_rarity',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*) || ' equipment pool row(s) disagree with canonical rarity'
  from public.gacha_items_master pool
  left join public.equipment_battle_master master on master.equipment_id = pool.item_id
  where pool.gacha_id in ('EQUIP_NORMAL', 'EQUIP_SPECIAL')
    and (master.equipment_id is null or master.rarity <> pool.rarity)

  union all
  select 50, 'equipment_exclusive_excluded',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*) || ' unconfirmed exclusive equipment pool row(s)'
  from public.gacha_items_master pool
  join public.equipment_battle_master master on master.equipment_id = pool.item_id
  where pool.gacha_id in ('EQUIP_NORMAL', 'EQUIP_SPECIAL') and master.is_exclusive

  union all
  select 60, 'legacy_ticket_removed',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*) || ' legacy ticket inventory/reward row(s)'
  from (
    select item_id from public.user_items where item_id = 'GACHA_TICKET'
    union all select item_id from public.login_bonus_master where item_id = 'GACHA_TICKET'
    union all select reward_item_id from public.missions where reward_item_id = 'GACHA_TICKET'
    union all select item_id from public.presents where item_id = 'GACHA_TICKET'
  ) legacy

  union all
  select 70, 'required_gacha_functions',
    case when count(*) = 2 then 'PASS' else 'FAIL' end,
    count(*) || '/2 request-idempotent function(s)'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.oid in (
    to_regprocedure('public.execute_character_gacha(uuid,text,integer,text,uuid)'),
    to_regprocedure('public.execute_asset_gacha(uuid,text,integer,text,uuid)'))

  union all
  select 80, 'authenticated_execute_new_only',
    case when has_function_privilege('authenticated', 'public.execute_character_gacha(uuid,text,integer,text,uuid)', 'EXECUTE')
           and has_function_privilege('authenticated', 'public.execute_asset_gacha(uuid,text,integer,text,uuid)', 'EXECUTE')
           and not has_function_privilege('authenticated', 'public.execute_character_gacha(uuid,text,integer,text)', 'EXECUTE')
           and not has_function_privilege('authenticated', 'public.execute_asset_gacha(uuid,text,integer,text)', 'EXECUTE')
      then 'PASS' else 'FAIL' end,
    'authenticated may execute only request_id signatures'

  union all
  select 90, 'anon_execute_denied',
    case when not has_function_privilege('anon', 'public.execute_character_gacha(uuid,text,integer,text,uuid)', 'EXECUTE')
           and not has_function_privilege('anon', 'public.execute_asset_gacha(uuid,text,integer,text,uuid)', 'EXECUTE')
           and not has_function_privilege('anon', 'public.begin_gvg_attack(uuid)', 'EXECUTE')
      then 'PASS' else 'FAIL' end,
    'anon cannot execute gacha or GvG mutation functions'

  union all
  select 100, 'gacha_history_read_only',
    case when has_table_privilege('authenticated', 'public.gacha_execution_history', 'SELECT')
           and not has_table_privilege('authenticated', 'public.gacha_execution_history', 'INSERT')
           and not has_table_privilege('authenticated', 'public.gacha_execution_history', 'UPDATE')
           and not has_table_privilege('authenticated', 'public.gacha_execution_history', 'DELETE')
      then 'PASS' else 'FAIL' end,
    'owner history is readable but cannot be forged'

  union all
  select 110, 'launch_state_read_only',
    case when has_table_privilege('authenticated', 'public.feature_operating_states', 'SELECT')
           and not has_table_privilege('authenticated', 'public.feature_operating_states', 'INSERT')
           and not has_table_privilege('authenticated', 'public.feature_operating_states', 'UPDATE')
           and not has_table_privilege('authenticated', 'public.feature_operating_states', 'DELETE')
      then 'PASS' else 'FAIL' end,
    'authenticated may read but not change operating state'

  union all
  select 120, 'special_and_gvg_server_guards',
    case when pg_get_functiondef(to_regprocedure('public.execute_character_gacha(uuid,text,integer,text,uuid)')) like '%SPECIAL_GACHA%'
           and pg_get_functiondef(to_regprocedure('public.execute_asset_gacha(uuid,text,integer,text,uuid)')) like '%SPECIAL_GACHA%'
           and pg_get_functiondef(to_regprocedure('public.begin_gvg_attack(uuid)')) like '%feature_key = ''GVG''%'
           and pg_get_functiondef(to_regprocedure('public.resolve_gvg_attack(uuid,uuid,boolean,bigint)')) like '%feature_key = ''GVG''%'
      then 'PASS' else 'FAIL' end,
    'Special Gacha and GvG mutations contain server operating guards'

  union all
  select 130, 'security_definer_search_path',
    case when count(*) = 8
           and bool_and(p.prosecdef)
           and bool_and(coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=public%')
      then 'PASS' else 'FAIL' end,
    count(*) || '/8 hardened function(s)'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.oid in (
    to_regprocedure('public.draw_gacha_rarity(text)'),
    to_regprocedure('public.draw_gacha_item(text,text)'),
    to_regprocedure('public.execute_character_gacha(uuid,text,integer,text,uuid)'),
    to_regprocedure('public.execute_asset_gacha(uuid,text,integer,text,uuid)'),
    to_regprocedure('public.begin_gvg_attack(uuid)'),
    to_regprocedure('public.resolve_gvg_attack(uuid,uuid,boolean,bigint)'),
    to_regprocedure('public.begin_gvg_attack_core_20260817(uuid)'),
    to_regprocedure('public.resolve_gvg_attack_core_20260817(uuid,uuid,boolean,bigint)'))
)
select * from checks order by display_order;

-- Statistical, read-only validation of the same helper called by Production
-- RPCs. A 3 percentage-point tolerance avoids flaky sampling while detecting
-- the former row-count-multiplied distribution.
with samples as (
  select 'NORMAL'::text as mode, public.draw_gacha_rarity('SKILL_NORMAL') as rarity
  from generate_series(1, 20000)
  union all
  select 'SPECIAL'::text as mode, public.draw_gacha_rarity('SKILL_SPECIAL') as rarity
  from generate_series(1, 20000)
), actual as (
  select mode, rarity, count(*)::numeric / 20000 as ratio from samples group by mode, rarity
), expected(mode, rarity, ratio) as (
  values
    ('NORMAL'::text, 'N'::text, .50::numeric), ('NORMAL', 'R', .40), ('NORMAL', 'SR', .10),
    ('SPECIAL', 'R', .60), ('SPECIAL', 'SR', .35), ('SPECIAL', 'SSR', .05)
)
select e.mode, e.rarity,
       round(coalesce(a.ratio, 0), 4) as actual_ratio,
       e.ratio as expected_ratio,
       case when abs(coalesce(a.ratio, 0) - e.ratio) <= .03 then 'PASS' else 'FAIL' end as status
from expected e left join actual a using (mode, rarity)
order by e.mode, e.rarity;
