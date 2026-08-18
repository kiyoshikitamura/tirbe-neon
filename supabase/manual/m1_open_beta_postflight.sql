-- Run only in the Development project: vosbyukxmskvisbgleug.
-- Read-only verification after applying 20260812000105 and 107.

with functions as (
  select procedure.proname,
         procedure.prosecdef,
         procedure.proconfig,
         pg_get_function_identity_arguments(procedure.oid) as arguments,
         has_function_privilege('authenticated', procedure.oid, 'EXECUTE') as authenticated_execute,
         has_function_privilege('anon', procedure.oid, 'EXECUTE') as anon_execute
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'get_current_onboarding_state',
      'initialize_current_player',
      'complete_tutorial_authentication'
    )
), legacy_overload as (
  select count(*) filter (
    where has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ) as executable_count
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'initialize_new_user'
    and pg_get_function_identity_arguments(procedure.oid) = 'p_user_id uuid, p_username text, p_character_id text, p_area_id text, p_gift_code text, p_gender text, p_hair_id text, p_face_id text'
)
select 10 as display_order,
       'function:get_current_onboarding_state' as check_name,
       case when count(*) = 1 then 'PASS' else 'FAIL' end as status,
       count(*)::text || ' matching overload(s)' as detail
from functions where proname = 'get_current_onboarding_state' and arguments = ''
union all
select 20,
       'function:initialize_current_player(text)',
       case when count(*) = 1 then 'PASS' else 'FAIL' end,
       count(*)::text || ' matching overload(s)'
from functions where proname = 'initialize_current_player' and arguments = 'p_username text'
union all
select 30,
       'function:complete_tutorial_authentication(text)',
       case when count(*) = 1 then 'PASS' else 'FAIL' end,
       count(*)::text || ' matching overload(s)'
from functions where proname = 'complete_tutorial_authentication' and arguments = 'p_auth_method text'
union all
select 40,
       'security_definer_and_search_path',
       case when count(*) = 3 then 'PASS' else 'FAIL' end,
       count(*)::text || '/3 hardened function(s)'
from functions
where prosecdef is true and proconfig @> array['search_path=public']
union all
select 50,
       'authenticated_execute',
       case when count(*) = 3 then 'PASS' else 'FAIL' end,
       count(*)::text || '/3 function(s) executable'
from functions where authenticated_execute is true
union all
select 60,
       'anon_execute_denied',
       case when count(*) = 0 then 'PASS' else 'FAIL' end,
       count(*)::text || '/3 function(s) unexpectedly executable'
from functions where anon_execute is true
union all
select 70,
       'legacy_initializer_execute_denied',
       case when executable_count = 0 then 'PASS' else 'FAIL' end,
       executable_count::text || ' legacy overload(s) executable by authenticated'
from legacy_overload
union all
select 80,
       'normalized_username_unique_index',
       case when to_regclass('public.users_username_normalized_uidx') is not null then 'PASS' else 'FAIL' end,
       coalesce(to_regclass('public.users_username_normalized_uidx')::text, 'missing')
order by display_order;
