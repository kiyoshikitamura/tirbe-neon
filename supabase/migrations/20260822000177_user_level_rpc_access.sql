-- Phase B2 follow-up: expose the authenticated, self-scoped XP entrypoint.

begin;

revoke all on function public.add_user_xp(uuid, integer) from public, anon;
grant execute on function public.add_user_xp(uuid, integer) to authenticated;

commit;
notify pgrst, 'reload schema';
