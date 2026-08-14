-- Open Beta M4: align canonical prices with the finalized gacha specification
-- and prevent the daily-free payment mode from being used on special gachas.

UPDATE public.gacha_masters
SET cost_cash = CASE WHEN id LIKE '%_NORMAL' THEN 1000 ELSE 3000 END,
    cost_diamond = CASE WHEN id LIKE '%_NORMAL' THEN 100 ELSE 300 END
WHERE id IN (
  'CHAR_NORMAL', 'CHAR_SPECIAL',
  'SKILL_NORMAL', 'SKILL_SPECIAL',
  'EQUIP_NORMAL', 'EQUIP_SPECIAL'
);

ALTER FUNCTION public.execute_asset_gacha(uuid, text, integer, text)
  RENAME TO execute_asset_gacha_core_20260812;

REVOKE ALL ON FUNCTION public.execute_asset_gacha_core_20260812(uuid, text, integer, text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.execute_asset_gacha(
  p_user_id uuid,
  p_gacha_id text,
  p_pull_count integer,
  p_currency_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_currency_type = 'free' AND p_gacha_id NOT IN ('SKILL_NORMAL', 'EQUIP_NORMAL') THEN
    RAISE EXCEPTION 'daily free is only available for normal gacha';
  END IF;
  RETURN public.execute_asset_gacha_core_20260812(
    p_user_id, p_gacha_id, p_pull_count, p_currency_type
  );
END;
$$;

ALTER FUNCTION public.execute_character_gacha(uuid, text, integer, text)
  RENAME TO execute_character_gacha_core_20260812;

REVOKE ALL ON FUNCTION public.execute_character_gacha_core_20260812(uuid, text, integer, text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.execute_character_gacha(
  p_user_id uuid,
  p_gacha_id text,
  p_pull_count integer,
  p_currency_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_currency_type = 'free' AND p_gacha_id <> 'CHAR_NORMAL' THEN
    RAISE EXCEPTION 'daily free is only available for normal gacha';
  END IF;
  RETURN public.execute_character_gacha_core_20260812(
    p_user_id, p_gacha_id, p_pull_count, p_currency_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_asset_gacha(uuid, text, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.execute_character_gacha(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_asset_gacha(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_character_gacha(uuid, text, integer, text) TO authenticated;
