-- Development reconciliation: seed skill/equipment gacha pools.
-- IDs are sourced from the repository master-data contracts.

ALTER TABLE public.gacha_items_master
  ADD COLUMN IF NOT EXISTS is_pickup BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.gacha_masters
  ADD COLUMN IF NOT EXISTS gacha_type TEXT NOT NULL DEFAULT 'CHARACTER';

CREATE TABLE IF NOT EXISTS public.user_daily_gacha_claims (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gacha_type TEXT NOT NULL,
  last_claimed_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, gacha_type)
);

INSERT INTO public.gacha_masters (id, name, gacha_type, cost_cash, cost_diamond)
VALUES
  ('SKILL_NORMAL', 'Skill Gacha', 'SKILL', 100, 10),
  ('SKILL_SPECIAL', 'Skill Special Gacha', 'SKILL', 300, 30),
  ('EQUIP_NORMAL', 'Equipment Gacha', 'EQUIPMENT', 100, 10),
  ('EQUIP_SPECIAL', 'Equipment Special Gacha', 'EQUIPMENT', 300, 30)
ON CONFLICT (id) DO UPDATE SET gacha_type = EXCLUDED.gacha_type;

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
         rarity,
         CASE rarity WHEN 'N' THEN 500 WHEN 'R' THEN 400 WHEN 'SR' THEN 100 ELSE 0 END AS weight
  FROM catalog
  UNION ALL
  SELECT CASE WHEN item_id LIKE 'SKILL_%' THEN 'SKILL_SPECIAL' ELSE 'EQUIP_SPECIAL' END,
         item_id,
         rarity,
         CASE rarity WHEN 'R' THEN 600 WHEN 'SR' THEN 350 WHEN 'SSR' THEN 50 ELSE 0 END
  FROM catalog
)
INSERT INTO public.gacha_items_master (id, gacha_id, item_type, item_id, rarity, weight, is_pickup)
SELECT p.gacha_id || ':' || p.item_id,
       p.gacha_id,
       CASE WHEN p.item_id LIKE 'SKILL_%' THEN 'SKILL' ELSE 'EQUIPMENT' END,
       p.item_id,
       p.rarity,
       p.weight,
       false
FROM pools p
WHERE p.weight > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.gacha_items_master existing
    WHERE existing.gacha_id = p.gacha_id AND existing.item_id = p.item_id
  );
