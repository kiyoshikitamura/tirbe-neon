-- Production Foundation: restore the reviewed, server-authorized guild
-- lifecycle RPCs that the broad M8 legacy retirement revoked.

BEGIN;

REVOKE ALL ON FUNCTION public.leave_guild(uuid, uuid, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.kick_guild_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.leave_guild(uuid, uuid, boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kick_guild_member(uuid, uuid) TO authenticated, service_role;

COMMIT;
