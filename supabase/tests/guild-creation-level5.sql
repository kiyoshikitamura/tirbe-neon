begin;

do $test$
declare
  v_user uuid;
  v_guild uuid;
  v_cash bigint;
  v_count integer;
  v_message text;
begin
  -- Lv4 is denied and no state changes.
  v_user := '52000000-0000-4000-8000-000000000004';
  insert into public.users(id, username, level, xp, cash, last_guild_left_at)
  values(v_user, 'guild-lv4', 4, 0, 10000, null);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  begin
    perform public.create_guild_v2(v_user, 'LV4 DENY', 5000);
    raise exception 'Lv4 creation unexpectedly succeeded' using errcode = 'P0002';
  exception when sqlstate 'P0001' then null; end;
  select cash into v_cash from public.users where id = v_user;
  if v_cash <> 10000 then raise exception 'Lv4 denial changed CASH'; end if;

  -- Lv5 with insufficient CASH is denied.
  v_user := '52000000-0000-4000-8000-000000000005';
  insert into public.users(id, username, level, xp, cash, last_guild_left_at)
  values(v_user, 'guild-low-cash', 5, 0, 4999, null);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  begin
    perform public.create_guild_v2(v_user, 'LOW CASH', 5000);
    raise exception 'Low-CASH creation unexpectedly succeeded' using errcode = 'P0002';
  exception when sqlstate 'P0001' then null; end;

  -- Recent Guild leave does not block creation under the Lv5 contract.
  v_user := '52000000-0000-4000-8000-000000000006';
  insert into public.users(id, username, level, xp, cash, last_guild_left_at)
  values(v_user, 'guild-lv5', 5, 0, 5000, now());
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  v_guild := (public.create_guild_v2(v_user, 'LV5 SUCCESS', 5000)->>'guild_id')::uuid;
  select cash into v_cash from public.users where id = v_user;
  if v_cash <> 0 then raise exception 'Creation did not deduct exactly 5,000 CASH'; end if;
  if not exists(select 1 from public.guilds where id = v_guild and leader_id = v_user) then
    raise exception 'Creator is not Guild leader';
  end if;
  if not exists(select 1 from public.guild_members where guild_id = v_guild and user_id = v_user and role = 'MASTER') then
    raise exception 'Creator MASTER membership is missing';
  end if;

  -- Retry is idempotently rejected without another debit or Guild.
  begin
    perform public.create_guild_v2(v_user, 'LV5 RETRY', 5000);
    raise exception 'Duplicate creation unexpectedly succeeded' using errcode = 'P0002';
  exception when sqlstate '23505' then null; end;
  select count(*) into v_count from public.guilds where leader_id = v_user;
  if v_count <> 1 then raise exception 'Duplicate Guild was created'; end if;
  select cash into v_cash from public.users where id = v_user;
  if v_cash <> 0 then raise exception 'Retry changed CASH'; end if;

  -- Existing membership is denied even at Lv5 with sufficient CASH.
  v_user := '52000000-0000-4000-8000-000000000007';
  insert into public.users(id, username, level, xp, cash, guild_id)
  values(v_user, 'guild-member', 5, 0, 10000, v_guild);
  insert into public.guild_members(guild_id, user_id, role) values(v_guild, v_user, 'MEMBER');
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  begin
    perform public.create_guild_v2(v_user, 'MEMBER DENY', 5000);
    raise exception 'Affiliated creation unexpectedly succeeded' using errcode = 'P0002';
  exception when sqlstate '23505' then null; end;

  -- A forced downstream failure rolls back Guild, membership, and CASH.
  v_user := '52000000-0000-4000-8000-000000000008';
  insert into public.users(id, username, level, xp, cash)
  values(v_user, 'guild-rollback', 5, 0, 5000);
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  begin
    perform public.create_guild_v2(v_user, 'ROLLBACK TEST', 5000);
    raise exception 'forced rollback';
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_message = message_text;
    if v_message <> 'forced rollback' then raise; end if;
  end;
  select cash into v_cash from public.users where id = v_user;
  if v_cash <> 5000 or exists(select 1 from public.guilds where leader_id = v_user)
     or exists(select 1 from public.guild_members where user_id = v_user) then
    raise exception 'Forced failure did not roll back atomically';
  end if;
end;
$test$;

rollback;
