-- Run only in the Development project: vosbyukxmskvisbgleug.
-- Read-only preflight for migrations 20260812000104 through 107.
-- All checks intentionally return as one result set for the Dashboard editor.

with duplicate_usernames as (
  select count(*) as count
  from (
    select lower(btrim(username))
    from public.users
    group by lower(btrim(username))
    having count(*) > 1
  ) duplicates
), invalid_usernames as (
  select count(*) as count
  from public.users
  where char_length(btrim(username)) not between 1 and 8
), duplicate_characters as (
  select count(*) as count
  from (
    select user_id, character_id
    from public.user_characters
    group by user_id, character_id
    having count(*) > 1
  ) duplicates
), supported_identities as (
  select identity.user_id,
         count(distinct identity.provider) filter (where identity.provider in ('email', 'google')) as provider_count,
         min(identity.provider) filter (where identity.provider in ('email', 'google')) as provider
  from auth.identities identity
  group by identity.user_id
), inconsistent_auth_methods as (
  select count(*) as count
  from public.user_account_auth_methods methods
  left join supported_identities identities on identities.user_id = methods.user_id
  where coalesce(identities.provider_count, 0) <> 1
     or identities.provider <> lower(methods.auth_method)
)
select 10 as display_order,
       'required_table:tutorial_progress' as check_name,
       case when to_regclass('public.tutorial_progress') is not null then 'PASS' else 'FAIL' end as status,
       coalesce(to_regclass('public.tutorial_progress')::text, 'missing') as detail
union all
select 20,
       'required_table:user_account_auth_methods',
       case when to_regclass('public.user_account_auth_methods') is not null then 'PASS' else 'FAIL' end,
       coalesce(to_regclass('public.user_account_auth_methods')::text, 'missing')
union all
select 30,
       'required_index:user_characters(user_id,character_id)',
       case when to_regclass('public.user_characters_user_character_uidx') is not null then 'PASS' else 'FAIL' end,
       coalesce(to_regclass('public.user_characters_user_character_uidx')::text, 'missing')
union all
select 40,
       'duplicate_normalized_usernames',
       case when duplicate_usernames.count = 0 then 'PASS' else 'FAIL' end,
       duplicate_usernames.count::text || ' duplicate group(s)'
from duplicate_usernames
union all
select 50,
       'invalid_username_length',
       case when invalid_usernames.count = 0 then 'PASS' else 'WARN' end,
       invalid_usernames.count::text || ' existing row(s); existing accounts are retained'
from invalid_usernames
union all
select 60,
       'duplicate_owned_character_identity',
       case when duplicate_characters.count = 0 then 'PASS' else 'FAIL' end,
       duplicate_characters.count::text || ' duplicate group(s)'
from duplicate_characters
union all
select 70,
       'existing_auth_method_integrity',
       case when inconsistent_auth_methods.count = 0 then 'PASS' else 'WARN' end,
       inconsistent_auth_methods.count::text || ' account(s) will be blocked pending remediation'
from inconsistent_auth_methods
union all
select 80,
       'anonymous_auth_enabled',
       'MANUAL',
       'Confirm Authentication > Providers > Anonymous Sign-Ins is enabled'
union all
select 90,
       'manual_identity_linking_enabled',
       'MANUAL',
       'Confirm Authentication > Settings > Enable Manual Linking is enabled'
union all
select 100,
       'development_target',
       'MANUAL',
       'Confirm the Dashboard project ref is vosbyukxmskvisbgleug before applying SQL'
order by display_order;
