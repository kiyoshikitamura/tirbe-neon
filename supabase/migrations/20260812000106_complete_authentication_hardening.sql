-- Open Beta M1-4: make tutorial authentication completion idempotent and
-- require exactly one verified non-anonymous identity.
create or replace function public.complete_tutorial_authentication(p_auth_method text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_method text := upper(p_auth_method);
  v_existing_method text;
  v_tutorial_step text;
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_supported_identity_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;
  if v_is_anonymous then
    raise exception 'Verified authentication identity is required';
  end if;
  if v_auth_method not in ('EMAIL', 'GOOGLE') then
    raise exception 'Unsupported authentication method';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select methods.auth_method
    into v_existing_method
  from public.user_account_auth_methods methods
  where methods.user_id = v_user_id
  for update;

  select progress.step_id
    into v_tutorial_step
  from public.tutorial_progress progress
  where progress.user_id = v_user_id
  for update;

  -- Safe retry after a successful callback or a lost HTTP response.
  if v_existing_method = v_auth_method and v_tutorial_step = 'AUTHENTICATION' then
    return 'AUTHENTICATION';
  end if;
  if v_existing_method is not null and v_existing_method <> v_auth_method then
    raise exception 'A different authentication method is already linked';
  end if;
  if v_tutorial_step <> 'COMPLETE' then
    raise exception 'Tutorial completion is required';
  end if;

  select count(distinct identity.provider)
    into v_supported_identity_count
  from auth.identities identity
  where identity.user_id = v_user_id
    and identity.provider in ('email', 'google');

  if v_supported_identity_count <> 1 then
    raise exception 'Exactly one authentication identity is required';
  end if;
  if not exists (
    select 1
    from auth.identities identity
    where identity.user_id = v_user_id
      and identity.provider = lower(v_auth_method)
  ) then
    raise exception 'Requested authentication identity is not linked';
  end if;

  insert into public.user_account_auth_methods (user_id, auth_method)
  values (v_user_id, v_auth_method)
  on conflict (user_id) do update
    set auth_method = excluded.auth_method,
        authenticated_at = now()
    where public.user_account_auth_methods.auth_method = excluded.auth_method;

  update public.tutorial_progress
  set step_id = 'AUTHENTICATION', updated_at = now()
  where user_id = v_user_id;

  return 'AUTHENTICATION';
end;
$$;

revoke all on function public.complete_tutorial_authentication(text) from public;
grant execute on function public.complete_tutorial_authentication(text) to authenticated;
