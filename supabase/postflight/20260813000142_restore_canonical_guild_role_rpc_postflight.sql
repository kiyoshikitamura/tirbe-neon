SELECT
  10 AS display_order,
  'canonical_guild_role_rpc' AS check_name,
  CASE
    WHEN to_regprocedure('public.set_guild_member_role(uuid,uuid,text)') IS NOT NULL
      AND has_function_privilege('authenticated', 'public.set_guild_member_role(uuid,uuid,text)', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.set_guild_member_role(uuid,uuid,text)', 'EXECUTE')
    THEN 'PASS' ELSE 'FAIL'
  END AS status,
  'authenticated executable; anon denied' AS detail;
