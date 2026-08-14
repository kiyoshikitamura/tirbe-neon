-- Open Beta M1-6: keep the single-auth-method invariant true on retries and
-- every subsequent onboarding-state check, not only on first completion.
create or replace function public.complete_tutorial_authentication(p_auth_method text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_method text := upper(trim(p_auth_method));
  v_existing_method text;
  v_tutorial_step text;
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_supported_identity_count integer;
  v_identity_provider text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;
  if v_is_anonymous then
    raise exception 'Verified authentication identity is required';
  end if;
  if v_auth_method is null or v_auth_method not in ('EMAIL', 'GOOGLE') then
    raise exception 'Unsupported authentication method';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select count(distinct identity.provider), min(identity.provider)
    into v_supported_identity_count, v_identity_provider
  from auth.identities identity
  where identity.user_id = v_user_id
    and identity.provider in ('email', 'google');

  if v_supported_identity_count <> 1 then
    raise exception 'Exactly one authentication identity is required';
  end if;
  if v_identity_provider <> lower(v_auth_method) then
    raise exception 'Requested authentication identity is not linked';
  end if;

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

  -- A retry is safe only while the identity invariant still holds.
  if v_existing_method = v_auth_method and v_tutorial_step = 'AUTHENTICATION' then
    return 'AUTHENTICATION';
  end if;
  if v_existing_method is not null and v_existing_method <> v_auth_method then
    raise exception 'A different authentication method is already linked';
  end if;
  if v_tutorial_step <> 'COMPLETE' then
    raise exception 'Tutorial completion is required';
  end if;

  insert into public.user_account_auth_methods (user_id, auth_method)
  values (v_user_id, v_auth_method)
  on conflict (user_id) do update
    set authenticated_at = now()
    where public.user_account_auth_methods.auth_method = excluded.auth_method;

  update public.tutorial_progress
  set step_id = 'AUTHENTICATION', updated_at = now()
  where user_id = v_user_id;

  return 'AUTHENTICATION';
end;
$$;

revoke all on function public.complete_tutorial_authentication(text) from public;
grant execute on function public.complete_tutorial_authentication(text) to authenticated;

create or replace function public.get_current_onboarding_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_anonymous boolean;
  v_has_profile boolean;
  v_tutorial_step text;
  v_auth_method text;
  v_identity_provider text;
  v_supported_identity_count integer;
  v_identity_integrity_valid boolean;
  v_is_legacy_authenticated boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  v_is_anonymous := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);

  select exists(select 1 from public.users where id = v_user_id)
    into v_has_profile;

  select progress.step_id
    into v_tutorial_step
  from public.tutorial_progress progress
  where progress.user_id = v_user_id;

  select methods.auth_method
    into v_auth_method
  from public.user_account_auth_methods methods
  where methods.user_id = v_user_id;

  select count(distinct identity.provider), min(identity.provider)
    into v_supported_identity_count, v_identity_provider
  from auth.identities identity
  where identity.user_id = v_user_id
    and identity.provider in ('google', 'email');

  v_identity_integrity_valid :=
    not v_is_anonymous
    and v_supported_identity_count = 1
    and (
      v_auth_method is null
      or lower(v_auth_method) = v_identity_provider
    );

  v_is_legacy_authenticated :=
    v_identity_integrity_valid
    and v_has_profile
    and v_auth_method is null
    and (v_tutorial_step is null or v_tutorial_step = 'AUTHENTICATION');

  return jsonb_build_object(
    'user_id', v_user_id,
    'is_anonymous', v_is_anonymous,
    'has_profile', v_has_profile,
    'tutorial_step', v_tutorial_step,
    'auth_method', coalesce(v_auth_method, case v_identity_provider when 'google' then 'GOOGLE' when 'email' then 'EMAIL' else null end),
    'is_legacy_authenticated', v_is_legacy_authenticated,
    'identity_integrity_valid', v_identity_integrity_valid,
    'gameplay_authorized', (
      v_has_profile
      and v_identity_integrity_valid
      and (
        (v_auth_method is not null and v_tutorial_step = 'AUTHENTICATION')
        or v_is_legacy_authenticated
      )
    )
  );
end;
$$;

revoke all on function public.get_current_onboarding_state() from public;
grant execute on function public.get_current_onboarding_state() to authenticated;
