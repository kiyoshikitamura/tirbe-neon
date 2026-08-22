-- Phase B3: the legacy unlimited pre-open Quest speed-up is superseded by
-- complete_patrol_instantly(), whose Canonical contract has separate tutorial,
-- free-daily and paid-daily allowances.
begin;

revoke all on function public.complete_patrol_preopen(uuid) from public, anon, authenticated;

commit;
notify pgrst, 'reload schema';
