WITH retired_signatures(signature) AS (
  VALUES
    ('public.accept_friend_request(uuid,uuid)'),
    ('public.add_user_xp(uuid,integer)'),
    ('public.apply_user_xp(uuid,integer)'),
    ('public.claim_battle_rewards(uuid,integer,integer,jsonb)'),
    ('public.claim_gvg_base(uuid,text)'),
    ('public.complete_patrol_instant(uuid,uuid,integer)'),
    ('public.complete_patrol_v2(uuid,uuid,bigint,integer,text,text,integer,boolean,boolean,text,integer)'),
    ('public.consume_raid_attempt(uuid,text,integer)'),
    ('public.consume_vitality_for_gvg(uuid,integer)'),
    ('public.distribute_ranking_rewards()'),
    ('public.initialize_new_user(uuid,text)'),
    ('public.kick_guild_member(uuid,uuid)'),
    ('public.leave_guild(uuid,uuid,boolean,boolean)'),
    ('public.limit_break_gear(uuid,uuid,integer,integer)'),
    ('public.limit_break_skill(uuid,uuid,integer,integer)'),
    ('public.process_gvg_battle_result(uuid,uuid,text,boolean,boolean)'),
    ('public.process_gvg_battle_result_v2(uuid,uuid,text,boolean,boolean)'),
    ('public.process_pvp_match_result(uuid,uuid,boolean,integer,integer)'),
    ('public.process_pvp_match_result_v2(uuid,boolean,integer,integer)'),
    ('public.record_raid_boss_damage(uuid,text,integer)'),
    ('public.record_raid_boss_damage_v2(uuid,text,integer)'),
    ('public.remove_friend(uuid,uuid)'),
    ('public.send_friend_request(uuid,uuid)'),
    ('public.set_guild_member_role(uuid,uuid,text)'),
    ('public.sync_and_evaluate_raid_timeout(uuid)'),
    ('public.use_inventory_item(uuid,text,integer,integer)')
), retired AS (
  SELECT signature, to_regprocedure(signature) AS oid FROM retired_signatures
), maintained_signatures(signature) AS (
  VALUES
    ('public.complete_patrol_instantly(uuid,uuid,text)'),
    ('public.consume_pvp_point(uuid)'),
    ('public.create_guild_v2(uuid,text,integer)'),
    ('public.donate_to_guild(uuid,uuid,integer)'),
    ('public.exchange_pity_reward(uuid,text,text)'),
    ('public.execute_asset_gacha(uuid,text,integer,text)'),
    ('public.execute_character_gacha(uuid,text,integer,text)'),
    ('public.generate_user_gift_code(uuid)'),
    ('public.get_public_battle_loadout(uuid)'),
    ('public.get_public_battle_roster(uuid)'),
    ('public.get_pvp_opponents(uuid,integer)'),
    ('public.sell_owned_equipment(uuid[])'),
    ('public.sync_and_recover_vitality_and_pvp_points(uuid)')
), maintained AS (
  SELECT signature, to_regprocedure(signature) AS oid FROM maintained_signatures
), checks AS (
  SELECT 10 AS display_order, 'retired_functions_resolved' AS check_name,
    CASE WHEN count(oid) = 26 THEN 'PASS' ELSE 'FAIL' END AS status,
    format('%s/26 legacy function(s)', count(oid)) AS detail
  FROM retired

  UNION ALL

  SELECT 20, 'retired_consumer_execute_denied',
    CASE WHEN count(*) FILTER (
      WHERE has_function_privilege('anon', oid, 'EXECUTE')
         OR has_function_privilege('authenticated', oid, 'EXECUTE')
    ) = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/26 legacy function(s) unexpectedly executable', count(*) FILTER (
      WHERE has_function_privilege('anon', oid, 'EXECUTE')
         OR has_function_privilege('authenticated', oid, 'EXECUTE')
    ))
  FROM retired WHERE oid IS NOT NULL

  UNION ALL

  SELECT 30, 'inventory_tables_read_only',
    CASE WHEN has_table_privilege('authenticated', 'public.user_items', 'SELECT')
           AND NOT has_table_privilege('authenticated', 'public.user_items', 'INSERT,UPDATE,DELETE')
           AND has_table_privilege('authenticated', 'public.user_skills', 'SELECT')
           AND NOT has_table_privilege('authenticated', 'public.user_skills', 'INSERT,UPDATE,DELETE')
      THEN 'PASS' ELSE 'FAIL' END,
    'owned items and skills are readable but only canonical RPCs may mutate them'

  UNION ALL

  SELECT 40, 'maintained_functions_resolved',
    CASE WHEN count(oid) = 13 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/13 maintained function(s)', count(oid))
  FROM maintained

  UNION ALL

  SELECT 50, 'maintained_function_hardening',
    CASE WHEN count(*) FILTER (
      WHERE p.prosecdef
        AND p.proconfig @> ARRAY['search_path=public']
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    ) = 13 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/13 maintained function(s) hardened and callable', count(*) FILTER (
      WHERE p.prosecdef
        AND p.proconfig @> ARRAY['search_path=public']
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    ))
  FROM maintained m JOIN pg_proc p ON p.oid = m.oid

  UNION ALL

  SELECT 60, 'qa_fixture_search_path',
    CASE WHEN count(*) FILTER (
      WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public']
    ) = 2 THEN 'PASS' ELSE 'FAIL' END,
    format('%s/2 Development QA fixture function(s) hardened', count(*) FILTER (
      WHERE p.prosecdef AND p.proconfig @> ARRAY['search_path=public']
    ))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('provision_qa_character_cosmetic_fixture', 'provision_qa_cosmetic_fixture')
)
SELECT display_order, check_name, status, detail
FROM checks
ORDER BY display_order;
