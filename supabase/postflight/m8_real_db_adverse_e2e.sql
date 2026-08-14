-- M8 real-DB adverse E2E. Every mutation attempt runs in a PL/pgSQL
-- subtransaction and is rolled back even if an authorization regression lets
-- it reach the deliberate M8_UNEXPECTED_SUCCESS exception.

DROP TABLE IF EXISTS pg_temp.m8_actor;
DROP TABLE IF EXISTS pg_temp.m8_results;

CREATE TEMP TABLE m8_actor AS
SELECT u.id
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE au.is_anonymous IS FALSE
ORDER BY au.last_sign_in_at DESC NULLS LAST
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM m8_actor) THEN
    RAISE EXCEPTION 'A linked Development user is required for M8 adverse E2E';
  END IF;
END;
$$;

CREATE TEMP TABLE m8_results (
  display_order integer,
  check_name text,
  status text,
  detail text
);
GRANT ALL ON TABLE m8_results TO authenticated;

CREATE OR REPLACE FUNCTION pg_temp.run_m8_adverse_e2e()
RETURNS TABLE(display_order integer, check_name text, status text, detail text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_other_user_id uuid := gen_random_uuid();
  v_equipment_id uuid := gen_random_uuid();
  v_code text;
BEGIN
  BEGIN
    UPDATE public.users SET cash = cash + 1 WHERE id = auth.uid();
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 10, 'direct_cash_update_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_items(user_id, item_id, quantity)
    VALUES (auth.uid(), 'M8_FORGED_ITEM', 1);
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 20, 'direct_item_insert_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    DELETE FROM public.user_skills WHERE user_id = auth.uid();
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 30, 'direct_skill_delete_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    INSERT INTO public.payment_transactions(user_id, product_id, amount, currency, status)
    VALUES (auth.uid(), 'M8_FORGED_PAYMENT', 1, 'JPY', 'COMPLETED');
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 40, 'direct_payment_insert_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_monthly_passes(user_id, expires_at)
    VALUES (auth.uid(), now() + interval '30 days');
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 50, 'direct_pass_insert_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    PERFORM public.add_test_diamonds(auth.uid(), 1);
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 60, 'test_currency_rpc_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    PERFORM public.add_user_xp(auth.uid(), 1);
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 70, 'client_xp_rpc_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    PERFORM public.process_pvp_match_result_v2(auth.uid(), true, 999999, 999999);
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 80, 'client_battle_result_rpc_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    PERFORM public.execute_character_gacha(v_other_user_id, 'CHAR_NORMAL', 1, 'cash');
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 90, 'gacha_other_user_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLERRM ILIKE '%not authorized%' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    PERFORM public.generate_user_gift_code(v_other_user_id);
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 100, 'gift_code_other_user_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL' WHEN SQLSTATE = '42501' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    PERFORM public.sell_owned_equipment(ARRAY[v_equipment_id, v_equipment_id]);
    RAISE EXCEPTION 'M8_UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 110, 'duplicate_equipment_sale_denied',
      CASE WHEN SQLERRM = 'M8_UNEXPECTED_SUCCESS' THEN 'FAIL'
           WHEN SQLSTATE = '22023' AND SQLERRM ILIKE '%duplicate%' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;

  BEGIN
    v_code := public.generate_user_gift_code(auth.uid());
    RAISE EXCEPTION 'M8_EXPECTED_SUCCESS:%', v_code;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 120, 'maintained_own_profile_rpc',
      CASE WHEN SQLERRM LIKE 'M8_EXPECTED_SUCCESS:%' THEN 'PASS' ELSE 'FAIL' END,
      SQLERRM;
  END;
END;
$$;

BEGIN;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM m8_actor), true);
SET LOCAL ROLE authenticated;
INSERT INTO m8_results SELECT * FROM pg_temp.run_m8_adverse_e2e();
RESET ROLE;
COMMIT;

SELECT display_order, check_name, status, detail
FROM m8_results
ORDER BY display_order;
