-- Open Beta M1-7: Supabase projects can retain role-specific EXECUTE grants
-- even after PUBLIC is revoked. Anonymous API-key callers must not reach the
-- onboarding RPC bodies; signed-in anonymous users use the authenticated role.

revoke all on function public.get_current_onboarding_state() from public;
revoke all on function public.get_current_onboarding_state() from anon;
grant execute on function public.get_current_onboarding_state() to authenticated;

revoke all on function public.initialize_current_player(text) from public;
revoke all on function public.initialize_current_player(text) from anon;
grant execute on function public.initialize_current_player(text) to authenticated;

revoke all on function public.complete_tutorial_authentication(text) from public;
revoke all on function public.complete_tutorial_authentication(text) from anon;
grant execute on function public.complete_tutorial_authentication(text) to authenticated;
