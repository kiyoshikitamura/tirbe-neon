begin;

do $test$
declare
  v_leader uuid := '53000000-0000-4000-8000-000000000001';
  v_recent uuid := '53000000-0000-4000-8000-000000000002';
  v_expired uuid := '53000000-0000-4000-8000-000000000003';
  v_open uuid := '53000000-0000-4000-8000-000000000011';
  v_apply uuid := '53000000-0000-4000-8000-000000000012';
  v_created uuid;
  v_detail text;
begin
  insert into public.users(id, username, level, xp, cash)
  values(v_leader, 'leaduser', 10, 0, 10000);
  insert into public.guilds(id, name, leader_id, recruitment_mode, approval_required)
  values
    (v_open, 'OPEN24', v_leader, 'OPEN_JOIN', false),
    (v_apply, 'APPLY24', v_leader, 'APPLICATION_REQUIRED', true);
  insert into public.guild_members(guild_id, user_id, role, weekly_contribution, total_contribution)
  values(v_open, v_leader, 'MASTER', 0, 0);

  insert into public.users(id, username, level, xp, cash, last_guild_left_at)
  values(v_recent, 'recent24', 5, 0, 10000, now());
  perform set_config('request.jwt.claim.sub', v_recent::text, true);

  begin
    perform public.join_guild(v_open);
    raise exception 'Recent direct join unexpectedly succeeded' using errcode = 'P0002';
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_detail = pg_exception_detail;
    if v_detail <> 'GUILD_JOIN_COOLDOWN_ACTIVE' then raise; end if;
  end;
  if exists(select 1 from public.guild_members where user_id = v_recent) then
    raise exception 'Cooldown direct join created membership';
  end if;

  begin
    perform public.request_guild_join(v_apply);
    raise exception 'Recent application unexpectedly succeeded' using errcode = 'P0002';
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_detail = pg_exception_detail;
    if v_detail <> 'GUILD_JOIN_COOLDOWN_ACTIVE' then raise; end if;
  end;
  if exists(select 1 from public.guild_join_requests where user_id = v_recent) then
    raise exception 'Cooldown application created request';
  end if;

  v_created := (public.create_guild_v2(v_recent, 'CREATE24', 5000)->>'guild_id')::uuid;
  if not exists(select 1 from public.guild_members where guild_id = v_created and user_id = v_recent and role = 'MASTER') then
    raise exception 'Cooldown incorrectly blocked Guild creation';
  end if;

  insert into public.users(id, username, level, xp, cash, last_guild_left_at)
  values(v_expired, 'oldleave', 5, 0, 10000, now() - interval '25 hours');
  perform set_config('request.jwt.claim.sub', v_expired::text, true);
  perform public.join_guild(v_open);
  if not exists(select 1 from public.guild_members where guild_id = v_open and user_id = v_expired) then
    raise exception 'Expired cooldown did not allow direct join';
  end if;
end;
$test$;

rollback;
