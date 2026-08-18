-- Emergency rollback for migrations 20260812000104 through 107.
-- Run only together with a frontend rollback, in Development project
-- vosbyukxmskvisbgleug. These migrations do not delete or rewrite player rows.

begin;

drop function if exists public.get_current_onboarding_state();
drop function if exists public.initialize_current_player(text);
drop index if exists public.users_username_normalized_uidx;

create or replace function public.complete_tutorial_authentication(p_auth_method text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  if p_auth_method not in ('EMAIL', 'GOOGLE') then raise exception 'Unsupported authentication method'; end if;
  if not exists (
    select 1 from auth.identities
    where user_id = v_user_id and provider = lower(p_auth_method)
  ) then raise exception 'Requested authentication identity is not linked'; end if;
  if not exists (
    select 1 from public.tutorial_progress where user_id = v_user_id and step_id = 'COMPLETE'
  ) then raise exception 'Tutorial completion is required'; end if;
  if exists (select 1 from public.user_account_auth_methods where user_id = v_user_id) then
    raise exception 'An authentication method is already linked';
  end if;
  insert into public.user_account_auth_methods (user_id, auth_method)
  values (v_user_id, p_auth_method);
  update public.tutorial_progress
  set step_id = 'AUTHENTICATION', updated_at = now()
  where user_id = v_user_id;
  return 'AUTHENTICATION';
end;
$$;

revoke all on function public.complete_tutorial_authentication(text) from public;
grant execute on function public.complete_tutorial_authentication(text) to authenticated;
grant execute on function public.initialize_new_user(uuid, text, text, text, text, text, text, text) to authenticated;

commit;
