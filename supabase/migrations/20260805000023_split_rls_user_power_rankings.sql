-- Development migration: keep public ranking reads, restrict ranking writes to the owner.
drop policy if exists "Allow all access to user_power_rankings" on public.user_power_rankings;
drop policy if exists "public read user_power_rankings" on public.user_power_rankings;
drop policy if exists "owner write user_power_rankings" on public.user_power_rankings;

create policy "public read user_power_rankings"
on public.user_power_rankings
for select
using (true);

create policy "owner write user_power_rankings"
on public.user_power_rankings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
