with function_contract as (
  select
    count(*) filter (where procedure.prosecdef) as security_definer_count,
    count(*) filter (where procedure.proconfig @> array['search_path=public']) as fixed_search_path_count,
    count(*) filter (where has_function_privilege('authenticated', procedure.oid, 'EXECUTE')) as authenticated_execute_count,
    count(*) filter (where has_function_privilege('anon', procedure.oid, 'EXECUTE')) as anon_execute_count,
    count(*) filter (where has_function_privilege('public', procedure.oid, 'EXECUTE')) as public_execute_count,
    bool_and(position('insert into public.user_characters' in lower(pg_get_functiondef(procedure.oid))) = 0) as zero_roster_definition,
    bool_and(position('null' in lower(pg_get_functiondef(procedure.oid))) > 0) as nullable_favorite_definition
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'initialize_current_player'
    and pg_get_function_identity_arguments(procedure.oid) = 'p_username text'
), favorite_contract as (
  select column_default, is_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'users'
    and column_name = 'favorite_character_id'
)
select 10 as display_order, 'function:initialize_current_player(text)' as check_name,
  case when security_definer_count = 1 then 'PASS' else 'FAIL' end as status,
  security_definer_count || '/1 SECURITY DEFINER function(s)' as detail
from function_contract
union all
select 20, 'security_definer_and_search_path',
  case when security_definer_count = 1 and fixed_search_path_count = 1 then 'PASS' else 'FAIL' end,
  fixed_search_path_count || '/1 fixed search_path function(s)'
from function_contract
union all
select 30, 'authenticated_execute_only',
  case when authenticated_execute_count = 1 and anon_execute_count = 0 and public_execute_count = 0 then 'PASS' else 'FAIL' end,
  format('authenticated=%s, anon=%s, public=%s', authenticated_execute_count, anon_execute_count, public_execute_count)
from function_contract
union all
select 40, 'fresh_roster_grant_removed',
  case when zero_roster_definition then 'PASS' else 'FAIL' end,
  case when zero_roster_definition then 'initializer does not insert user_characters' else 'starter character insert remains' end
from function_contract
union all
select 50, 'favorite_character_nullable_without_default',
  case when is_nullable = 'YES' and column_default is null then 'PASS' else 'FAIL' end,
  format('nullable=%s, default=%s', is_nullable, coalesce(column_default, 'NULL'))
from favorite_contract
order by display_order;
