-- Phase 4 final remediation: identify the existing 24-hour Guild join cooldown
-- consistently for direct joins and approval applications.

begin;

create or replace function public.join_guild(p_guild_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_cap integer;
  v_count integer;
  v_user public.users%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select * into v_user from public.users where id = auth.uid() for update;
  if not found then raise exception 'Guild joining requirements are not met'; end if;
  if v_user.last_guild_left_at is not null and v_user.last_guild_left_at > now() - interval '24 hours' then
    raise exception 'Guild rejoin cooldown is active'
      using errcode = 'P0001', detail = 'GUILD_JOIN_COOLDOWN_ACTIVE';
  end if;
  if exists(select 1 from public.guild_members where user_id = auth.uid()) then raise exception 'Already in a guild'; end if;
  select recruitment_mode, public.canonical_guild_member_cap(id)
    into v_mode, v_cap
  from public.guilds
  where id = p_guild_id and not is_disbanded
  for update;
  if not found then raise exception 'Guild not found'; end if;
  if v_mode <> 'OPEN_JOIN' then raise exception 'Guild does not accept direct joins'; end if;
  select count(*) into v_count from public.guild_members where guild_id = p_guild_id;
  if v_count >= v_cap then raise exception 'Guild member cap reached'; end if;
  insert into public.guild_members(guild_id, user_id, role, weekly_contribution, total_contribution)
  values(p_guild_id, auth.uid(), 'MEMBER', 0, 0);
  update public.guild_join_requests
  set status = 'CANCELLED', reviewed_at = now(), reviewed_by = auth.uid()
  where user_id = auth.uid() and status = 'PENDING';
  perform public.evaluate_mission_progress(auth.uid(), 'GUILD_JOIN', 1);
  return jsonb_build_object('status', 'success');
end;
$$;

create or replace function public.request_guild_join(p_guild_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_cap integer;
  v_count integer;
  v_request uuid;
  v_user public.users%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select * into v_user from public.users where id = auth.uid() for update;
  if not found then raise exception 'Guild application requirements are not met'; end if;
  if v_user.last_guild_left_at is not null and v_user.last_guild_left_at > now() - interval '24 hours' then
    raise exception 'Guild rejoin cooldown is active'
      using errcode = 'P0001', detail = 'GUILD_JOIN_COOLDOWN_ACTIVE';
  end if;
  if exists(select 1 from public.guild_members where user_id = auth.uid()) then raise exception 'Already in a guild'; end if;
  select recruitment_mode, public.canonical_guild_member_cap(id)
    into v_mode, v_cap
  from public.guilds
  where id = p_guild_id and not is_disbanded
  for update;
  if not found or v_mode <> 'APPLICATION_REQUIRED' then raise exception 'Guild is not accepting applications'; end if;
  select count(*) into v_count from public.guild_members where guild_id = p_guild_id;
  if v_count >= v_cap then raise exception 'Guild member cap reached'; end if;
  if exists(select 1 from public.guild_join_requests where user_id = auth.uid() and status = 'PENDING') then
    raise exception 'A pending guild application already exists';
  end if;
  insert into public.guild_join_requests(guild_id, user_id)
  values(p_guild_id, auth.uid())
  returning id into v_request;
  return jsonb_build_object('status', 'pending', 'request_id', v_request);
end;
$$;

notify pgrst, 'reload schema';

commit;
