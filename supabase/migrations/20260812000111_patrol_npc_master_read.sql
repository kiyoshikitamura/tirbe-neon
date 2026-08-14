-- Open Beta M1: patrol enemy masters are authenticated, read-only game data.
-- start_patrol already reads this table through SECURITY DEFINER; the client
-- needs the same rows to construct the battle setup after an encounter.

alter table public.patrol_npcs enable row level security;

drop policy if exists "Authenticated read patrol NPC masters" on public.patrol_npcs;
create policy "Authenticated read patrol NPC masters"
on public.patrol_npcs
for select
to authenticated
using (true);

revoke all on table public.patrol_npcs from anon;
revoke insert, update, delete, truncate, references, trigger on table public.patrol_npcs from authenticated;
grant select on table public.patrol_npcs to authenticated;

notify pgrst, 'reload schema';
