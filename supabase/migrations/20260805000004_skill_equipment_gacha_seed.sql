-- Development reconciliation: seed skill/equipment gacha pools.
-- IDs are sourced from the repository master-data contracts.

WITH catalog AS (
  SELECT 'SKILL_' || lpad(i::text, 3, '0') AS item_id,
         CASE WHEN i <= 10 THEN 'N' WHEN i <= 20 THEN 'R' WHEN i <= 35 THEN 'SR' ELSE 'SSR' END AS rarity
  FROM generate_series(1, 50) AS s(i)
  UNION ALL
  SELECT prefix || '_' || lpad(i::text, 3, '0'),
         CASE
           WHEN prefix = 'WEAPON' AND i <= 10 THEN 'N'
           WHEN prefix = 'WEAPON' AND i <= 22 THEN 'R'
           WHEN prefix = 'WEAPON' AND i <= 42 THEN 'SR'
           WHEN prefix = 'HEAD' AND i <= 10 THEN 'R'
           WHEN prefix = 'HEAD' AND i <= 16 THEN 'SR'
           WHEN prefix = 'BODY' AND i <= 13 THEN 'R'
           WHEN prefix = 'BODY' AND i <= 22 THEN 'SR'
           WHEN prefix = 'LEGS' AND i <= 10 THEN 'R'
           WHEN prefix = 'LEGS' AND i <= 16 THEN 'SR'
           WHEN prefix = 'ACCESSORY' AND i <= 25 THEN 'R'
           WHEN prefix = 'ACCESSORY' AND i <= 45 THEN 'SR'
           ELSE 'SSR'
         END
  FROM (VALUES ('WEAPON', 50), ('HEAD', 20), ('BODY', 30), ('LEGS', 20), ('ACCESSORY', 51)) AS p(prefix, max_id)
  CROSS JOIN LATERAL generate_series(1, p.max_id) AS s(i)
  WHERE NOT (prefix = 'ACCESSORY' AND i BETWEEN 47 AND 50)
), pools AS (
  SELECT CASE WHEN item_id LIKE 'SKILL_%' THEN 'SKILL_NORMAL' ELSE 'EQUIP_NORMAL' END AS gacha_id,
         item_id,
         CASE rarity WHEN 'N' THEN 500 WHEN 'R' THEN 400 WHEN 'SR' THEN 100 ELSE 0 END AS weight
  FROM catalog
  UNION ALL
  SELECT CASE WHEN item_id LIKE 'SKILL_%' THEN 'SKILL_SPECIAL' ELSE 'EQUIP_SPECIAL' END,
         item_id,
         CASE rarity WHEN 'R' THEN 600 WHEN 'SR' THEN 350 WHEN 'SSR' THEN 50 ELSE 0 END
  FROM catalog
)
INSERT INTO public.gacha_items_master (gacha_id, item_id, weight, is_pickup)
SELECT p.gacha_id, p.item_id, p.weight, false
FROM pools p
WHERE p.weight > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.gacha_items_master existing
    WHERE existing.gacha_id = p.gacha_id AND existing.item_id = p.item_id
  );
