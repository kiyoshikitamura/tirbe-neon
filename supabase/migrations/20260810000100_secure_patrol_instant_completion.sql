-- Secure, production-compatible patrol instant completion.
drop function if exists public.complete_patrol_instantly(uuid, uuid, text);

create function public.complete_patrol_instantly(
  p_user_id uuid,
  p_patrol_id uuid,
  p_use_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_currency text := upper(coalesce(p_use_currency, ''));
  v_patrol_status text;
  v_cash bigint;
  v_diamonds integer;
  v_tutorial_step text;
begin
  if v_auth_user_id is null or v_auth_user_id <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select patrol.status
  into v_patrol_status
  from public.user_patrols patrol
  where patrol.id = p_patrol_id and patrol.user_id = v_auth_user_id
  for update;

  if v_patrol_status is null then
    raise exception 'patrol not found' using errcode = 'P0002';
  end if;
  if v_patrol_status <> 'ONGOING' then
    raise exception 'patrol is not eligible for instant completion' using errcode = '23514';
  end if;

  if v_currency = 'CASH' then
    select cash into v_cash from public.users where id = v_auth_user_id for update;
    if coalesce(v_cash, 0) < 1000 then
      raise exception 'cash insufficient' using errcode = '23514';
    end if;
    update public.users set cash = cash - 1000 where id = v_auth_user_id;
  elsif v_currency = 'DIAMOND' then
    select neon_diamonds into v_diamonds from public.users where id = v_auth_user_id for update;
    if coalesce(v_diamonds, 0) < 50 then
      raise exception 'diamond insufficient' using errcode = '23514';
    end if;
    update public.users set neon_diamonds = neon_diamonds - 50 where id = v_auth_user_id;
  elsif v_currency = 'FREE_TUTORIAL' then
    if to_regclass('public.tutorial_progress') is null then
      raise exception 'tutorial free instant completion is unavailable' using errcode = '55000';
    end if;
    execute 'select progress.step_id from public.tutorial_progress progress where progress.user_id = $1 for update'
      into v_tutorial_step
      using v_auth_user_id;
    if v_tutorial_step <> 'FREE_INSTANT' then
      raise exception 'tutorial free instant completion is unavailable' using errcode = '55000';
    end if;
  else
    raise exception 'invalid patrol instant completion currency' using errcode = '22023';
  end if;

  update public.user_patrols
  set status = 'CLAIMABLE', expires_at = now()
  where id = p_patrol_id and user_id = v_auth_user_id;

  return jsonb_build_object(
    'status', 'success',
    'patrol_id', p_patrol_id,
    'currency', v_currency,
    'cash_cost', case when v_currency = 'CASH' then 1000 else 0 end,
    'diamond_cost', case when v_currency = 'DIAMOND' then 50 else 0 end
  );
end;
$$;

revoke all on function public.complete_patrol_instantly(uuid, uuid, text) from public;
grant execute on function public.complete_patrol_instantly(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
