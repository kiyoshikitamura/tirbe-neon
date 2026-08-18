-- Development-only diagnostic for Google linking failures.
-- A single result set is used because the Dashboard SQL Editor displays only
-- the final SELECT result. This script does not modify data.

with google_identities as (
  select
    'GOOGLE_IDENTITY'::text as record_type,
    auth_user.id as auth_user_id,
    auth_user.email as auth_email,
    identity.identity_data ->> 'email' as identity_email,
    identity.provider,
    game_user.username,
    (game_user.id is not null) as has_game_profile,
    progress.step_id as tutorial_step,
    method.auth_method,
    auth_user.created_at,
    auth_user.last_sign_in_at
  from auth.identities identity
  join auth.users auth_user on auth_user.id = identity.user_id
  left join public.users game_user on game_user.id = auth_user.id
  left join public.tutorial_progress progress on progress.user_id = auth_user.id
  left join public.user_account_auth_methods method on method.user_id = auth_user.id
  where identity.provider = 'google'
  order by auth_user.created_at desc
  limit 25
), pending_profiles as (
  select
    'PENDING_PROFILE'::text as record_type,
    auth_user.id as auth_user_id,
    auth_user.email as auth_email,
    null::text as identity_email,
    auth_user.raw_app_meta_data ->> 'provider' as provider,
    game_user.username,
    true as has_game_profile,
    progress.step_id as tutorial_step,
    method.auth_method,
    auth_user.created_at,
    auth_user.last_sign_in_at
  from public.tutorial_progress progress
  join public.users game_user on game_user.id = progress.user_id
  join auth.users auth_user on auth_user.id = progress.user_id
  left join public.user_account_auth_methods method on method.user_id = progress.user_id
  where progress.step_id = 'COMPLETE'
  order by progress.updated_at desc
  limit 25
)
select * from google_identities
union all
select * from pending_profiles
order by created_at desc;
