-- Development migration: restrict user-owned progression/avatar rows to their owner.
-- Public ranking data is intentionally excluded and remains behind its RPC.

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_avatar_parts',
    'user_avatars',
    'user_login_bonuses',
    'user_missions',
    'user_patrols'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'Allow all access to ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'owner access to ' || t, t);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      'owner access to ' || t,
      t
    );
  end loop;
end $$;
