-- Ranking / Power P0: source tables can be mutated only by trusted RPC/service paths.

begin;

revoke all on table public.pvp_ranks, public.gvg_match_sessions, public.gvg_attack_logs
  from public, anon, authenticated;

-- Existing GvG screens read match state and the caller's own attack log through
-- scoped RLS policies. They do not receive mutation authority.
grant select on table public.gvg_match_sessions, public.gvg_attack_logs to authenticated;
grant all on table public.pvp_ranks, public.gvg_match_sessions, public.gvg_attack_logs to service_role;

commit;
