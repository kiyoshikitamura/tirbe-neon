-- Development-only verification for the M1 Google re-login E2E.
-- Read-only: safe to run before and after logging out/in.

with target as (
  select 'fa8e811c-f75a-4231-9927-9532a6eed9cf'::uuid as user_id
), identity_summary as (
  select
    identity.user_id,
    count(*) filter (where identity.provider in ('google', 'email')) as supported_identity_count,
    jsonb_agg(identity.provider order by identity.provider)
      filter (where identity.provider in ('google', 'email')) as providers
  from auth.identities identity
  join target on target.user_id = identity.user_id
  group by identity.user_id
)
select
  target.user_id,
  auth_user.email,
  auth_user.is_anonymous,
  auth_user.last_sign_in_at,
  game_user.username,
  progress.step_id as tutorial_step,
  method.auth_method,
  coalesce(identity_summary.supported_identity_count, 0) as supported_identity_count,
  coalesce(identity_summary.providers, '[]'::jsonb) as providers,
  (game_user.id is not null) as has_game_profile,
  case
    when auth_user.id is null then 'FAIL: auth user missing'
    when game_user.id is null then 'FAIL: game profile missing'
    when auth_user.is_anonymous then 'FAIL: still anonymous'
    when progress.step_id <> 'AUTHENTICATION' then 'FAIL: tutorial not finalized'
    when method.auth_method <> 'GOOGLE' then 'FAIL: Google method not recorded'
    when coalesce(identity_summary.supported_identity_count, 0) <> 1 then 'FAIL: invalid identity count'
    else 'PASS'
  end as verification_status
from target
left join auth.users auth_user on auth_user.id = target.user_id
left join public.users game_user on game_user.id = target.user_id
left join public.tutorial_progress progress on progress.user_id = target.user_id
left join public.user_account_auth_methods method on method.user_id = target.user_id
left join identity_summary on identity_summary.user_id = target.user_id;
