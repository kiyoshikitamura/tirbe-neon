-- Development migration: payment and present records are user-owned.
do $$
declare
  t text;
begin
  foreach t in array array['payment_transactions', 'presents'] loop
    execute format('drop policy if exists %I on public.%I', 'Allow all access to ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'owner access to ' || t, t);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      'owner access to ' || t,
      t
    );
  end loop;
end $$;
