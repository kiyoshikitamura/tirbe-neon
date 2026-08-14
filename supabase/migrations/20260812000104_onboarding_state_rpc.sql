-- Open Beta M1: expose one authoritative onboarding state for the current user.
-- Existing authenticated players are kept playable without granting tutorial
-- rewards again; they can be backfilled separately after the release gate.
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

  if not v_is_anonymous and v_auth_method is null then
    select case identity.provider
      when 'google' then 'GOOGLE'
      when 'email' then 'EMAIL'
      else null
    end
      into v_identity_provider
    from auth.identities identity
    where identity.user_id = v_user_id
      and identity.provider in ('google', 'email')
    order by identity.created_at
    limit 1;
  end if;

  v_is_legacy_authenticated :=
    not v_is_anonymous
    and v_has_profile
    and v_auth_method is null
    and v_identity_provider is not null
    -- A linked identity at COMPLETE is an in-flight Open Beta onboarding,
    -- not a legacy account. It must finish the audited RPC first.
    and (v_tutorial_step is null or v_tutorial_step = 'AUTHENTICATION');

  return jsonb_build_object(
    'user_id', v_user_id,
    'is_anonymous', v_is_anonymous,
    'has_profile', v_has_profile,
    'tutorial_step', v_tutorial_step,
    'auth_method', coalesce(v_auth_method, v_identity_provider),
    'is_legacy_authenticated', v_is_legacy_authenticated,
    'gameplay_authorized', (
      v_has_profile
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
