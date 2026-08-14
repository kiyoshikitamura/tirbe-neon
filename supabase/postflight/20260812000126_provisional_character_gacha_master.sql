WITH checks AS (
  SELECT 10 AS display_order, 'provisional_roster_count'::text AS check_name,
         CASE WHEN count(*) = 60 THEN 'PASS' ELSE 'FAIL' END AS status,
         count(*) || '/60 enabled character(s)' AS detail
  FROM public.character_release_master WHERE is_enabled

  UNION ALL
  SELECT 20, 'provisional_rarity_distribution',
         CASE WHEN count(*) FILTER (WHERE rarity = 'SSR') = 10
                AND count(*) FILTER (WHERE rarity = 'SR') = 20
                AND count(*) FILTER (WHERE rarity = 'R') = 20
                AND count(*) FILTER (WHERE rarity = 'N') = 10 THEN 'PASS' ELSE 'FAIL' END,
         'SSR=' || count(*) FILTER (WHERE rarity = 'SSR') || ', SR=' || count(*) FILTER (WHERE rarity = 'SR') ||
         ', R=' || count(*) FILTER (WHERE rarity = 'R') || ', N=' || count(*) FILTER (WHERE rarity = 'N')
  FROM public.character_release_master WHERE is_enabled

  UNION ALL
  SELECT 30, 'character_gacha_masters',
         CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || '/2 canonical character gacha master(s)'
  FROM public.gacha_masters
  WHERE (id = 'CHAR_NORMAL' AND gacha_type = 'CHARACTER' AND cost_cash = 1000 AND cost_diamond = 100)
     OR (id = 'CHAR_SPECIAL' AND gacha_type = 'CHARACTER' AND cost_cash = 3000 AND cost_diamond = 300)

  UNION ALL
  SELECT 40, 'normal_pool_distribution',
         CASE WHEN count(*) = 50 AND sum(weight) = 1000
                AND sum(weight) FILTER (WHERE rarity = 'N') = 500
                AND sum(weight) FILTER (WHERE rarity = 'R') = 400
                AND sum(weight) FILTER (WHERE rarity = 'SR') = 100
                AND count(*) FILTER (WHERE rarity = 'SSR') = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || ' rows / weight=' || COALESCE(sum(weight), 0) || ' (N=' || COALESCE(sum(weight) FILTER (WHERE rarity = 'N'), 0) ||
         ', R=' || COALESCE(sum(weight) FILTER (WHERE rarity = 'R'), 0) || ', SR=' || COALESCE(sum(weight) FILTER (WHERE rarity = 'SR'), 0) || ')'
  FROM public.gacha_items_master WHERE gacha_id = 'CHAR_NORMAL'

  UNION ALL
  SELECT 50, 'special_pool_distribution',
         CASE WHEN count(*) = 50 AND sum(weight) = 2000
                AND sum(weight) FILTER (WHERE rarity = 'R') = 1200
                AND sum(weight) FILTER (WHERE rarity = 'SR') = 700
                AND sum(weight) FILTER (WHERE rarity = 'SSR') = 100
                AND count(*) FILTER (WHERE rarity = 'N') = 0 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || ' rows / weight=' || COALESCE(sum(weight), 0) || ' (R=' || COALESCE(sum(weight) FILTER (WHERE rarity = 'R'), 0) ||
         ', SR=' || COALESCE(sum(weight) FILTER (WHERE rarity = 'SR'), 0) || ', SSR=' || COALESCE(sum(weight) FILTER (WHERE rarity = 'SSR'), 0) || ')'
  FROM public.gacha_items_master WHERE gacha_id = 'CHAR_SPECIAL'

  UNION ALL
  SELECT 60, 'battle_master_coverage',
         CASE WHEN count(*) = 60 THEN 'PASS' ELSE 'FAIL' END,
         count(*) || '/60 released character(s) have battle master rows'
  FROM public.character_release_master release
  JOIN public.character_battle_master battle USING (character_id)
  WHERE release.is_enabled

  UNION ALL
  SELECT 70, 'client_master_write_denied',
         CASE WHEN NOT has_table_privilege('authenticated', 'public.character_release_master', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END,
         CASE WHEN NOT has_table_privilege('authenticated', 'public.character_release_master', 'INSERT,UPDATE,DELETE')
              THEN 'authenticated cannot mutate the provisional release master'
              ELSE 'authenticated has unexpected release-master write privilege' END
)
SELECT display_order, check_name, status, detail FROM checks ORDER BY display_order;
