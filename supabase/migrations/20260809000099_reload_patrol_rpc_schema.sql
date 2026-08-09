-- Ensure PostgREST discovers the secure patrol RPC immediately after deployment.
grant execute on function public.start_patrol(text, text) to authenticated;
notify pgrst, 'reload schema';
