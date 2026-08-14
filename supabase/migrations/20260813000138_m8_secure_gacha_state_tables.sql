-- Open Beta M8-2a: gacha counters are server-owned state. Players can read
-- their own rows, while canonical SECURITY DEFINER gacha RPCs perform writes.

BEGIN;

ALTER TABLE public.user_daily_gacha_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gacha_pity_points ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_table text;
  v_policy record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'user_daily_gacha_claims',
    'user_gacha_pity_points'
  ]
  LOOP
    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        v_policy.policyname,
        v_table
      );
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)',
      'owner read ' || v_table,
      v_table
    );

    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon',
      v_table
    );
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM authenticated',
      v_table
    );
    EXECUTE format(
      'GRANT SELECT ON TABLE public.%I TO authenticated',
      v_table
    );
    EXECUTE format(
      'GRANT ALL ON TABLE public.%I TO service_role',
      v_table
    );
  END LOOP;
END;
$$;

COMMIT;
