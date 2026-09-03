begin;

do $$
declare
  v_season_id uuid;
  v_character_id text;
  v_user_1 uuid:=gen_random_uuid();
  v_user_2 uuid:=gen_random_uuid();
  v_user_3 uuid:=gen_random_uuid();
  v_guild_1 uuid:=gen_random_uuid();
  v_guild_2 uuid:=gen_random_uuid();
  v_guild_3 uuid:=gen_random_uuid();
  v_owned_1 uuid:=gen_random_uuid();
  v_owned_2 uuid:=gen_random_uuid();
  v_owned_3 uuid:=gen_random_uuid();
  v_other_seasons_before jsonb;
  v_other_seasons_after jsonb;
  v_snapshot_power bigint;
  v_current_power bigint;
  v_result jsonb;
  v_grant_count integer;
begin
  select master.season_id into strict v_season_id
  from public.ranking_guild_power_season_master master
  where master.event_key='PREOPEN_GUILD_POWER_2026';

  select battle.character_id into strict v_character_id
  from public.character_battle_master battle
  join public.character_growth_patterns growth on growth.pattern_id=battle.growth_pattern_id
  where growth.base_hp+growth.base_atk+growth.base_def>0
    and growth.hp_gain+growth.atk_gain+growth.def_gain>0
  order by battle.character_id limit 1;

  select coalesce(jsonb_agg(to_jsonb(season) order by season.id),'[]'::jsonb)
  into v_other_seasons_before
  from public.ranking_seasons season where season.ranking_type<>'GUILD_POWER';

  -- Isolate existing guilds from this rollback-only fixture without guessing IDs.
  insert into public.ranking_guild_exclusions(guild_id,reason)
  select guild.id,'DB_CONTRACT_EXISTING' from public.guilds guild
  on conflict(guild_id) do nothing;

  insert into public.users(id,username) values
    (v_user_1,'DBCT-A'),(v_user_2,'DBCT-B'),(v_user_3,'DBCT-C');
  insert into public.guilds(id,name,leader_id) values
    (v_guild_1,'DBCT-G1',v_user_1),(v_guild_2,'DBCT-G2',v_user_2),(v_guild_3,'DBCT-G3',v_user_3);
  insert into public.guild_members(guild_id,user_id,role) values
    (v_guild_1,v_user_1,'MASTER'),(v_guild_2,v_user_2,'MASTER'),(v_guild_3,v_user_3,'MASTER');
  insert into public.user_characters(id,user_id,character_id,level) values
    (v_owned_1,v_user_1,v_character_id,2),
    (v_owned_2,v_user_2,v_character_id,2),
    (v_owned_3,v_user_3,v_character_id,1);
  insert into public.user_main_formations(user_id,slot,user_character_id) values
    (v_user_1,1,v_owned_1),(v_user_2,1,v_owned_2),(v_user_3,1,v_owned_3);

  -- Move this transaction's boundary into the past. The next Power mutation
  -- must synchronously finalize before applying that mutation.
  update public.ranking_seasons
  set starts_at=clock_timestamp()-interval '2 days',
      ends_at=clock_timestamp()-interval '1 second',status='ACTIVE'
  where id=v_season_id;
  update public.ranking_guild_power_season_master
  set starts_at=clock_timestamp()-interval '2 days',
      ends_at=clock_timestamp()-interval '1 second'
  where season_id=v_season_id;

  update public.user_characters set level=3 where id=v_owned_1;

  if not exists(select 1 from public.ranking_guild_power_finalization_audits
                where season_id=v_season_id) then
    raise exception 'cutoff mutation did not synchronously finalize';
  end if;
  select total_power into strict v_snapshot_power
  from public.ranking_guild_power_season_snapshots
  where season_id=v_season_id and guild_id=v_guild_1;
  v_current_power:=public.calculate_user_total_power(v_user_1);
  if v_snapshot_power>=v_current_power then
    raise exception 'post-cutoff character growth leaked into final snapshot';
  end if;

  if (select array_agg(rank_position order by rank_position,guild_id)
      from public.ranking_guild_power_season_snapshots
      where season_id=v_season_id)<>array[1,1,3] then
    raise exception 'competition ranks are not 1,1,3';
  end if;

  if (select count(*) from public.ranking_guild_power_reward_grants
      where season_id=v_season_id and cosmetic_id='guild_preopen_2026_participation')<>3
     or (select count(*) from public.ranking_guild_power_reward_grants
         where season_id=v_season_id and cosmetic_id='guild_preopen_2026_rank_1')<>2
     or (select count(*) from public.ranking_guild_power_reward_grants
         where season_id=v_season_id and cosmetic_id='guild_preopen_2026_rank_3')<>1
     or exists(select 1 from public.ranking_guild_power_reward_grants
               where season_id=v_season_id and cosmetic_id='guild_preopen_2026_rank_2') then
    raise exception 'participation plus tied top-three rewards are incorrect';
  end if;
  if (select count(*) from public.ranking_reward_notifications notification
      where notification.period_kind='SEASON' and notification.period_key=v_season_id::text
        and notification.recipient_user_id in(v_user_1,v_user_2,v_user_3))<>3 then
    raise exception 'guild result notifications were not issued';
  end if;

  select count(*) into v_grant_count from public.ranking_guild_power_reward_grants
  where season_id=v_season_id;
  v_result:=public.finalize_preopen_guild_power_season();
  if v_result->>'status'<>'ALREADY_FINALIZED'
     or (select count(*) from public.ranking_guild_power_reward_grants
         where season_id=v_season_id)<>v_grant_count then
    raise exception 'finalizer retry is not idempotent';
  end if;
  if exists(select 1 from cron.job
            where jobname='preopen-guild-power-finalize-20260909-jst') then
    raise exception 'successful finalizer did not unschedule its cron';
  end if;

  begin
    insert into public.ranking_guild_power_season_snapshots(
      season_id,guild_id,guild_name,total_power,member_count,rank_position
    ) values(v_season_id,gen_random_uuid(),'LATE INSERT',1,1,99);
    raise exception 'final snapshot accepted a post-finalization insert';
  exception when sqlstate '55000' then null;
  end;

  delete from public.guilds where id=v_guild_3;
  if exists(select 1 from public.ranking_guild_power_reward_grants where guild_id=v_guild_3)
     or exists(select 1 from public.guild_cosmetics where guild_id=v_guild_3) then
    raise exception 'guild-owned cosmetic rights survived guild deletion';
  end if;
  if not exists(select 1 from public.ranking_guild_power_season_snapshots
                where season_id=v_season_id and guild_id=v_guild_3) then
    raise exception 'immutable historical snapshot was deleted with guild';
  end if;

  select coalesce(jsonb_agg(to_jsonb(season) order by season.id),'[]'::jsonb)
  into v_other_seasons_after
  from public.ranking_seasons season where season.ranking_type<>'GUILD_POWER';
  if v_other_seasons_after<>v_other_seasons_before then
    raise exception 'non-GUILD_POWER ranking seasons were changed';
  end if;
end;
$$;

rollback;
