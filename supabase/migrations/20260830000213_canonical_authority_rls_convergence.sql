begin;

-- Retire early owner/public FOR ALL policies. Canonical mutations are exposed
-- only through their SECURITY DEFINER RPCs; clients retain projection reads.
drop policy if exists "Users can manage their own profile" on public.users;
drop policy if exists users_owner_read on public.users;
create policy users_owner_read
  on public.users for select to authenticated
  using (auth.uid() = id);
revoke insert, update, delete on public.users from anon, authenticated;
grant select on public.users to authenticated;

drop policy if exists "Allow all access to user_patrols" on public.user_patrols;
drop policy if exists "owner access to user_patrols" on public.user_patrols;
drop policy if exists user_patrols_owner_read on public.user_patrols;
create policy user_patrols_owner_read
  on public.user_patrols for select to authenticated
  using (auth.uid() = user_id);
revoke insert, update, delete on public.user_patrols from anon, authenticated;
grant select on public.user_patrols to authenticated;

drop policy if exists "Allow all access to raid_bosses" on public.raid_bosses;
drop policy if exists raid_bosses_authenticated_read on public.raid_bosses;
create policy raid_bosses_authenticated_read
  on public.raid_bosses for select to authenticated
  using (true);
revoke insert, update, delete on public.raid_bosses from anon, authenticated;
grant select on public.raid_bosses to authenticated;

commit;
notify pgrst, 'reload schema';
