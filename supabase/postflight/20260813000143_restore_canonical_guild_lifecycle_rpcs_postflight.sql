WITH required(signature) AS (
  VALUES
    ('public.leave_guild(uuid,uuid,boolean,boolean)'),
    ('public.kick_guild_member(uuid,uuid)')
), resolved AS (
  SELECT
    signature,
    to_regprocedure(signature) AS function_oid
  FROM required
)
SELECT
  10 AS display_order,
  'canonical_guild_lifecycle_rpcs' AS check_name,
  CASE
    WHEN count(*) FILTER (
      WHERE function_oid IS NOT NULL
        AND has_function_privilege('authenticated', function_oid, 'EXECUTE')
        AND NOT has_function_privilege('anon', function_oid, 'EXECUTE')
    ) = 2
    THEN 'PASS' ELSE 'FAIL'
  END AS status,
  format(
    '%s/2 authenticated executable and anon denied',
    count(*) FILTER (
      WHERE function_oid IS NOT NULL
        AND has_function_privilege('authenticated', function_oid, 'EXECUTE')
        AND NOT has_function_privilege('anon', function_oid, 'EXECUTE')
    )
  ) AS detail
FROM resolved;
