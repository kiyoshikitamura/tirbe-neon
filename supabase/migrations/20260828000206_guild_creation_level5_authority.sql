-- Phase 4 final remediation: Guild creation unlocks at User Lv5.
-- Creation is serialized per user and remains atomic with the 5,000 CASH debit.

begin;

update public.canonical_user_level_master
set unlock_keys = case when level = 5 then '["GUILD_CREATION"]'::jsonb else '[]'::jsonb end
where version = '2026-08-22' and level in (5, 8);

create or replace function public.create_guild_v2(
  p_user_id uuid,
  p_guild_name text,
  p_creation_cost integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_name text := trim(coalesce(p_guild_name, ''));
  v_guild uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Only the current user can create a guild' using errcode = '42501';
  end if;
  if char_length(v_name) not between 1 and 12 or p_creation_cost <> 5000 then
    raise exception 'Invalid guild creation request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into v_user from public.users where id = auth.uid() for update;
  if not found then
    raise exception 'Guild creation requirements are not met' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.guild_members where user_id = auth.uid())
     or v_user.guild_id is not null then
    raise exception 'Leave the current guild before creating another guild' using errcode = '23505';
  end if;
  if v_user.level < 5 or v_user.cash < 5000 then
    raise exception 'Guild creation requirements are not met' using errcode = 'P0001';
  end if;

  perform 1 from public.guilds
  where lower(trim(name)) = lower(v_name) and not is_disbanded
  for update;
  if found then
    raise exception 'Guild name is already in use' using errcode = '23505';
  end if;

  update public.guild_join_requests
  set status = 'CANCELLED', reviewed_at = now(), reviewed_by = auth.uid()
  where user_id = auth.uid() and status = 'PENDING';

  insert into public.guilds(
    name, leader_id, level, xp, funds, recruitment_mode, approval_required
  ) values (
    v_name, auth.uid(), 1, 0, 0, 'OPEN_JOIN', false
  ) returning id into v_guild;

  insert into public.guild_members(
    guild_id, user_id, role, weekly_contribution, total_contribution
  ) values (
    v_guild, auth.uid(), 'MASTER', 0, 0
  );

  update public.users
  set cash = cash - 5000, guild_id = v_guild
  where id = auth.uid();

  perform public.evaluate_mission_progress(auth.uid(), 'GUILD_JOIN', 1);
  return jsonb_build_object('status', 'success', 'guild_id', v_guild);
end;
$$;

revoke all on function public.create_guild_v2(uuid, text, integer) from public, anon;
grant execute on function public.create_guild_v2(uuid, text, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
