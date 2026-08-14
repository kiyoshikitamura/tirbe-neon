-- Open Beta M2: authoritative patrol instant-completion pricing.
-- CASH: 100 per remaining minute (rounded up), max 3 uses per JST day.
-- DIAMOND: 10 per remaining hour (rounded up), unlimited uses.

alter table public.users
  add column if not exists daily_cash_skips_reset_date date;

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
  v_expires_at timestamptz;
  v_remaining_seconds integer;
  v_cash_cost bigint := 0;
  v_diamond_cost integer := 0;
  v_cash bigint;
  v_diamonds integer;
  v_cash_skips integer;
  v_cash_reset_date date;
  v_today_jst date := (now() at time zone 'Asia/Tokyo')::date;
  v_tutorial_step text;
  v_next_tutorial_step text;
begin
  if v_auth_user_id is null or v_auth_user_id <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select patrol.status, patrol.expires_at
  into v_patrol_status, v_expires_at
  from public.user_patrols patrol
  where patrol.id = p_patrol_id
    and patrol.user_id = v_auth_user_id
  for update;

  if v_patrol_status is null then
    raise exception 'patrol not found' using errcode = 'P0002';
  end if;
  if v_patrol_status <> 'ONGOING' then
    raise exception 'patrol is not eligible for instant completion' using errcode = '23514';
  end if;

  v_remaining_seconds := greatest(ceil(extract(epoch from (v_expires_at - now())))::integer, 0);

  if v_currency = 'CASH' then
    v_cash_cost := ceil(v_remaining_seconds::numeric / 60)::bigint * 100;

    select cash, coalesce(daily_cash_skips_count, 0), daily_cash_skips_reset_date
    into v_cash, v_cash_skips, v_cash_reset_date
    from public.users
    where id = v_auth_user_id
    for update;

    if v_cash_reset_date is distinct from v_today_jst then
      v_cash_skips := 0;
    end if;
    if v_remaining_seconds > 0 and v_cash_skips >= 3 then
      raise exception 'daily cash instant completion limit reached' using errcode = '23514';
    end if;
    if coalesce(v_cash, 0) < v_cash_cost then
      raise exception 'cash insufficient' using errcode = '23514';
    end if;

    update public.users
    set cash = cash - v_cash_cost,
        daily_cash_skips_count = case when v_remaining_seconds > 0 then v_cash_skips + 1 else v_cash_skips end,
        daily_cash_skips_reset_date = v_today_jst
    where id = v_auth_user_id;
  elsif v_currency = 'DIAMOND' then
    v_diamond_cost := ceil(v_remaining_seconds::numeric / 3600)::integer * 10;

    select neon_diamonds into v_diamonds
    from public.users
    where id = v_auth_user_id
    for update;

    if coalesce(v_diamonds, 0) < v_diamond_cost then
      raise exception 'diamond insufficient' using errcode = '23514';
    end if;
    update public.users
    set neon_diamonds = neon_diamonds - v_diamond_cost
    where id = v_auth_user_id;
  elsif v_currency = 'FREE_TUTORIAL' then
    select progress.step_id
    into v_tutorial_step
    from public.tutorial_progress progress
    where progress.user_id = v_auth_user_id
    for update;

    if v_tutorial_step <> 'FREE_INSTANT' then
      raise exception 'tutorial free instant completion is unavailable' using errcode = '55000';
    end if;
    v_next_tutorial_step := 'TUTORIAL_BATTLE';
  else
    raise exception 'invalid patrol instant completion currency' using errcode = '22023';
  end if;

  update public.user_patrols
  set status = 'CLAIMABLE', expires_at = now()
  where id = p_patrol_id and user_id = v_auth_user_id;

  if v_next_tutorial_step is not null then
    update public.tutorial_progress
    set step_id = v_next_tutorial_step,
        updated_at = now()
    where user_id = v_auth_user_id
      and step_id = 'FREE_INSTANT';

    if not found then
      raise exception 'tutorial progress changed during instant completion' using errcode = '40001';
    end if;
  end if;

  return jsonb_build_object(
    'status', 'success',
    'patrol_id', p_patrol_id,
    'currency', v_currency,
    'cash_cost', v_cash_cost,
    'diamond_cost', v_diamond_cost,
    'daily_cash_skips_count', case
      when v_currency = 'CASH' then case when v_remaining_seconds > 0 then v_cash_skips + 1 else v_cash_skips end
      else null
    end,
    'daily_cash_skips_reset_date', case when v_currency = 'CASH' then v_today_jst else null end,
    'tutorial_step', v_next_tutorial_step
  );
end;
$$;

revoke all on function public.complete_patrol_instantly(uuid, uuid, text) from public;
revoke all on function public.complete_patrol_instantly(uuid, uuid, text) from anon;
grant execute on function public.complete_patrol_instantly(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
