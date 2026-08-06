--
-- PostgreSQL database dump
--

\restrict aAbwrkyAcWNetEja51CwW8hlNt4rx1T67U8QMLHufBtJ2sgrM2M9uTbr5HqZ3Af

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
begin
    if not exists (
        select 1
        from pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: add_user_xp(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_user_xp(p_user_id uuid, p_xp_amount integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_level INTEGER;
    v_xp INTEGER;
    v_next_xp INTEGER;
    v_leveled_up BOOLEAN := false;
BEGIN
    SELECT level, xp INTO v_level, v_xp FROM public.users WHERE id = p_user_id;
    IF v_level IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_level < 99 THEN
        v_xp := v_xp + p_xp_amount;
        LOOP
            SELECT next_xp INTO v_next_xp FROM public.user_level_master WHERE level = v_level;
            IF v_next_xp IS NULL OR v_next_xp = 0 OR v_xp < v_next_xp OR v_level >= 99 THEN
                EXIT;
            END IF;
            v_xp := v_xp - v_next_xp;
            v_level := v_level + 1;
            v_leveled_up := true;
        END LOOP;
        UPDATE public.users SET level = v_level, xp = v_xp WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object('level', v_level, 'xp', v_xp, 'leveled_up', v_leveled_up);
END;
$$;


--
-- Name: buy_normal_shop_product(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buy_normal_shop_product(p_user_id uuid, p_product_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- ショップ商品ロジック
    RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: buy_normal_shop_product(uuid, text, text, integer, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buy_normal_shop_product(p_user_id uuid, p_product_id text, p_currency_type text, p_price integer, p_items jsonb, p_product_title text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user RECORD;
    v_item JSONB;
    v_item_id TEXT;
    v_qty INT;
    v_expire_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- ユーザー存在確認
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'ユーザーが存在しません。';
    END IF;

    -- 通貨残高チェック ＆ 減算
    IF p_currency_type = 'CASH' THEN
        IF v_user.cash < p_price THEN
            RAISE EXCEPTION 'キャッシュが不足しています。';
        END IF;
        UPDATE users SET cash = cash - p_price WHERE id = p_user_id;
    ELSIF p_currency_type = 'DIAMOND' THEN
        IF v_user.neon_diamonds < p_price THEN
            RAISE EXCEPTION 'ダイヤが不足しています。';
        END IF;
        UPDATE users SET neon_diamonds = neon_diamonds - p_price WHERE id = p_user_id;
    ELSE
        RAISE EXCEPTION '無効な支払い通貨タイプです。';
    END IF;

    -- 有効期限 (30日後)
    v_expire_at := NOW() + INTERVAL '30 days';

    -- 配布アイテムをプレゼントBOX (presents) に追加
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := v_item->>'item_id';
        v_qty := (v_item->>'quantity')::INT;

        INSERT INTO presents (
            user_id,
            item_id,
            quantity,
            message,
            status,
            expire_at
        ) VALUES (
            p_user_id,
            v_item_id,
            v_qty,
            'ショップ購入: ' || p_product_title,
            'UNCLAIMED',
            v_expire_at
        );
    END LOOP;

    -- 購入履歴レコードを更新/インサート
    INSERT INTO user_shop_purchases (user_id, product_id, purchase_count, last_purchased_at)
    VALUES (p_user_id, p_product_id, 1, NOW())
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET 
        purchase_count = user_shop_purchases.purchase_count + 1,
        last_purchased_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'message', p_product_title || ' を購入しました！プレゼントBOXをご確認ください。'
    );
END;
$$;


--
-- Name: complete_patrol_instantly(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_patrol_instantly(p_user_id uuid, p_patrol_id uuid, p_currency text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_cash BIGINT;
    v_diamonds INTEGER;
    v_cost INTEGER := 50;
BEGIN
    SELECT cash, neon_diamonds INTO v_cash, v_diamonds FROM public.users WHERE id = p_user_id;

    IF p_currency = 'CASH' THEN
        IF v_cash < 1000 THEN
            RAISE EXCEPTION 'Cash insufficient';
        END IF;
        UPDATE public.users SET cash = cash - 1000 WHERE id = p_user_id;
    ELSE
        IF v_diamonds < v_cost THEN
            RAISE EXCEPTION 'Diamond insufficient';
        END IF;
        UPDATE public.users SET neon_diamonds = neon_diamonds - v_cost WHERE id = p_user_id;
    END IF;

    UPDATE public.user_patrols 
    SET status = 'CLAIMABLE', expires_at = now() 
    WHERE id = p_patrol_id AND user_id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: donate_to_guild(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.donate_to_guild(p_user_id uuid, p_guild_id uuid, p_amount integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cash BIGINT;
  v_funds BIGINT;
  v_is_member BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'invalid donation amount';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id AND user_id = p_user_id
  ) INTO v_is_member;
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'guild membership required';
  END IF;

  UPDATE public.users
  SET cash = cash - p_amount
  WHERE id = p_user_id AND cash >= p_amount
  RETURNING cash INTO v_cash;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient cash';
  END IF;

  UPDATE public.guilds
  SET funds = COALESCE(funds, 0) + p_amount
  WHERE id = p_guild_id
  RETURNING funds INTO v_funds;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'guild not found';
  END IF;

  UPDATE public.guild_members
  SET contribution_points = COALESCE(contribution_points, 0) + p_amount
  WHERE guild_id = p_guild_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'next_cash', v_cash,
    'next_funds', v_funds
  );
END;
$$;


--
-- Name: equip_gear_bulk(text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.equip_gear_bulk(p_character_id text, p_user_id uuid, p_gear_ids jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_gear_id TEXT;
    v_idx INTEGER := 0;
BEGIN
    PERFORM public.unequip_gear_bulk(p_character_id, p_user_id);

    FOR v_gear_id IN SELECT jsonb_array_elements_text(p_gear_ids) LOOP
        UPDATE public.user_equipments 
        SET equipped_character_id = p_character_id, slot_index = v_idx 
        WHERE id::text = v_gear_id AND user_id = p_user_id;
        v_idx := v_idx + 1;
    END LOOP;
END;
$$;


--
-- Name: equip_skill_bulk(text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.equip_skill_bulk(p_character_id text, p_user_id uuid, p_skill_ids jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_skill_id TEXT;
    v_idx INTEGER := 0;
BEGIN
    PERFORM public.unequip_skill_bulk(p_character_id, p_user_id);

    FOR v_skill_id IN SELECT jsonb_array_elements_text(p_skill_ids) LOOP
        UPDATE public.user_skills 
        SET equipped_character_id = p_character_id, slot_index = v_idx 
        WHERE id::text = v_skill_id AND user_id = p_user_id;
        v_idx := v_idx + 1;
    END LOOP;
END;
$$;


--
-- Name: evaluate_mission_progress(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.evaluate_mission_progress(p_user_id uuid, p_trigger_type text, p_progress_increment integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.user_missions um
    SET current_progress = um.current_progress + p_progress_increment,
        status = CASE WHEN um.current_progress + p_progress_increment >= m.target_value THEN 'CLEAR' ELSE 'PROGRESS' END,
        updated_at = now()
    FROM public.missions m
    WHERE um.mission_id = m.id AND um.user_id = p_user_id AND m.trigger_type = p_trigger_type AND um.status = 'PROGRESS';
END;
$$;


--
-- Name: exchange_pity_reward(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exchange_pity_reward(p_user_id uuid, p_reward_type text, p_reward_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_points integer;
  v_exists boolean;
  v_awaken integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_reward_type NOT IN ('CHARACTER','SKILL','EQUIPMENT') OR p_reward_id IS NULL OR p_reward_id = '' THEN
    RAISE EXCEPTION 'invalid pity reward';
  END IF;

  SELECT current_points INTO v_points
  FROM public.user_gacha_pity_points
  WHERE user_id = p_user_id AND pity_master_id = 'pity_special_common'
  FOR UPDATE;
  IF COALESCE(v_points, 0) < 200 THEN
    RAISE EXCEPTION 'insufficient pity points';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.gacha_items_master
    WHERE item_id = p_reward_id
      AND gacha_id LIKE CASE p_reward_type WHEN 'CHARACTER' THEN 'CHAR_%' WHEN 'SKILL' THEN 'SKILL_%' ELSE 'EQUIP_%' END
  ) INTO v_exists;
  IF NOT v_exists THEN RAISE EXCEPTION 'invalid pity reward'; END IF;

  UPDATE public.user_gacha_pity_points
  SET current_points = v_points - 200, updated_at = now()
  WHERE user_id = p_user_id AND pity_master_id = 'pity_special_common';

  IF p_reward_type = 'CHARACTER' THEN
    SELECT awakening_level INTO v_awaken FROM public.user_characters
    WHERE user_id = p_user_id AND character_id = p_reward_id ORDER BY id LIMIT 1 FOR UPDATE;
    IF v_awaken IS NULL THEN
      INSERT INTO public.user_characters (user_id, character_id, level, awakening_level) VALUES (p_user_id, p_reward_id, 1, 0);
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'new');
    ELSIF v_awaken >= 5 THEN
      INSERT INTO public.user_items (user_id, item_id, quantity) VALUES (p_user_id, 'LAW_OF_STRIFE', 1)
      ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 1;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'converted');
    ELSE
      UPDATE public.user_characters SET awakening_level = v_awaken + 1 WHERE user_id = p_user_id AND character_id = p_reward_id;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'awakening');
    END IF;
  ELSIF p_reward_type = 'SKILL' THEN
    SELECT plus_val INTO v_awaken FROM public.user_skills WHERE user_id = p_user_id AND skill_card_id = p_reward_id ORDER BY id LIMIT 1 FOR UPDATE;
    IF v_awaken IS NULL THEN
      INSERT INTO public.user_skills (user_id, skill_card_id, plus_val) VALUES (p_user_id, p_reward_id, 0);
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'new');
    ELSIF v_awaken >= 10 THEN
      INSERT INTO public.user_items (user_id, item_id, quantity) VALUES (p_user_id, 'TRAINING_MANUAL', 2)
      ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 2;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'converted');
    ELSE
      UPDATE public.user_skills SET plus_val = v_awaken + 1 WHERE user_id = p_user_id AND skill_card_id = p_reward_id;
      RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'limit_break');
    END IF;
  ELSE
    INSERT INTO public.user_equipments (user_id, equipment_id, level, plus_val, random_options) VALUES (p_user_id, p_reward_id, 1, 0, '[]'::jsonb);
    RETURN jsonb_build_object('type', p_reward_type, 'item_id', p_reward_id, 'outcome', 'new');
  END IF;
END;
$$;


--
-- Name: execute_asset_gacha(uuid, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_asset_gacha(p_user_id uuid, p_gacha_id text, p_pull_count integer, p_currency_type text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_gacha RECORD;
  v_user RECORD;
  v_item_id TEXT;
  v_existing RECORD;
  v_result JSONB := '[]'::jsonb;
  v_cost INTEGER;
  v_today DATE := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  v_index INTEGER;
  v_is_skill BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_pull_count IS NULL OR p_pull_count < 1 OR p_pull_count > 10 THEN
    RAISE EXCEPTION 'invalid pull count';
  END IF;
  IF p_currency_type = 'free' AND p_pull_count <> 10 THEN
    RAISE EXCEPTION 'free gacha requires 10 pulls';
  END IF;

  SELECT id, gacha_type, cost_cash, cost_diamond
  INTO v_gacha
  FROM public.gacha_masters
  WHERE id = p_gacha_id AND gacha_type IN ('SKILL', 'EQUIPMENT');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'asset gacha not found';
  END IF;
  v_is_skill := v_gacha.gacha_type = 'SKILL';

  IF p_currency_type = 'free' THEN
    INSERT INTO public.user_daily_gacha_claims (user_id, gacha_type, last_claimed_date)
    VALUES (p_user_id, v_gacha.gacha_type, v_today)
    ON CONFLICT (user_id, gacha_type) DO UPDATE
      SET last_claimed_date = EXCLUDED.last_claimed_date, updated_at = now()
      WHERE public.user_daily_gacha_claims.last_claimed_date < v_today;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'daily free gacha already claimed';
    END IF;
  ELSIF p_currency_type = 'cash' OR p_currency_type = 'diamonds' THEN
    v_cost := CASE WHEN p_currency_type = 'cash' THEN v_gacha.cost_cash ELSE v_gacha.cost_diamond END * p_pull_count;
    IF p_currency_type = 'cash' THEN
      UPDATE public.users SET cash = cash - v_cost
      WHERE id = p_user_id AND cash >= v_cost;
    ELSE
      UPDATE public.users SET neon_diamonds = neon_diamonds - v_cost
      WHERE id = p_user_id AND neon_diamonds >= v_cost;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient gacha currency';
    END IF;
  ELSIF p_currency_type = 'ticket' THEN
    UPDATE public.user_items SET quantity = quantity - p_pull_count
    WHERE user_id = p_user_id AND item_id = 'GACHA_TICKET' AND quantity >= p_pull_count;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient gacha tickets';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid currency type';
  END IF;

  FOR v_index IN 1..p_pull_count LOOP
    SELECT item_id INTO v_item_id
    FROM public.gacha_items_master
    WHERE gacha_id = p_gacha_id
    ORDER BY -ln(random()) / GREATEST(weight, 1)
    LIMIT 1;
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'gacha pool is empty';
    END IF;

    IF v_is_skill THEN
      SELECT id, plus_val INTO v_existing
      FROM public.user_skills
      WHERE user_id = p_user_id AND skill_card_id = v_item_id
      FOR UPDATE;
      IF FOUND AND COALESCE(v_existing.plus_val, 0) < 10 THEN
        UPDATE public.user_skills SET plus_val = COALESCE(plus_val, 0) + 1 WHERE id = v_existing.id;
        v_result := v_result || jsonb_build_array(jsonb_build_object('type', 'SKILL', 'item_id', v_item_id, 'outcome', 'limit_break'));
      ELSIF FOUND THEN
        INSERT INTO public.user_items (user_id, item_id, quantity)
        VALUES (p_user_id, 'TRAINING_MANUAL', 2)
        ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = public.user_items.quantity + 2;
        v_result := v_result || jsonb_build_array(jsonb_build_object('type', 'SKILL', 'item_id', v_item_id, 'outcome', 'converted'));
      ELSE
        INSERT INTO public.user_skills (user_id, skill_card_id, plus_val)
        VALUES (p_user_id, v_item_id, 0);
        v_result := v_result || jsonb_build_array(jsonb_build_object('type', 'SKILL', 'item_id', v_item_id, 'outcome', 'new'));
      END IF;
    ELSE
      INSERT INTO public.user_equipments (user_id, equipment_id, level, plus_val, random_options)
      VALUES (p_user_id, v_item_id, 1, 0, '[]'::jsonb);
      v_result := v_result || jsonb_build_array(jsonb_build_object('type', 'EQUIPMENT', 'item_id', v_item_id, 'outcome', 'new'));
    END IF;
  END LOOP;

  IF p_currency_type <> 'free' AND p_gacha_id IN ('SKILL_SPECIAL', 'EQUIP_SPECIAL') THEN
    INSERT INTO public.user_gacha_pity_points (user_id, pity_master_id, current_points)
    VALUES (p_user_id, 'pity_special_common', p_pull_count)
    ON CONFLICT (user_id, pity_master_id) DO UPDATE
      SET current_points = public.user_gacha_pity_points.current_points + p_pull_count, updated_at = now();
  END IF;

  SELECT cash, neon_diamonds INTO v_user FROM public.users WHERE id = p_user_id;
  RETURN jsonb_build_object('status', 'success', 'results', v_result, 'cash', v_user.cash, 'diamonds', v_user.neon_diamonds);
END;
$$;


--
-- Name: execute_character_gacha(uuid, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_character_gacha(p_user_id uuid, p_gacha_id text, p_pull_count integer, p_currency_type text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_gacha RECORD;
  v_user RECORD;
  v_item_id TEXT;
  v_existing RECORD;
  v_result JSONB := '[]'::jsonb;
  v_cost INTEGER;
  v_today DATE := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  v_index INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_pull_count IS NULL OR p_pull_count < 1 OR p_pull_count > 10 THEN
    RAISE EXCEPTION 'invalid pull count';
  END IF;
  IF p_currency_type = 'free' AND p_pull_count <> 10 THEN
    RAISE EXCEPTION 'free gacha requires 10 pulls';
  END IF;

  SELECT id, gacha_type, cost_cash, cost_diamond
  INTO v_gacha
  FROM public.gacha_masters
  WHERE id = p_gacha_id AND gacha_type = 'CHARACTER';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'character gacha not found';
  END IF;

  IF p_currency_type = 'free' THEN
    INSERT INTO public.user_daily_gacha_claims (user_id, gacha_type, last_claimed_date)
    VALUES (p_user_id, 'CHARACTER', v_today)
    ON CONFLICT (user_id, gacha_type) DO UPDATE
      SET last_claimed_date = EXCLUDED.last_claimed_date, updated_at = now()
      WHERE public.user_daily_gacha_claims.last_claimed_date < v_today;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'daily free gacha already claimed';
    END IF;
  ELSIF p_currency_type = 'cash' OR p_currency_type = 'diamonds' THEN
    v_cost := CASE WHEN p_currency_type = 'cash' THEN v_gacha.cost_cash ELSE v_gacha.cost_diamond END * p_pull_count;
    IF p_currency_type = 'cash' THEN
      UPDATE public.users SET cash = cash - v_cost
      WHERE id = p_user_id AND cash >= v_cost;
    ELSE
      UPDATE public.users SET neon_diamonds = neon_diamonds - v_cost
      WHERE id = p_user_id AND neon_diamonds >= v_cost;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient gacha currency';
    END IF;
  ELSIF p_currency_type = 'ticket' THEN
    UPDATE public.user_items SET quantity = quantity - p_pull_count
    WHERE user_id = p_user_id AND item_id = 'GACHA_TICKET' AND quantity >= p_pull_count;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient gacha tickets';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid currency type';
  END IF;

  FOR v_index IN 1..p_pull_count LOOP
    SELECT item_id INTO v_item_id
    FROM public.gacha_items_master
    WHERE gacha_id = p_gacha_id
    ORDER BY -ln(random()) / GREATEST(weight, 1)
    LIMIT 1;
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'gacha pool is empty';
    END IF;

    SELECT id, awakening_level INTO v_existing
    FROM public.user_characters
    WHERE user_id = p_user_id AND character_id = v_item_id
    FOR UPDATE;

    IF FOUND AND COALESCE(v_existing.awakening_level, 0) < 5 THEN
      UPDATE public.user_characters
      SET awakening_level = COALESCE(awakening_level, 0) + 1
      WHERE id = v_existing.id;
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'CHARACTER', 'character_id', v_item_id, 'outcome', 'awakening'
      ));
    ELSIF FOUND THEN
      INSERT INTO public.user_items (user_id, item_id, quantity)
      VALUES (p_user_id, 'LAW_OF_STRIFE', 1)
      ON CONFLICT (user_id, item_id) DO UPDATE
        SET quantity = public.user_items.quantity + 1;
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'CHARACTER', 'character_id', v_item_id, 'outcome', 'converted'
      ));
    ELSE
      INSERT INTO public.user_characters (user_id, character_id, level, awakening_level)
      VALUES (p_user_id, v_item_id, 1, 0);
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'type', 'CHARACTER', 'character_id', v_item_id, 'outcome', 'new'
      ));
    END IF;
  END LOOP;

  IF p_currency_type <> 'free' AND p_gacha_id = 'CHAR_SPECIAL' THEN
    INSERT INTO public.user_gacha_pity_points (user_id, pity_master_id, current_points)
    VALUES (p_user_id, 'pity_special_common', p_pull_count)
    ON CONFLICT (user_id, pity_master_id) DO UPDATE
      SET current_points = public.user_gacha_pity_points.current_points + p_pull_count,
          updated_at = now();
  END IF;

  SELECT cash, neon_diamonds INTO v_user FROM public.users WHERE id = p_user_id;
  RETURN jsonb_build_object(
    'status', 'success',
    'results', v_result,
    'cash', v_user.cash,
    'diamonds', v_user.neon_diamonds
  );
END;
$$;


--
-- Name: execute_gacha(uuid, text, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_gacha(p_user_id uuid, p_currency_type text, p_currency_cost integer, p_results jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cash BIGINT;
  v_diamonds BIGINT;
  v_tickets INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_currency_cost IS NULL OR p_currency_cost <= 0 OR p_currency_cost > 1000000 THEN
    RAISE EXCEPTION 'invalid gacha cost';
  END IF;
  IF p_results IS NOT NULL AND jsonb_array_length(p_results) <> 0 THEN
    RAISE EXCEPTION 'client supplied gacha results are not accepted';
  END IF;

  IF p_currency_type = 'cash' THEN
    UPDATE public.users
    SET cash = cash - p_currency_cost
    WHERE id = p_user_id AND cash >= p_currency_cost
    RETURNING cash INTO v_cash;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient cash';
    END IF;
    RETURN jsonb_build_object('status', 'charged', 'cash', v_cash);
  ELSIF p_currency_type = 'diamonds' THEN
    UPDATE public.users
    SET neon_diamonds = neon_diamonds - p_currency_cost
    WHERE id = p_user_id AND neon_diamonds >= p_currency_cost
    RETURNING neon_diamonds INTO v_diamonds;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient diamonds';
    END IF;
    RETURN jsonb_build_object('status', 'charged', 'diamonds', v_diamonds);
  ELSIF p_currency_type = 'ticket' THEN
    UPDATE public.user_items
    SET quantity = quantity - p_currency_cost
    WHERE user_id = p_user_id
      AND item_id = 'GACHA_TICKET'
      AND quantity >= p_currency_cost
    RETURNING quantity INTO v_tickets;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient gacha tickets';
    END IF;
    RETURN jsonb_build_object('status', 'charged', 'tickets', v_tickets);
  ELSE
    RAISE EXCEPTION 'invalid currency type';
  END IF;
END;
$$;


--
-- Name: generate_user_gift_code(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_user_gift_code(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_code TEXT := '';
    v_exists BOOLEAN := true;
    v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    i INTEGER;
BEGIN
    SELECT gift_code INTO v_code FROM public.users WHERE id = p_user_id;
    IF v_code IS NOT NULL AND v_code <> '' THEN
        RETURN v_code;
    END IF;

    WHILE v_exists LOOP
        v_code := '';
        FOR i IN 1..8 LOOP
            v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
        END LOOP;
        SELECT EXISTS (SELECT 1 FROM public.users WHERE gift_code = v_code) INTO v_exists;
    END LOOP;

    UPDATE public.users SET gift_code = v_code WHERE id = p_user_id;
    RETURN v_code;
END;
$$;


--
-- Name: get_public_battle_loadout(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_battle_loadout(p_target_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user record;
  v_char record;
  v_equips jsonb;
  v_skills jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT username INTO v_user FROM public.users WHERE id = p_target_user_id;
  SELECT id, character_id, level, awakening_level INTO v_char
  FROM public.user_characters
  WHERE user_id = p_target_user_id
  ORDER BY level DESC, awakening_level DESC, id
  LIMIT 1;
  IF v_char.id IS NULL THEN
    RETURN jsonb_build_object('username', v_user.username, 'character', null, 'equipments', '[]'::jsonb, 'skills', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'equipment_id', equipment_id, 'level', level, 'plus_val', plus_val, 'slot_index', slot_index, 'random_options', random_options
  )), '[]'::jsonb) INTO v_equips
  FROM public.user_equipments WHERE user_id = p_target_user_id AND equipped_character_id = v_char.id::text;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'skill_card_id', skill_card_id, 'plus_val', plus_val, 'slot_index', slot_index
  )), '[]'::jsonb) INTO v_skills
  FROM public.user_skills WHERE user_id = p_target_user_id AND equipped_character_id = v_char.id::text;

  RETURN jsonb_build_object(
    'username', v_user.username,
    'character', jsonb_build_object('id', v_char.id, 'character_id', v_char.character_id, 'level', v_char.level, 'awakening_level', v_char.awakening_level),
    'equipments', v_equips,
    'skills', v_skills
  );
END;
$$;


--
-- Name: get_public_battle_roster(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_battle_roster(p_target_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user record;
  v_roster jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT username INTO v_user FROM public.users WHERE id = p_target_user_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'character_id', c.character_id,
    'level', c.level,
    'awakening_level', c.awakening_level,
    'equipments', COALESCE((SELECT jsonb_agg(jsonb_build_object('equipment_id', e.equipment_id, 'level', e.level, 'plus_val', e.plus_val, 'slot_index', e.slot_index, 'random_options', e.random_options)) FROM public.user_equipments e WHERE e.user_id = c.user_id AND e.equipped_character_id = c.id::text), '[]'::jsonb),
    'skills', COALESCE((SELECT jsonb_agg(jsonb_build_object('skill_card_id', s.skill_card_id, 'plus_val', s.plus_val, 'slot_index', s.slot_index)) FROM public.user_skills s WHERE s.user_id = c.user_id AND s.equipped_character_id = c.id::text), '[]'::jsonb)
  ) ORDER BY c.level DESC, c.awakening_level DESC), '[]'::jsonb) INTO v_roster
  FROM public.user_characters c WHERE c.user_id = p_target_user_id;
  RETURN jsonb_build_object('username', v_user.username, 'characters', v_roster);
END;
$$;


--
-- Name: get_public_battle_roster_by_character_ids(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_battle_roster_by_character_ids(p_character_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_roster jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_character_ids IS NULL OR cardinality(p_character_ids) = 0 THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'character_id', c.character_id, 'level', c.level, 'awakening_level', c.awakening_level,
    'equipments', COALESCE((SELECT jsonb_agg(jsonb_build_object('equipment_id', e.equipment_id, 'level', e.level, 'plus_val', e.plus_val, 'slot_index', e.slot_index, 'random_options', e.random_options)) FROM public.user_equipments e WHERE e.user_id = c.user_id AND e.equipped_character_id = c.id::text), '[]'::jsonb),
    'skills', COALESCE((SELECT jsonb_agg(jsonb_build_object('skill_card_id', s.skill_card_id, 'plus_val', s.plus_val, 'slot_index', s.slot_index)) FROM public.user_skills s WHERE s.user_id = c.user_id AND s.equipped_character_id = c.id::text), '[]'::jsonb)
  ) ORDER BY array_position(p_character_ids, c.id)), '[]'::jsonb) INTO v_roster
  FROM public.user_characters c WHERE c.id = ANY(p_character_ids);
  RETURN v_roster;
END;
$$;


--
-- Name: get_public_leader_characters(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_leader_characters(p_user_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(x)) FROM (
      SELECT DISTINCT ON (c.user_id) c.user_id, c.id, c.character_id, c.level
      FROM public.user_characters c
      WHERE c.user_id = ANY(p_user_ids)
      ORDER BY c.user_id, c.level DESC, c.awakening_level DESC, c.id
    ) x
  ), '[]'::jsonb);
END;
$$;


--
-- Name: get_public_power_rankings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_power_rankings() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(x) ORDER BY x.current_power DESC) FROM (
      SELECT r.user_id, r.current_power, r.updated_at,
             u.username, u.avatar_url,
             gm.guild_id, g.name AS guild_name
      FROM public.user_power_rankings r
      LEFT JOIN public.users u ON u.id = r.user_id
      LEFT JOIN public.guild_members gm ON gm.user_id = r.user_id
      LEFT JOIN public.guilds g ON g.id = gm.guild_id
    ) x
  ), '[]'::jsonb);
END;
$$;


--
-- Name: get_public_profiles(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_profiles(p_user_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(x)) FROM (
      SELECT id AS user_id, username, avatar_url, bio, favorite_character_id, 1 AS level, NULL::text AS title_equipped
      FROM public.users WHERE id = ANY(p_user_ids)
    ) x
  ), '[]'::jsonb);
END;
$$;


--
-- Name: get_pvp_opponents(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pvp_opponents(p_user_id uuid, p_my_points integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'user_id', u.id,
      'username', u.username,
      'rank_points', COALESCE(r.rank_points, 1000),
      'defense_character_ids', to_jsonb(array_remove(ARRAY[
        d.character_1_id,
        d.character_2_id,
        d.character_3_id,
        d.character_4_id,
        d.character_5_id
      ]::TEXT[], NULL))
    ) AS row_data
    FROM public.users u
    LEFT JOIN public.pvp_ranks r ON r.user_id = u.id
    LEFT JOIN public.pvp_defense_decks d ON d.user_id = u.id
    WHERE u.id <> p_user_id
      AND (p_my_points IS NULL OR ABS(COALESCE(r.rank_points, 1000) - p_my_points) <= 300)
    ORDER BY ABS(COALESCE(r.rank_points, 1000) - COALESCE(p_my_points, 1000)), u.id
    LIMIT 5
  ) candidates;

  RETURN v_result;
END;
$$;


--
-- Name: get_user_setup_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_setup_status() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid());
$$;


--
-- Name: initialize_new_user(uuid, text, uuid, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_new_user(p_user_id uuid, p_username text, p_character_id uuid DEFAULT '11111111-1111-1111-1111-111111111111'::uuid, p_area_id text DEFAULT 'shinjuku'::text, p_gift_code text DEFAULT NULL::text, p_gender text DEFAULT 'MALE'::text, p_hair_id text DEFAULT 'hair_male_spiky'::text, p_face_id text DEFAULT 'face_male_smirk'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_inviter_id UUID;
    v_invite_count INT;
    v_expire_at TIMESTAMP WITH TIME ZONE;
    v_char_id UUID;
BEGIN
    -- デフォルトキャラIDの補正
    v_char_id := COALESCE(p_character_id, '11111111-1111-1111-1111-111111111111'::UUID);

    -- A. 重複チェック
    IF EXISTS(SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'すでに初期セットアップが完了しています。';
    END IF;
    IF EXISTS(SELECT 1 FROM users WHERE username = p_username) THEN
        RAISE EXCEPTION 'このユーザー名は既に使用されています。';
    END IF;

    -- B. ギフトコードの評価 (入力がある場合)
    IF p_gift_code IS NOT NULL AND p_gift_code <> '' THEN
        SELECT id INTO v_inviter_id FROM users WHERE gift_code = p_gift_code;
        IF v_inviter_id IS NULL THEN
            RAISE EXCEPTION '無効なギフトコードです。';
        END IF;
        
        IF v_inviter_id = p_user_id THEN
            RAISE EXCEPTION '自分のギフトコードは使用できません。';
        END IF;

        -- 使用回数チェック (最大10人)
        SELECT COUNT(*) INTO v_invite_count FROM user_invitations WHERE inviter_id = v_inviter_id;
        IF v_invite_count >= 10 THEN
            RAISE EXCEPTION 'このギフトコードは10人使用済です。';
        END IF;
    END IF;

    -- C. ユーザーレコードの作成
    INSERT INTO users (
        id, username, bio, avatar_url, cash, neon_diamonds, vitality, pvp_tickets, current_base_id, favorite_character_id
    ) VALUES (
        p_user_id, p_username, '歌舞伎町の覇権を握るため立ち上がる。', 
        CASE 
            WHEN v_char_id = '11111111-1111-1111-1111-111111111111'::UUID THEN '/reiji_transparent_asset.png'
            WHEN v_char_id = '33333333-3333-3333-3333-333333333333'::UUID THEN '/rui_transparent_asset.png'
            ELSE '/chang_transparent_asset.png'
        END,
        10000, 200, 100, 5, 
        CASE WHEN p_area_id = 'shinjuku' THEN 'neon_tower' ELSE p_area_id END, 
        v_char_id
    );

    -- D. 招待関係の記録 ＆ 報酬付与
    IF v_inviter_id IS NOT NULL THEN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
            INSERT INTO user_invitations (inviter_id, invitee_id) VALUES (v_inviter_id, p_user_id);
        END IF;
        
        v_expire_at := NOW() + INTERVAL '30 days';
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'presents') THEN
            INSERT INTO presents (user_id, title, item_type, amount, expire_at)
            VALUES (p_user_id, '招待コード入力報酬', 'NEON_DIAMOND', 100, v_expire_at);
        END IF;
    END IF;

    -- E. 初期配備メンバー (お気に入りリーダーキャラ) の付与
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_characters') THEN
        INSERT INTO user_characters (user_id, character_id, level, awakening_level)
        VALUES (p_user_id, v_char_id, 1, 0)
        ON CONFLICT (user_id, character_id) DO NOTHING;
    END IF;

END;
$$;


--
-- Name: process_gvg_battle_result_v2(uuid, uuid, text, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_gvg_battle_result_v2(p_user_id uuid, p_guild_id uuid, p_base_id text, p_is_practice boolean, p_is_win boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_points INTEGER := CASE WHEN p_is_win THEN 250 ELSE -100 END;
  v_season_points INTEGER;
  v_daily_points INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'guild membership required';
  END IF;
  IF p_is_practice THEN
    RETURN jsonb_build_object('status', 'success', 'practice', true);
  END IF;

  INSERT INTO public.user_gvg_ranks (user_id, season_points)
  VALUES (p_user_id, GREATEST(v_points, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    season_points = GREATEST(COALESCE(public.user_gvg_ranks.season_points, 0) + v_points, 0),
    updated_at = now();

  INSERT INTO public.guild_base_controls (base_id, guild_id, daily_points, is_controlling)
  VALUES (p_base_id, p_guild_id, GREATEST(v_points, 0), p_is_win)
  ON CONFLICT (base_id) DO UPDATE SET
    guild_id = CASE WHEN p_is_win THEN p_guild_id ELSE public.guild_base_controls.guild_id END,
    daily_points = CASE
      WHEN p_is_win AND public.guild_base_controls.guild_id = p_guild_id
        THEN COALESCE(public.guild_base_controls.daily_points, 0) + v_points
      WHEN p_is_win THEN GREATEST(v_points, 0)
      WHEN public.guild_base_controls.guild_id = p_guild_id
        THEN GREATEST(COALESCE(public.guild_base_controls.daily_points, 0) + v_points, 0)
      ELSE public.guild_base_controls.daily_points
    END,
    is_controlling = CASE WHEN p_is_win THEN true ELSE public.guild_base_controls.is_controlling END,
    updated_at = now();

  SELECT season_points INTO v_season_points
  FROM public.user_gvg_ranks WHERE user_id = p_user_id;
  SELECT daily_points INTO v_daily_points
  FROM public.guild_base_controls
  WHERE base_id = p_base_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'season_points', v_season_points,
    'daily_points', v_daily_points
  );
END;
$$;


--
-- Name: process_login_bonus(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_login_bonus() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_current_day INTEGER := 1;
    v_last_claimed TIMESTAMPTZ;
    v_now TIMESTAMPTZ := now();
    v_item_id TEXT;
    v_qty INTEGER;
    v_item_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        -- セッションなし時のフォールバック処理用デモID
        SELECT id INTO v_user_id FROM public.users LIMIT 1;
    END IF;

    SELECT current_day, last_claimed_at INTO v_current_day, v_last_claimed 
    FROM public.user_login_bonuses WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.user_login_bonuses (user_id, current_day, last_claimed_at)
        VALUES (v_user_id, 1, v_now);
        v_current_day := 1;
    ELSE
        IF v_last_claimed::date = v_now::date THEN
            RETURN jsonb_build_object('already_claimed', true);
        END IF;
        v_current_day := (v_current_day % 7) + 1;
        UPDATE public.user_login_bonuses 
        SET current_day = v_current_day, last_claimed_at = v_now 
        WHERE user_id = v_user_id;
    END IF;

    SELECT item_id, quantity, item_name INTO v_item_id, v_qty, v_item_name
    FROM public.login_bonus_master WHERE day_number = v_current_day;

    IF v_item_id IS NOT NULL THEN
        INSERT INTO public.presents (user_id, item_id, quantity, message, expire_at)
        VALUES (v_user_id, v_item_id, v_qty, 'ログインボーナス (' || v_item_name || ')', v_now + interval '30 days');
    END IF;

    RETURN jsonb_build_object('already_claimed', false, 'day_number', v_current_day, 'item_id', v_item_id, 'quantity', v_qty, 'item_name', v_item_name);
END;
$$;


--
-- Name: process_pvp_match_result(uuid, uuid, boolean, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_pvp_match_result(p_user_id uuid, p_target_user_id uuid, p_is_win boolean, p_point_diff integer, p_cash_reward integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_points INTEGER;
  v_cash BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_point_diff IS NULL OR p_point_diff < -1000 OR p_point_diff > 1000 THEN
    RAISE EXCEPTION 'invalid point change';
  END IF;
  IF p_cash_reward IS NULL OR p_cash_reward < 0 OR p_cash_reward > 1000000 THEN
    RAISE EXCEPTION 'invalid cash reward';
  END IF;

  INSERT INTO public.pvp_ranks (user_id, rank_points, daily_wins, season_wins)
  VALUES (
    p_user_id,
    GREATEST(1000 + p_point_diff, 0),
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    CASE WHEN p_is_win THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    rank_points = GREATEST(COALESCE(public.pvp_ranks.rank_points, 0) + p_point_diff, 0),
    daily_wins = COALESCE(public.pvp_ranks.daily_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    season_wins = COALESCE(public.pvp_ranks.season_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    updated_at = now();

  UPDATE public.users
  SET cash = cash + p_cash_reward
  WHERE id = p_user_id
  RETURNING cash INTO v_cash;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  SELECT rank_points INTO v_points
  FROM public.pvp_ranks
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'rank_points', v_points,
    'cash', v_cash,
    'target_user_id', p_target_user_id
  );
END;
$$;


--
-- Name: process_stripe_shop_purchase(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_stripe_shop_purchase(p_user_id uuid, p_product_id text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Stripe購入ロジック
    RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: process_stripe_shop_purchase(uuid, text, text, integer, jsonb, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_stripe_shop_purchase(p_user_id uuid, p_stripe_session_id text, p_product_id text, p_amount_jpy integer, p_items jsonb, p_product_title text, p_is_beginner boolean DEFAULT false, p_purchase_limit integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user RECORD;
    v_exist_tx INT;
    v_purchase_count INT := 0;
    v_item JSONB;
    v_item_id TEXT;
    v_qty INT;
    v_expire_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- ユーザー存在確認
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'ユーザーが存在しません。';
    END IF;

    -- A. 決済トランザクションの重複（冪等性）チェック
    SELECT COUNT(*) INTO v_exist_tx 
    FROM payment_transactions 
    WHERE stripe_session_id = p_stripe_session_id;

    IF v_exist_tx > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'message', 'すでに処理済みのトランザクションです。'
        );
    END IF;

    -- B. 初心者限定商材 (24時間以内制限 & 1回限り) の検証
    IF p_is_beginner THEN
        IF v_user.created_at < (NOW() - INTERVAL '24 hours') THEN
            RAISE EXCEPTION '初心者限定商品の購入可能期間（24時間）が終了しています。';
        END IF;

        SELECT COALESCE(purchase_count, 0) INTO v_purchase_count 
        FROM user_shop_purchases 
        WHERE user_id = p_user_id AND product_id = p_product_id;

        IF v_purchase_count >= 1 THEN
            RAISE EXCEPTION '初心者限定商品は1回のみ購入可能です。';
        END IF;
    END IF;

    -- C. 限定N回販売商品の購入上限チェック
    IF p_purchase_limit > 0 AND NOT p_is_beginner THEN
        SELECT COALESCE(purchase_count, 0) INTO v_purchase_count 
        FROM user_shop_purchases 
        WHERE user_id = p_user_id AND product_id = p_product_id;

        IF v_purchase_count >= p_purchase_limit THEN
            RAISE EXCEPTION 'この商品は購入上限回数に達しています。';
        END IF;
    END IF;

    -- トランザクション記録を作成
    INSERT INTO payment_transactions (
        user_id,
        stripe_session_id,
        amount,
        currency,
        diamonds_added,
        status
    ) VALUES (
        p_user_id,
        p_stripe_session_id,
        p_amount_jpy,
        'jpy',
        0, -- 配布アイテムはすべてpresents経由で受取
        'COMPLETED'
    );

    -- 配布アイテムをプレゼントBOX (presents) へ挿入
    v_expire_at := NOW() + INTERVAL '30 days';

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := v_item->>'item_id';
        v_qty := (v_item->>'quantity')::INT;

        INSERT INTO presents (
            user_id,
            item_id,
            quantity,
            message,
            status,
            expire_at
        ) VALUES (
            p_user_id,
            v_item_id,
            v_qty,
            '購入特典: ' || p_product_title,
            'UNCLAIMED',
            v_expire_at
        );
    END LOOP;

    -- 購入履歴レコードの更新
    INSERT INTO user_shop_purchases (user_id, product_id, purchase_count, last_purchased_at)
    VALUES (p_user_id, p_product_id, 1, NOW())
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET 
        purchase_count = user_shop_purchases.purchase_count + 1,
        last_purchased_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'duplicate', false,
        'product_id', p_product_id,
        'message', p_product_title || ' の購入が完了しました！プレゼントBOXへ送付されました。'
    );
END;
$$;


--
-- Name: record_raid_boss_damage(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_raid_boss_damage(p_user_id uuid, p_boss_id text, p_damage integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_hp BIGINT;
  v_max_hp BIGINT;
  v_status TEXT;
  v_new_hp BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_damage IS NULL OR p_damage <= 0 OR p_damage > 1000000000 THEN
    RAISE EXCEPTION 'invalid damage';
  END IF;

  SELECT current_hp, max_hp, status
  INTO v_current_hp, v_max_hp, v_status
  FROM public.raid_bosses
  WHERE boss_id = p_boss_id AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND OR v_status = 'DEFEATED' OR COALESCE(v_current_hp, 0) <= 0 THEN
    RAISE EXCEPTION 'raid boss is not active';
  END IF;

  v_new_hp := GREATEST(v_current_hp - p_damage, 0);
  UPDATE public.raid_bosses
  SET current_hp = v_new_hp,
      status = CASE WHEN v_new_hp = 0 THEN 'DEFEATED' ELSE status END
  WHERE boss_id = p_boss_id;

  INSERT INTO public.raid_damage_logs (boss_id, user_id, damage)
  VALUES (p_boss_id, p_user_id, p_damage);

  RETURN jsonb_build_object(
    'status', 'success',
    'damage', p_damage,
    'remaining_hp', v_new_hp,
    'defeated', v_new_hp = 0
  );
END;
$$;


--
-- Name: sell_gear_bulk(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sell_gear_bulk(p_user_id uuid, p_gear_ids jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_equipped_count INTEGER;
    v_total_cash BIGINT := 0;
BEGIN
    -- 装備中アセットが含まれているか検証 (KI Rule B-7)
    SELECT count(*) INTO v_equipped_count 
    FROM public.user_equipments 
    WHERE user_id = p_user_id 
      AND id::text IN (SELECT jsonb_array_elements_text(p_gear_ids))
      AND equipped_character_id IS NOT NULL;

    IF v_equipped_count > 0 THEN
        RAISE EXCEPTION 'Cannot sell equipped items';
    END IF;

    -- 売却計算 & 削除
    v_total_cash := jsonb_array_length(p_gear_ids) * 500;
    
    DELETE FROM public.user_equipments 
    WHERE user_id = p_user_id 
      AND id::text IN (SELECT jsonb_array_elements_text(p_gear_ids));

    UPDATE public.users SET cash = cash + v_total_cash WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'earned_cash', v_total_cash);
END;
$$;


--
-- Name: sync_active_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_active_users() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.users SET last_active_at = now() WHERE id = auth.uid();
  SELECT count(*) INTO v_count FROM public.users WHERE last_active_at >= now() - interval '5 minutes';
  RETURN v_count;
END;
$$;


--
-- Name: sync_and_evaluate_raid_timeout(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_and_evaluate_raid_timeout(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_boss_record RECORD;
BEGIN
    SELECT * INTO v_boss_record FROM public.raid_bosses WHERE status = 'ACTIVE' LIMIT 1;
    IF FOUND THEN
        IF v_boss_record.expires_at <= now() THEN
            UPDATE public.raid_bosses SET status = 'EXPIRED' WHERE id = v_boss_record.id;
            RETURN jsonb_build_object('is_active', false, 'reason', 'EXPIRED');
        END IF;
        RETURN jsonb_build_object('is_active', true, 'boss', row_to_json(v_boss_record));
    END IF;
    RETURN jsonb_build_object('is_active', false);
END;
$$;


--
-- Name: sync_and_recover_vitality_and_tickets(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_and_recover_vitality_and_tickets(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_vitality INTEGER;
    v_tickets INTEGER;
BEGIN
    SELECT vitality, pvp_tickets INTO v_vitality, v_tickets FROM public.users WHERE id = p_user_id;
    IF v_vitality < 100 THEN
        v_vitality := LEAST(100, v_vitality + 10);
    END IF;
    IF v_tickets < 5 THEN
        v_tickets := LEAST(5, v_tickets + 1);
    END IF;

    UPDATE public.users SET vitality = v_vitality, pvp_tickets = v_tickets WHERE id = p_user_id;
    RETURN jsonb_build_object('vitality', v_vitality, 'pvp_tickets', v_tickets);
END;
$$;


--
-- Name: unequip_gear_bulk(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unequip_gear_bulk(p_character_id text, p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.user_equipments 
    SET equipped_character_id = NULL, slot_index = NULL 
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;
END;
$$;


--
-- Name: unequip_skill_bulk(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unequip_skill_bulk(p_character_id text, p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.user_skills 
    SET equipped_character_id = NULL, slot_index = NULL 
    WHERE user_id = p_user_id AND equipped_character_id = p_character_id;
END;
$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    -- Reset the role on every FOR..LOOP batch execution.
                    -- The first batch of 10 rows is pre-fetched using the current connection role (PG internal behaviour)
                    -- then we have to reset it again otherwise it would use the role defined in the `set_config` above
                    -- to fetch the remaining rows when rows>10, which could be a user-defined role that lacks execution grants.
                    -- The flow is:
                    --   1. run batch with conn role
                    --   2. set_config working_role
                    --   3. execute walrus
                    --   4. reset role (revert)
                    --   5. repeat
                    perform set_config('role', null, true);

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: avatar_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avatar_parts (
    part_id text NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    price_cash integer DEFAULT 0,
    price_diamond integer DEFAULT 0,
    unlock_level integer DEFAULT 1,
    img_url text
);


--
-- Name: board_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text DEFAULT 'STRATEGY_CHAT'::text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid,
    author_name text NOT NULL,
    author_avatar text,
    author_character_id text,
    replies_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: character_awakening_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_awakening_master (
    awakening_level integer NOT NULL,
    hp_bonus integer DEFAULT 0,
    atk_bonus integer DEFAULT 0,
    def_bonus integer DEFAULT 0,
    spd_bonus integer DEFAULT 0,
    luk_bonus integer DEFAULT 0,
    required_cash bigint DEFAULT 0
);


--
-- Name: character_growth_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_growth_patterns (
    pattern_id text NOT NULL,
    name text NOT NULL,
    hp_gain numeric DEFAULT 0,
    atk_gain numeric DEFAULT 0,
    def_gain numeric DEFAULT 0,
    spd_gain numeric DEFAULT 0,
    luk_gain numeric DEFAULT 0,
    base_hp integer DEFAULT 100,
    base_atk integer DEFAULT 10,
    base_def integer DEFAULT 10,
    base_spd integer DEFAULT 10,
    base_luk integer DEFAULT 5
);


--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: enemies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enemies (
    id text NOT NULL,
    name text NOT NULL,
    level integer DEFAULT 1,
    hp integer DEFAULT 100,
    atk integer DEFAULT 10,
    def integer DEFAULT 10,
    spd integer DEFAULT 10,
    luk integer DEFAULT 5,
    enemy_type text DEFAULT 'NORMAL'::text,
    skills jsonb DEFAULT '[]'::jsonb
);


--
-- Name: equipment_level_up_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment_level_up_master (
    level integer NOT NULL,
    cost_cash integer DEFAULT 500,
    required_exp integer DEFAULT 100
);


--
-- Name: equipment_limit_break_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment_limit_break_master (
    plus_val integer NOT NULL,
    success_rate numeric DEFAULT 1.0,
    cost_cash integer DEFAULT 1000,
    required_hammer integer DEFAULT 1
);


--
-- Name: gacha_exchange_items_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gacha_exchange_items_master (
    id text NOT NULL,
    pity_master_id text NOT NULL,
    reward_type text NOT NULL,
    reward_id text NOT NULL,
    required_points integer DEFAULT 200 NOT NULL,
    limit_per_user integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gacha_items_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gacha_items_master (
    id integer NOT NULL,
    gacha_id text NOT NULL,
    item_id text NOT NULL,
    weight integer DEFAULT 100 NOT NULL,
    is_pickup boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gacha_items_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gacha_items_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gacha_items_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gacha_items_master_id_seq OWNED BY public.gacha_items_master.id;


--
-- Name: gacha_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gacha_masters (
    id text NOT NULL,
    name text NOT NULL,
    gacha_type text NOT NULL,
    cost_cash integer DEFAULT 0 NOT NULL,
    cost_diamond integer DEFAULT 0 NOT NULL,
    cost_pay_diamond integer DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gacha_masters_gacha_type_check CHECK ((gacha_type = ANY (ARRAY['CHARACTER'::text, 'SKILL'::text, 'EQUIPMENT'::text])))
);


--
-- Name: gacha_pity_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gacha_pity_masters (
    id text NOT NULL,
    gacha_id text NOT NULL,
    pity_threshold integer DEFAULT 200 NOT NULL,
    currency_name text DEFAULT 'ガチャPt'::text NOT NULL,
    start_at timestamp with time zone DEFAULT now() NOT NULL,
    end_at timestamp with time zone DEFAULT (now() + '10 years'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: guild_base_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guild_base_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_id text NOT NULL,
    guild_id uuid,
    daily_points integer DEFAULT 0,
    is_controlling boolean DEFAULT false,
    total_seasonal_days integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: guild_level_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guild_level_master (
    level integer NOT NULL,
    next_xp integer DEFAULT 0,
    max_members integer DEFAULT 15,
    member_buff_atk numeric DEFAULT 0,
    member_buff_hp numeric DEFAULT 0
);


--
-- Name: guild_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guild_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guild_id uuid,
    user_id uuid,
    role text DEFAULT 'MEMBER'::text,
    contribution_points integer DEFAULT 0,
    joined_at timestamp with time zone DEFAULT now()
);


--
-- Name: guild_xp_action_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guild_xp_action_master (
    action_type text NOT NULL,
    xp_grant integer DEFAULT 0,
    contribution_grant integer DEFAULT 0
);


--
-- Name: guilds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guilds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    leader_id uuid,
    level integer DEFAULT 1,
    xp integer DEFAULT 0,
    funds bigint DEFAULT 0,
    main_alignment text DEFAULT 'NEUTRAL'::text,
    sub_alignment text DEFAULT 'NEUTRAL'::text,
    banner_id text,
    decoration_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gvg_defense_decks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gvg_defense_decks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    character_1_id text,
    character_2_id text,
    character_3_id text,
    character_4_id text,
    character_5_id text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: gvg_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gvg_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id integer DEFAULT 1,
    day_number integer DEFAULT 1,
    base_id text NOT NULL,
    guild_a_id uuid,
    guild_b_id uuid,
    status text DEFAULT 'ONGOING'::text,
    winner_guild_id uuid,
    is_finals boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gvg_rewards_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gvg_rewards_master (
    rank integer NOT NULL,
    guild_funds integer DEFAULT 0,
    member_diamonds integer DEFAULT 0
);


--
-- Name: gvg_season_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gvg_season_status (
    id integer DEFAULT 1 NOT NULL,
    current_day integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: login_bonus_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_bonus_master (
    day_number integer NOT NULL,
    item_id text NOT NULL,
    quantity integer DEFAULT 1,
    item_name text NOT NULL
);


--
-- Name: missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.missions (
    id text NOT NULL,
    category text NOT NULL,
    trigger_type text NOT NULL,
    title text NOT NULL,
    desc_text text,
    target_value integer DEFAULT 1,
    reward_item_id text,
    reward_qty integer DEFAULT 1
);


--
-- Name: patrol_npcs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patrol_npcs (
    id text NOT NULL,
    quest_id text,
    npc_name text NOT NULL,
    npc_level integer DEFAULT 1,
    encounter_rate numeric DEFAULT 0.1,
    enemy_data jsonb DEFAULT '{}'::jsonb
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    product_id text NOT NULL,
    amount integer DEFAULT 0,
    currency text DEFAULT 'JPY'::text,
    status text DEFAULT 'COMPLETED'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: presents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    item_id text NOT NULL,
    quantity integer DEFAULT 1,
    message text,
    status text DEFAULT 'UNCLAIMED'::text,
    expire_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pvp_defense_decks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pvp_defense_decks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    character_1_id text,
    character_2_id text,
    character_3_id text,
    character_4_id text,
    character_5_id text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pvp_defense_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pvp_defense_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    attacker_id uuid,
    attacker_name text,
    result text,
    points_change integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pvp_match_rewards_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pvp_match_rewards_master (
    result text NOT NULL,
    diamond_reward integer DEFAULT 0,
    cash_reward integer DEFAULT 0,
    exp_reward integer DEFAULT 0
);


--
-- Name: pvp_ranks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pvp_ranks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    rank_points integer DEFAULT 1000,
    daily_wins integer DEFAULT 0,
    season_wins integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pvp_rewards_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pvp_rewards_master (
    id integer NOT NULL,
    rank_min integer NOT NULL,
    rank_max integer NOT NULL,
    diamond_reward integer DEFAULT 0,
    cash_reward integer DEFAULT 0
);


--
-- Name: pvp_rewards_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pvp_rewards_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pvp_rewards_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pvp_rewards_master_id_seq OWNED BY public.pvp_rewards_master.id;


--
-- Name: quest_towns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quest_towns (
    id text NOT NULL,
    name text NOT NULL,
    desc_text text,
    bg_image text
);


--
-- Name: quests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quests (
    id text NOT NULL,
    town_id text,
    level_type text NOT NULL,
    name text NOT NULL,
    duration_seconds integer DEFAULT 300,
    cost_vitality integer DEFAULT 10,
    cash_reward integer DEFAULT 100,
    exp_reward integer DEFAULT 50,
    item_rewards jsonb DEFAULT '[]'::jsonb
);


--
-- Name: raid_boss_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raid_boss_master (
    id text NOT NULL,
    name text NOT NULL,
    base_hp bigint DEFAULT 100000,
    base_atk integer DEFAULT 100,
    base_def integer DEFAULT 50,
    spd integer DEFAULT 100,
    duration_minutes integer DEFAULT 60,
    rewards jsonb DEFAULT '[]'::jsonb
);


--
-- Name: raid_bosses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raid_bosses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    boss_id text NOT NULL,
    current_hp bigint DEFAULT 100000,
    max_hp bigint DEFAULT 100000,
    base_id text DEFAULT 'neon_tower'::text,
    status text DEFAULT 'ACTIVE'::text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: raid_damage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raid_damage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    boss_id text NOT NULL,
    user_id uuid,
    damage bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: raid_rewards_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raid_rewards_master (
    id integer NOT NULL,
    reward_type text NOT NULL,
    threshold_val bigint DEFAULT 0,
    item_id text NOT NULL,
    quantity integer DEFAULT 1
);


--
-- Name: raid_rewards_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.raid_rewards_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: raid_rewards_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.raid_rewards_master_id_seq OWNED BY public.raid_rewards_master.id;


--
-- Name: skill_limit_break_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_limit_break_master (
    plus_val integer NOT NULL,
    cost_cash integer DEFAULT 1000,
    required_book integer DEFAULT 1
);


--
-- Name: story_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    episode_id text NOT NULL,
    status text DEFAULT 'READING'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_avatar_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_avatar_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    part_id text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_avatars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_avatars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    gender text DEFAULT 'MALE'::text,
    hair_id text DEFAULT 'hair_male_spiky'::text,
    face_id text DEFAULT 'face_male_smirk'::text,
    outfit_id text DEFAULT 'body_basic'::text,
    background_id text DEFAULT 'bg_default'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_characters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    character_id text NOT NULL,
    level integer DEFAULT 1,
    awakening_level integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel text DEFAULT 'GLOBAL'::text NOT NULL,
    guild_id uuid,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_avatar text,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_daily_gacha_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_daily_gacha_claims (
    user_id uuid NOT NULL,
    gacha_type text NOT NULL,
    last_claimed_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_daily_gacha_claims_gacha_type_check CHECK ((gacha_type = ANY (ARRAY['CHARACTER'::text, 'SKILL'::text, 'EQUIPMENT'::text])))
);


--
-- Name: user_equipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_equipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    equipment_id text NOT NULL,
    level integer DEFAULT 1,
    plus_val integer DEFAULT 0,
    equipped_character_id text,
    slot_index integer,
    random_options jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_gacha_pity_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_gacha_pity_points (
    user_id uuid NOT NULL,
    pity_master_id text NOT NULL,
    current_points integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_gvg_ranks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_gvg_ranks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    season_points integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inviter_user_id uuid,
    invitee_user_id uuid,
    gift_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    item_id text NOT NULL,
    quantity integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_level_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_level_master (
    level integer NOT NULL,
    next_xp integer DEFAULT 0
);


--
-- Name: user_login_bonuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_login_bonuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    current_day integer DEFAULT 1,
    last_claimed_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_missions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    mission_id text NOT NULL,
    current_progress integer DEFAULT 0,
    status text DEFAULT 'PROGRESS'::text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_patrols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_patrols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    course_id text,
    quest_id text,
    character_id text NOT NULL,
    status text DEFAULT 'ONGOING'::text,
    has_battle_event boolean DEFAULT false,
    battle_resolved boolean DEFAULT false,
    battle_result text,
    rewards_accrued jsonb DEFAULT '{}'::jsonb,
    started_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: user_power_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_power_rankings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    total_power integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_profile_decorations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profile_decorations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    decoration_type character varying(32) NOT NULL,
    decoration_id character varying(64) NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_shop_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_shop_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    purchase_count integer DEFAULT 1 NOT NULL,
    last_purchased_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    skill_card_id text NOT NULL,
    plus_val integer DEFAULT 0,
    equipped_character_id text,
    slot_index integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username text NOT NULL,
    cash bigint DEFAULT 1000 NOT NULL,
    neon_diamonds integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    bio text DEFAULT '歌舞伎町の覇権を握るため立ち上がる。'::text,
    avatar_url text DEFAULT '/reiji_transparent_asset.png'::text,
    vitality integer DEFAULT 100,
    pvp_tickets integer DEFAULT 5,
    current_base_id text DEFAULT 'neon_tower'::text,
    favorite_character_id uuid,
    gift_code text,
    selected_bg_mode character varying(64) DEFAULT 'auto'::character varying,
    interior_item character varying(64) DEFAULT 'none'::character varying,
    last_active_at timestamp with time zone
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2026_07_27; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_07_27 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


--
-- Name: messages_2026_07_28; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_07_28 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


--
-- Name: messages_2026_07_29; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_07_29 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


--
-- Name: messages_2026_07_30; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_07_30 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


--
-- Name: messages_2026_07_31; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_07_31 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone DEFAULT now()
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages_2026_07_27; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_07_27 FOR VALUES FROM ('2026-07-27 00:00:00') TO ('2026-07-28 00:00:00');


--
-- Name: messages_2026_07_28; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_07_28 FOR VALUES FROM ('2026-07-28 00:00:00') TO ('2026-07-29 00:00:00');


--
-- Name: messages_2026_07_29; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_07_29 FOR VALUES FROM ('2026-07-29 00:00:00') TO ('2026-07-30 00:00:00');


--
-- Name: messages_2026_07_30; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_07_30 FOR VALUES FROM ('2026-07-30 00:00:00') TO ('2026-07-31 00:00:00');


--
-- Name: messages_2026_07_31; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_07_31 FOR VALUES FROM ('2026-07-31 00:00:00') TO ('2026-08-01 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: gacha_items_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gacha_items_master ALTER COLUMN id SET DEFAULT nextval('public.gacha_items_master_id_seq'::regclass);


--
-- Name: pvp_rewards_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_rewards_master ALTER COLUMN id SET DEFAULT nextval('public.pvp_rewards_master_id_seq'::regclass);


--
-- Name: raid_rewards_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raid_rewards_master ALTER COLUMN id SET DEFAULT nextval('public.raid_rewards_master_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: avatar_parts avatar_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_parts
    ADD CONSTRAINT avatar_parts_pkey PRIMARY KEY (part_id);


--
-- Name: board_posts board_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_posts
    ADD CONSTRAINT board_posts_pkey PRIMARY KEY (id);


--
-- Name: character_awakening_master character_awakening_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_awakening_master
    ADD CONSTRAINT character_awakening_master_pkey PRIMARY KEY (awakening_level);


--
-- Name: character_growth_patterns character_growth_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_growth_patterns
    ADD CONSTRAINT character_growth_patterns_pkey PRIMARY KEY (pattern_id);


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);


--
-- Name: enemies enemies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enemies
    ADD CONSTRAINT enemies_pkey PRIMARY KEY (id);


--
-- Name: equipment_level_up_master equipment_level_up_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_level_up_master
    ADD CONSTRAINT equipment_level_up_master_pkey PRIMARY KEY (level);


--
-- Name: equipment_limit_break_master equipment_limit_break_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_limit_break_master
    ADD CONSTRAINT equipment_limit_break_master_pkey PRIMARY KEY (plus_val);


--
-- Name: gacha_exchange_items_master gacha_exchange_items_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gacha_exchange_items_master
    ADD CONSTRAINT gacha_exchange_items_master_pkey PRIMARY KEY (id);


--
-- Name: gacha_items_master gacha_items_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gacha_items_master
    ADD CONSTRAINT gacha_items_master_pkey PRIMARY KEY (id);


--
-- Name: gacha_masters gacha_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gacha_masters
    ADD CONSTRAINT gacha_masters_pkey PRIMARY KEY (id);


--
-- Name: gacha_pity_masters gacha_pity_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gacha_pity_masters
    ADD CONSTRAINT gacha_pity_masters_pkey PRIMARY KEY (id);


--
-- Name: guild_base_controls guild_base_controls_base_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_base_controls
    ADD CONSTRAINT guild_base_controls_base_id_key UNIQUE (base_id);


--
-- Name: guild_base_controls guild_base_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_base_controls
    ADD CONSTRAINT guild_base_controls_pkey PRIMARY KEY (id);


--
-- Name: guild_level_master guild_level_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_level_master
    ADD CONSTRAINT guild_level_master_pkey PRIMARY KEY (level);


--
-- Name: guild_members guild_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_members
    ADD CONSTRAINT guild_members_pkey PRIMARY KEY (id);


--
-- Name: guild_members guild_members_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_members
    ADD CONSTRAINT guild_members_user_id_key UNIQUE (user_id);


--
-- Name: guild_xp_action_master guild_xp_action_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_xp_action_master
    ADD CONSTRAINT guild_xp_action_master_pkey PRIMARY KEY (action_type);


--
-- Name: guilds guilds_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guilds
    ADD CONSTRAINT guilds_name_key UNIQUE (name);


--
-- Name: guilds guilds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guilds
    ADD CONSTRAINT guilds_pkey PRIMARY KEY (id);


--
-- Name: gvg_defense_decks gvg_defense_decks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_defense_decks
    ADD CONSTRAINT gvg_defense_decks_pkey PRIMARY KEY (id);


--
-- Name: gvg_defense_decks gvg_defense_decks_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_defense_decks
    ADD CONSTRAINT gvg_defense_decks_user_id_key UNIQUE (user_id);


--
-- Name: gvg_matches gvg_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_matches
    ADD CONSTRAINT gvg_matches_pkey PRIMARY KEY (id);


--
-- Name: gvg_rewards_master gvg_rewards_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_rewards_master
    ADD CONSTRAINT gvg_rewards_master_pkey PRIMARY KEY (rank);


--
-- Name: gvg_season_status gvg_season_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_season_status
    ADD CONSTRAINT gvg_season_status_pkey PRIMARY KEY (id);


--
-- Name: login_bonus_master login_bonus_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_bonus_master
    ADD CONSTRAINT login_bonus_master_pkey PRIMARY KEY (day_number);


--
-- Name: missions missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_pkey PRIMARY KEY (id);


--
-- Name: patrol_npcs patrol_npcs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrol_npcs
    ADD CONSTRAINT patrol_npcs_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: presents presents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presents
    ADD CONSTRAINT presents_pkey PRIMARY KEY (id);


--
-- Name: pvp_defense_decks pvp_defense_decks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_defense_decks
    ADD CONSTRAINT pvp_defense_decks_pkey PRIMARY KEY (id);


--
-- Name: pvp_defense_decks pvp_defense_decks_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_defense_decks
    ADD CONSTRAINT pvp_defense_decks_user_id_key UNIQUE (user_id);


--
-- Name: pvp_defense_logs pvp_defense_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_defense_logs
    ADD CONSTRAINT pvp_defense_logs_pkey PRIMARY KEY (id);


--
-- Name: pvp_match_rewards_master pvp_match_rewards_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_match_rewards_master
    ADD CONSTRAINT pvp_match_rewards_master_pkey PRIMARY KEY (result);


--
-- Name: pvp_ranks pvp_ranks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_ranks
    ADD CONSTRAINT pvp_ranks_pkey PRIMARY KEY (id);


--
-- Name: pvp_ranks pvp_ranks_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_ranks
    ADD CONSTRAINT pvp_ranks_user_id_key UNIQUE (user_id);


--
-- Name: pvp_rewards_master pvp_rewards_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_rewards_master
    ADD CONSTRAINT pvp_rewards_master_pkey PRIMARY KEY (id);


--
-- Name: quest_towns quest_towns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quest_towns
    ADD CONSTRAINT quest_towns_pkey PRIMARY KEY (id);


--
-- Name: quests quests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_pkey PRIMARY KEY (id);


--
-- Name: raid_boss_master raid_boss_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raid_boss_master
    ADD CONSTRAINT raid_boss_master_pkey PRIMARY KEY (id);


--
-- Name: raid_bosses raid_bosses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raid_bosses
    ADD CONSTRAINT raid_bosses_pkey PRIMARY KEY (id);


--
-- Name: raid_damage_logs raid_damage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raid_damage_logs
    ADD CONSTRAINT raid_damage_logs_pkey PRIMARY KEY (id);


--
-- Name: raid_rewards_master raid_rewards_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raid_rewards_master
    ADD CONSTRAINT raid_rewards_master_pkey PRIMARY KEY (id);


--
-- Name: skill_limit_break_master skill_limit_break_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_limit_break_master
    ADD CONSTRAINT skill_limit_break_master_pkey PRIMARY KEY (plus_val);


--
-- Name: story_sessions story_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_sessions
    ADD CONSTRAINT story_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_profile_decorations unique_user_decoration; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile_decorations
    ADD CONSTRAINT unique_user_decoration UNIQUE (user_id, decoration_type, decoration_id);


--
-- Name: user_avatar_parts user_avatar_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_avatar_parts
    ADD CONSTRAINT user_avatar_parts_pkey PRIMARY KEY (id);


--
-- Name: user_avatar_parts user_avatar_parts_user_id_part_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_avatar_parts
    ADD CONSTRAINT user_avatar_parts_user_id_part_id_key UNIQUE (user_id, part_id);


--
-- Name: user_avatars user_avatars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_avatars
    ADD CONSTRAINT user_avatars_pkey PRIMARY KEY (id);


--
-- Name: user_characters user_characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_characters
    ADD CONSTRAINT user_characters_pkey PRIMARY KEY (id);


--
-- Name: user_chats user_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chats
    ADD CONSTRAINT user_chats_pkey PRIMARY KEY (id);


--
-- Name: user_daily_gacha_claims user_daily_gacha_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_gacha_claims
    ADD CONSTRAINT user_daily_gacha_claims_pkey PRIMARY KEY (user_id, gacha_type);


--
-- Name: user_equipments user_equipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_equipments
    ADD CONSTRAINT user_equipments_pkey PRIMARY KEY (id);


--
-- Name: user_gacha_pity_points user_gacha_pity_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gacha_pity_points
    ADD CONSTRAINT user_gacha_pity_points_pkey PRIMARY KEY (user_id, pity_master_id);


--
-- Name: user_gvg_ranks user_gvg_ranks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gvg_ranks
    ADD CONSTRAINT user_gvg_ranks_pkey PRIMARY KEY (id);


--
-- Name: user_gvg_ranks user_gvg_ranks_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gvg_ranks
    ADD CONSTRAINT user_gvg_ranks_user_id_key UNIQUE (user_id);


--
-- Name: user_invitations user_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);


--
-- Name: user_items user_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_pkey PRIMARY KEY (id);


--
-- Name: user_items user_items_user_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_item_id_key UNIQUE (user_id, item_id);


--
-- Name: user_level_master user_level_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_master
    ADD CONSTRAINT user_level_master_pkey PRIMARY KEY (level);


--
-- Name: user_login_bonuses user_login_bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_bonuses
    ADD CONSTRAINT user_login_bonuses_pkey PRIMARY KEY (id);


--
-- Name: user_login_bonuses user_login_bonuses_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_bonuses
    ADD CONSTRAINT user_login_bonuses_user_id_key UNIQUE (user_id);


--
-- Name: user_missions user_missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_pkey PRIMARY KEY (id);


--
-- Name: user_missions user_missions_user_id_mission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_user_id_mission_id_key UNIQUE (user_id, mission_id);


--
-- Name: user_patrols user_patrols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_patrols
    ADD CONSTRAINT user_patrols_pkey PRIMARY KEY (id);


--
-- Name: user_power_rankings user_power_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_power_rankings
    ADD CONSTRAINT user_power_rankings_pkey PRIMARY KEY (id);


--
-- Name: user_power_rankings user_power_rankings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_power_rankings
    ADD CONSTRAINT user_power_rankings_user_id_key UNIQUE (user_id);


--
-- Name: user_profile_decorations user_profile_decorations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile_decorations
    ADD CONSTRAINT user_profile_decorations_pkey PRIMARY KEY (id);


--
-- Name: user_shop_purchases user_shop_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_shop_purchases
    ADD CONSTRAINT user_shop_purchases_pkey PRIMARY KEY (id);


--
-- Name: user_shop_purchases user_shop_purchases_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_shop_purchases
    ADD CONSTRAINT user_shop_purchases_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_07_27 messages_2026_07_27_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_07_27
    ADD CONSTRAINT messages_2026_07_27_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_07_28 messages_2026_07_28_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_07_28
    ADD CONSTRAINT messages_2026_07_28_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_07_29 messages_2026_07_29_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_07_29
    ADD CONSTRAINT messages_2026_07_29_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_07_30 messages_2026_07_30_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_07_30
    ADD CONSTRAINT messages_2026_07_30_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_07_31 messages_2026_07_31_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_07_31
    ADD CONSTRAINT messages_2026_07_31_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: idx_direct_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_created ON public.direct_messages USING btree (created_at DESC);


--
-- Name: idx_direct_messages_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_recipient ON public.direct_messages USING btree (recipient_id);


--
-- Name: idx_direct_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_messages_sender ON public.direct_messages USING btree (sender_id);


--
-- Name: user_characters_user_character_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_characters_user_character_uidx ON public.user_characters USING btree (user_id, character_id);


--
-- Name: users_last_active_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_last_active_at_idx ON public.users USING btree (last_active_at);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_07_27_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_07_27_inserted_at_topic_idx ON realtime.messages_2026_07_27 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_07_28_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_07_28_inserted_at_topic_idx ON realtime.messages_2026_07_28 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_07_29_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_07_29_inserted_at_topic_idx ON realtime.messages_2026_07_29 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_07_30_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_07_30_inserted_at_topic_idx ON realtime.messages_2026_07_30 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_07_31_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_07_31_inserted_at_topic_idx ON realtime.messages_2026_07_31 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_07_27_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_07_27_inserted_at_topic_idx;


--
-- Name: messages_2026_07_27_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_07_27_pkey;


--
-- Name: messages_2026_07_28_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_07_28_inserted_at_topic_idx;


--
-- Name: messages_2026_07_28_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_07_28_pkey;


--
-- Name: messages_2026_07_29_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_07_29_inserted_at_topic_idx;


--
-- Name: messages_2026_07_29_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_07_29_pkey;


--
-- Name: messages_2026_07_30_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_07_30_inserted_at_topic_idx;


--
-- Name: messages_2026_07_30_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_07_30_pkey;


--
-- Name: messages_2026_07_31_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_07_31_inserted_at_topic_idx;


--
-- Name: messages_2026_07_31_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_07_31_pkey;


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: board_posts board_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_posts
    ADD CONSTRAINT board_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: gacha_exchange_items_master gacha_exchange_items_master_pity_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gacha_exchange_items_master
    ADD CONSTRAINT gacha_exchange_items_master_pity_master_id_fkey FOREIGN KEY (pity_master_id) REFERENCES public.gacha_pity_masters(id) ON DELETE CASCADE;


--
-- Name: gacha_items_master gacha_items_master_gacha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gacha_items_master
    ADD CONSTRAINT gacha_items_master_gacha_id_fkey FOREIGN KEY (gacha_id) REFERENCES public.gacha_masters(id) ON DELETE CASCADE;


--
-- Name: guild_base_controls guild_base_controls_guild_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_base_controls
    ADD CONSTRAINT guild_base_controls_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id) ON DELETE SET NULL;


--
-- Name: guild_members guild_members_guild_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_members
    ADD CONSTRAINT guild_members_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id) ON DELETE CASCADE;


--
-- Name: guild_members guild_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guild_members
    ADD CONSTRAINT guild_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: guilds guilds_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guilds
    ADD CONSTRAINT guilds_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: gvg_defense_decks gvg_defense_decks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_defense_decks
    ADD CONSTRAINT gvg_defense_decks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: gvg_matches gvg_matches_guild_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_matches
    ADD CONSTRAINT gvg_matches_guild_a_id_fkey FOREIGN KEY (guild_a_id) REFERENCES public.guilds(id) ON DELETE SET NULL;


--
-- Name: gvg_matches gvg_matches_guild_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_matches
    ADD CONSTRAINT gvg_matches_guild_b_id_fkey FOREIGN KEY (guild_b_id) REFERENCES public.guilds(id) ON DELETE SET NULL;


--
-- Name: gvg_matches gvg_matches_winner_guild_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gvg_matches
    ADD CONSTRAINT gvg_matches_winner_guild_id_fkey FOREIGN KEY (winner_guild_id) REFERENCES public.guilds(id) ON DELETE SET NULL;


--
-- Name: patrol_npcs patrol_npcs_quest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrol_npcs
    ADD CONSTRAINT patrol_npcs_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: presents presents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presents
    ADD CONSTRAINT presents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pvp_defense_decks pvp_defense_decks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_defense_decks
    ADD CONSTRAINT pvp_defense_decks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pvp_defense_logs pvp_defense_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_defense_logs
    ADD CONSTRAINT pvp_defense_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pvp_ranks pvp_ranks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pvp_ranks
    ADD CONSTRAINT pvp_ranks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quests quests_town_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quests
    ADD CONSTRAINT quests_town_id_fkey FOREIGN KEY (town_id) REFERENCES public.quest_towns(id) ON DELETE SET NULL;


--
-- Name: raid_damage_logs raid_damage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raid_damage_logs
    ADD CONSTRAINT raid_damage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: story_sessions story_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_sessions
    ADD CONSTRAINT story_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_avatar_parts user_avatar_parts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_avatar_parts
    ADD CONSTRAINT user_avatar_parts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_avatars user_avatars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_avatars
    ADD CONSTRAINT user_avatars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_characters user_characters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_characters
    ADD CONSTRAINT user_characters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_chats user_chats_guild_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chats
    ADD CONSTRAINT user_chats_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.guilds(id) ON DELETE CASCADE;


--
-- Name: user_chats user_chats_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chats
    ADD CONSTRAINT user_chats_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_daily_gacha_claims user_daily_gacha_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_gacha_claims
    ADD CONSTRAINT user_daily_gacha_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_equipments user_equipments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_equipments
    ADD CONSTRAINT user_equipments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_gacha_pity_points user_gacha_pity_points_pity_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gacha_pity_points
    ADD CONSTRAINT user_gacha_pity_points_pity_master_id_fkey FOREIGN KEY (pity_master_id) REFERENCES public.gacha_pity_masters(id) ON DELETE CASCADE;


--
-- Name: user_gacha_pity_points user_gacha_pity_points_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gacha_pity_points
    ADD CONSTRAINT user_gacha_pity_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_gvg_ranks user_gvg_ranks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_gvg_ranks
    ADD CONSTRAINT user_gvg_ranks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_invitations user_invitations_invitee_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_invitee_user_id_fkey FOREIGN KEY (invitee_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_invitations user_invitations_inviter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_inviter_user_id_fkey FOREIGN KEY (inviter_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_items user_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_login_bonuses user_login_bonuses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_bonuses
    ADD CONSTRAINT user_login_bonuses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_missions user_missions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_patrols user_patrols_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_patrols
    ADD CONSTRAINT user_patrols_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_power_rankings user_power_rankings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_power_rankings
    ADD CONSTRAINT user_power_rankings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profile_decorations user_profile_decorations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile_decorations
    ADD CONSTRAINT user_profile_decorations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_shop_purchases user_shop_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_shop_purchases
    ADD CONSTRAINT user_shop_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: board_posts Allow all access to board_posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to board_posts" ON public.board_posts USING (true) WITH CHECK (true);


--
-- Name: direct_messages Allow all access to direct_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to direct_messages" ON public.direct_messages USING (true) WITH CHECK (true);


--
-- Name: guild_base_controls Allow all access to guild_base_controls; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to guild_base_controls" ON public.guild_base_controls USING (true) WITH CHECK (true);


--
-- Name: guild_members Allow all access to guild_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to guild_members" ON public.guild_members USING (true) WITH CHECK (true);


--
-- Name: guilds Allow all access to guilds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to guilds" ON public.guilds USING (true) WITH CHECK (true);


--
-- Name: gvg_defense_decks Allow all access to gvg_defense_decks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to gvg_defense_decks" ON public.gvg_defense_decks USING (true) WITH CHECK (true);


--
-- Name: gvg_matches Allow all access to gvg_matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to gvg_matches" ON public.gvg_matches USING (true) WITH CHECK (true);


--
-- Name: gvg_season_status Allow all access to gvg_season_status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to gvg_season_status" ON public.gvg_season_status USING (true) WITH CHECK (true);


--
-- Name: payment_transactions Allow all access to payment_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to payment_transactions" ON public.payment_transactions USING (true) WITH CHECK (true);


--
-- Name: presents Allow all access to presents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to presents" ON public.presents USING (true) WITH CHECK (true);


--
-- Name: pvp_defense_decks Allow all access to pvp_defense_decks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to pvp_defense_decks" ON public.pvp_defense_decks USING (true) WITH CHECK (true);


--
-- Name: pvp_defense_logs Allow all access to pvp_defense_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to pvp_defense_logs" ON public.pvp_defense_logs USING (true) WITH CHECK (true);


--
-- Name: pvp_ranks Allow all access to pvp_ranks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to pvp_ranks" ON public.pvp_ranks USING (true) WITH CHECK (true);


--
-- Name: raid_bosses Allow all access to raid_bosses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to raid_bosses" ON public.raid_bosses USING (true) WITH CHECK (true);


--
-- Name: raid_damage_logs Allow all access to raid_damage_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to raid_damage_logs" ON public.raid_damage_logs USING (true) WITH CHECK (true);


--
-- Name: story_sessions Allow all access to story_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to story_sessions" ON public.story_sessions USING (true) WITH CHECK (true);


--
-- Name: user_avatar_parts Allow all access to user_avatar_parts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_avatar_parts" ON public.user_avatar_parts USING (true) WITH CHECK (true);


--
-- Name: user_avatars Allow all access to user_avatars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_avatars" ON public.user_avatars USING (true) WITH CHECK (true);


--
-- Name: user_chats Allow all access to user_chats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_chats" ON public.user_chats USING (true) WITH CHECK (true);


--
-- Name: user_gvg_ranks Allow all access to user_gvg_ranks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_gvg_ranks" ON public.user_gvg_ranks USING (true) WITH CHECK (true);


--
-- Name: user_invitations Allow all access to user_invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_invitations" ON public.user_invitations USING (true) WITH CHECK (true);


--
-- Name: user_login_bonuses Allow all access to user_login_bonuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_login_bonuses" ON public.user_login_bonuses USING (true) WITH CHECK (true);


--
-- Name: user_missions Allow all access to user_missions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_missions" ON public.user_missions USING (true) WITH CHECK (true);


--
-- Name: user_patrols Allow all access to user_patrols; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_patrols" ON public.user_patrols USING (true) WITH CHECK (true);


--
-- Name: user_power_rankings Allow all access to user_power_rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to user_power_rankings" ON public.user_power_rankings USING (true) WITH CHECK (true);


--
-- Name: avatar_parts Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.avatar_parts FOR SELECT USING (true);


--
-- Name: character_awakening_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.character_awakening_master FOR SELECT USING (true);


--
-- Name: character_growth_patterns Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.character_growth_patterns FOR SELECT USING (true);


--
-- Name: enemies Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.enemies FOR SELECT USING (true);


--
-- Name: equipment_level_up_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.equipment_level_up_master FOR SELECT USING (true);


--
-- Name: equipment_limit_break_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.equipment_limit_break_master FOR SELECT USING (true);


--
-- Name: gacha_items_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.gacha_items_master FOR SELECT USING (true);


--
-- Name: gacha_masters Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.gacha_masters FOR SELECT USING (true);


--
-- Name: guild_level_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.guild_level_master FOR SELECT USING (true);


--
-- Name: guild_xp_action_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.guild_xp_action_master FOR SELECT USING (true);


--
-- Name: gvg_rewards_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.gvg_rewards_master FOR SELECT USING (true);


--
-- Name: login_bonus_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.login_bonus_master FOR SELECT USING (true);


--
-- Name: missions Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.missions FOR SELECT USING (true);


--
-- Name: patrol_npcs Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.patrol_npcs FOR SELECT USING (true);


--
-- Name: pvp_match_rewards_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.pvp_match_rewards_master FOR SELECT USING (true);


--
-- Name: pvp_rewards_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.pvp_rewards_master FOR SELECT USING (true);


--
-- Name: quest_towns Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.quest_towns FOR SELECT USING (true);


--
-- Name: quests Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.quests FOR SELECT USING (true);


--
-- Name: raid_boss_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.raid_boss_master FOR SELECT USING (true);


--
-- Name: raid_rewards_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.raid_rewards_master FOR SELECT USING (true);


--
-- Name: skill_limit_break_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.skill_limit_break_master FOR SELECT USING (true);


--
-- Name: user_level_master Allow public read on master tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on master tables" ON public.user_level_master FOR SELECT USING (true);


--
-- Name: direct_messages Users can insert direct messages as sender; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert direct messages as sender" ON public.direct_messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: user_profile_decorations Users can insert their own decorations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own decorations" ON public.user_profile_decorations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_characters Users can manage their own characters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own characters" ON public.user_characters USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_daily_gacha_claims Users can manage their own daily gacha claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own daily gacha claims" ON public.user_daily_gacha_claims USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_equipments Users can manage their own equipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own equipments" ON public.user_equipments USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_items Users can manage their own items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own items" ON public.user_items USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_gacha_pity_points Users can manage their own pity points; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own pity points" ON public.user_gacha_pity_points USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: users Users can manage their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own profile" ON public.users USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: user_skills Users can manage their own skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own skills" ON public.user_skills USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profile_decorations Users can view all user decorations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all user decorations" ON public.user_profile_decorations FOR SELECT USING (true);


--
-- Name: direct_messages Users can view their own direct messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own direct messages" ON public.direct_messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));


--
-- Name: avatar_parts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avatar_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: board_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: character_awakening_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.character_awakening_master ENABLE ROW LEVEL SECURITY;

--
-- Name: character_growth_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.character_growth_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: direct_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: enemies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enemies ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment_level_up_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipment_level_up_master ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment_limit_break_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipment_limit_break_master ENABLE ROW LEVEL SECURITY;

--
-- Name: gacha_exchange_items_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gacha_exchange_items_master ENABLE ROW LEVEL SECURITY;

--
-- Name: gacha_items_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gacha_items_master ENABLE ROW LEVEL SECURITY;

--
-- Name: gacha_masters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gacha_masters ENABLE ROW LEVEL SECURITY;

--
-- Name: gacha_pity_masters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gacha_pity_masters ENABLE ROW LEVEL SECURITY;

--
-- Name: guild_base_controls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guild_base_controls ENABLE ROW LEVEL SECURITY;

--
-- Name: guild_level_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guild_level_master ENABLE ROW LEVEL SECURITY;

--
-- Name: guild_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;

--
-- Name: guild_xp_action_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guild_xp_action_master ENABLE ROW LEVEL SECURITY;

--
-- Name: guilds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;

--
-- Name: gvg_defense_decks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gvg_defense_decks ENABLE ROW LEVEL SECURITY;

--
-- Name: gvg_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gvg_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: gvg_rewards_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gvg_rewards_master ENABLE ROW LEVEL SECURITY;

--
-- Name: gvg_season_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gvg_season_status ENABLE ROW LEVEL SECURITY;

--
-- Name: login_bonus_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_bonus_master ENABLE ROW LEVEL SECURITY;

--
-- Name: missions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

--
-- Name: patrol_npcs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patrol_npcs ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: presents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presents ENABLE ROW LEVEL SECURITY;

--
-- Name: pvp_defense_decks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pvp_defense_decks ENABLE ROW LEVEL SECURITY;

--
-- Name: pvp_defense_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pvp_defense_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: pvp_match_rewards_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pvp_match_rewards_master ENABLE ROW LEVEL SECURITY;

--
-- Name: pvp_ranks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pvp_ranks ENABLE ROW LEVEL SECURITY;

--
-- Name: pvp_rewards_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pvp_rewards_master ENABLE ROW LEVEL SECURITY;

--
-- Name: quest_towns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quest_towns ENABLE ROW LEVEL SECURITY;

--
-- Name: quests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

--
-- Name: raid_boss_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raid_boss_master ENABLE ROW LEVEL SECURITY;

--
-- Name: raid_bosses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raid_bosses ENABLE ROW LEVEL SECURITY;

--
-- Name: raid_damage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raid_damage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: raid_rewards_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.raid_rewards_master ENABLE ROW LEVEL SECURITY;

--
-- Name: skill_limit_break_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.skill_limit_break_master ENABLE ROW LEVEL SECURITY;

--
-- Name: story_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_avatar_parts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_avatar_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: user_avatars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

--
-- Name: user_characters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_characters ENABLE ROW LEVEL SECURITY;

--
-- Name: user_chats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_chats ENABLE ROW LEVEL SECURITY;

--
-- Name: user_daily_gacha_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_daily_gacha_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: user_equipments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_equipments ENABLE ROW LEVEL SECURITY;

--
-- Name: user_gacha_pity_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_gacha_pity_points ENABLE ROW LEVEL SECURITY;

--
-- Name: user_gvg_ranks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_gvg_ranks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

--
-- Name: user_level_master; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_level_master ENABLE ROW LEVEL SECURITY;

--
-- Name: user_login_bonuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_login_bonuses ENABLE ROW LEVEL SECURITY;

--
-- Name: user_missions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_patrols; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_patrols ENABLE ROW LEVEL SECURITY;

--
-- Name: user_power_rankings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_power_rankings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profile_decorations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profile_decorations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_shop_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_shop_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: user_shop_purchases user_shop_purchases_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_shop_purchases_insert_policy ON public.user_shop_purchases FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_shop_purchases user_shop_purchases_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_shop_purchases_select_policy ON public.user_shop_purchases FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_shop_purchases user_shop_purchases_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_shop_purchases_update_policy ON public.user_shop_purchases FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime FOR ALL TABLES WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict aAbwrkyAcWNetEja51CwW8hlNt4rx1T67U8QMLHufBtJ2sgrM2M9uTbr5HqZ3Af

