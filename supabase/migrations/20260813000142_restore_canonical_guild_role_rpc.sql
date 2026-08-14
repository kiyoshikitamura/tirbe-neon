-- Production Foundation: M8 retired this canonical, owner-checked M5 RPC with
-- legacy mutations. Restore only the reviewed guild-role route.

BEGIN;

REVOKE ALL ON FUNCTION public.set_guild_member_role(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_guild_member_role(uuid, uuid, text) TO authenticated, service_role;

COMMIT;
