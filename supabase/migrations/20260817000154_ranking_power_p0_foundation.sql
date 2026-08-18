-- M9 Production Master: server-authoritative Ranking / Power P0 foundation.
-- Economy balance and ranking rewards are intentionally out of scope.

begin;

create table if not exists public.ranking_seasons (
  id uuid primary key default gen_random_uuid(),
  ranking_type text not null check (ranking_type in ('POWER','GUILD_POWER','PVP','GVG','RAID')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('PREPARING','ACTIVE','FINALIZING','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ranking_type, starts_at),
  check (ends_at > starts_at)
);
create unique index if not exists ranking_seasons_one_active_type_uidx
  on public.ranking_seasons(ranking_type) where status = 'ACTIVE';

-- Persist the first release season as data. Operators can configure an
-- irregular launch period by updating this row through a trusted path.
with boundary as (
  select
    date_trunc('month', clock_timestamp() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo' as starts_at,
    (date_trunc('month', clock_timestamp() at time zone 'Asia/Tokyo') + interval '1 month') at time zone 'Asia/Tokyo' as ends_at
)
insert into public.ranking_seasons(ranking_type, starts_at, ends_at, status)
select ranking_type, boundary.starts_at, boundary.ends_at, 'ACTIVE'
from boundary cross join (values ('POWER'::text),('GUILD_POWER'::text),('PVP'::text),('GVG'::text),('RAID'::text)) kinds(ranking_type)
where not exists (
  select 1 from public.ranking_seasons season
  where season.ranking_type = kinds.ranking_type and season.status = 'ACTIVE'
);

create table if not exists public.user_main_formations (
  user_id uuid not null references public.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  user_character_id uuid not null references public.user_characters(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot),
  unique (user_id, user_character_id)
);
create index if not exists user_main_formations_character_idx
  on public.user_main_formations(user_character_id);

-- Preserve the current representative party once, without coupling future
-- Main Formation edits to PvP Defense.
insert into public.user_main_formations(user_id, slot, user_character_id)
select deck.user_id, picked.slot, owned.id
from public.pvp_defense_decks deck
cross join lateral (values
  (1, deck.character_1_id), (2, deck.character_2_id), (3, deck.character_3_id),
  (4, deck.character_4_id), (5, deck.character_5_id)
) picked(slot, character_ref)
join lateral (
  select character_row.id
  from public.user_characters character_row
  where character_row.user_id = deck.user_id
    and (character_row.id::text = picked.character_ref or character_row.character_id = picked.character_ref)
  order by (character_row.id::text = picked.character_ref) desc
  limit 1
) owned on true
where picked.character_ref is not null
  and not exists (select 1 from public.user_main_formations current where current.user_id = deck.user_id)
on conflict do nothing;

create or replace function public.current_ranking_season_id(p_type text, p_at timestamptz default clock_timestamp())
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select season.id
  from public.ranking_seasons season
  where season.ranking_type = upper(p_type)
    and season.status = 'ACTIVE'
    and p_at >= season.starts_at and p_at < season.ends_at
  order by season.starts_at desc
  limit 1
$$;

create or replace function public.calculate_user_character_power(p_user_id uuid, p_user_character_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select owned.id, owned.character_id,
      floor((growth.base_hp + (owned.level - 1) * growth.hp_gain + coalesce(awake.hp_bonus, 0)) * master.rarity_multiplier)::bigint as hp,
      floor((growth.base_atk + (owned.level - 1) * growth.atk_gain + coalesce(awake.atk_bonus, 0)) * master.rarity_multiplier)::bigint as atk,
      floor((growth.base_def + (owned.level - 1) * growth.def_gain + coalesce(awake.def_bonus, 0)) * master.rarity_multiplier)::bigint as def
    from public.user_characters owned
    join public.character_battle_master master on master.character_id = owned.character_id
    join public.character_growth_patterns growth on growth.pattern_id = master.growth_pattern_id
    left join public.character_awakening_master awake on awake.awakening_level = owned.awakening_level
    where owned.user_id = p_user_id and owned.id = p_user_character_id
  ), equipment as (
    select
      coalesce(sum(floor(master.hp * (public.equipment_level_battle_scale(coalesce(owned.level,1)) + greatest(coalesce(owned.plus_val,0),0) * 0.10))),0)::bigint hp,
      coalesce(sum(floor(master.atk * (public.equipment_level_battle_scale(coalesce(owned.level,1)) + greatest(coalesce(owned.plus_val,0),0) * 0.10))),0)::bigint atk,
      coalesce(sum(floor(master.def * (public.equipment_level_battle_scale(coalesce(owned.level,1)) + greatest(coalesce(owned.plus_val,0),0) * 0.10))),0)::bigint def
    from base
    join public.user_equipments owned on owned.user_id = p_user_id and owned.equipped_character_id = base.id::text
    join public.equipment_battle_master master
      on master.equipment_id = coalesce(nullif(owned.equipment_id,''), owned.equipment_master_id)
     and (not master.is_exclusive or master.exclusive_character_id = base.character_id)
  )
  select coalesce((select base.hp + base.atk + base.def + equipment.hp + equipment.atk + equipment.def from base cross join equipment),0)
$$;

create or replace function public.calculate_user_total_power(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(public.calculate_user_character_power(formation.user_id, formation.user_character_id)),0)::bigint
  from public.user_main_formations formation
  where formation.user_id = p_user_id
$$;

create or replace function public.refresh_user_power_projection(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v_power bigint;
begin
  if p_user_id is null then return 0; end if;
  v_power := public.calculate_user_total_power(p_user_id);
  insert into public.user_power_rankings(user_id,total_power,updated_at)
  values(p_user_id,least(v_power,2147483647)::integer,clock_timestamp())
  on conflict(user_id) do update set total_power=excluded.total_power,updated_at=excluded.updated_at;
  return v_power;
end;
$$;

create or replace function public.refresh_all_user_power_projections()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare target record; refreshed integer := 0;
begin
  for target in
    select id user_id from public.users
  loop
    perform public.refresh_user_power_projection(target.user_id);
    refreshed := refreshed + 1;
  end loop;
  return refreshed;
end;
$$;

create or replace function public.save_main_formation(p_character_ids text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_requested text[] := coalesce(array_remove(p_character_ids,null),array[]::text[]);
  v_owned_ids uuid[];
  v_master_ids text[];
  v_power bigint;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if cardinality(v_requested) > 5 then raise exception 'main formation supports at most five characters' using errcode='22023'; end if;
  if cardinality(v_requested) <> (select count(distinct value) from unnest(v_requested) value) then
    raise exception 'main formation contains duplicate characters' using errcode='23505';
  end if;

  select coalesce(array_agg(resolved.id order by requested.ordinality),array[]::uuid[]),
         coalesce(array_agg(resolved.character_id order by requested.ordinality),array[]::text[])
  into v_owned_ids,v_master_ids
  from unnest(v_requested) with ordinality requested(character_ref,ordinality)
  join lateral (
    select owned.id,owned.character_id
    from public.user_characters owned
    where owned.user_id=v_user_id
      and (owned.id::text=requested.character_ref or owned.character_id=requested.character_ref)
    order by (owned.id::text=requested.character_ref) desc
    limit 1
  ) resolved on true;
  if cardinality(v_owned_ids) <> cardinality(v_requested) then
    raise exception 'main formation contains a character that is not owned' using errcode='42501';
  end if;
  if cardinality(v_owned_ids) <> (select count(distinct value) from unnest(v_owned_ids) value) then
    raise exception 'main formation resolves to duplicate characters' using errcode='23505';
  end if;

  delete from public.user_main_formations where user_id=v_user_id;
  insert into public.user_main_formations(user_id,slot,user_character_id)
  select v_user_id,ordinality::smallint,value from unnest(v_owned_ids) with ordinality picked(value,ordinality);
  v_power := public.refresh_user_power_projection(v_user_id);
  return jsonb_build_object('status','success','character_ids',to_jsonb(v_master_ids),'total_power',v_power);
end;
$$;

create or replace function public.get_current_main_formation()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_user_id uuid:=auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  return jsonb_build_object(
    'characters',coalesce((select jsonb_agg(jsonb_build_object(
      'slot',formation.slot,'character_id',owned.character_id,'level',owned.level,
      'awakening_level',coalesce(owned.awakening_level,0),'character_power',public.calculate_user_character_power(v_user_id,owned.id)
    ) order by formation.slot)
    from public.user_main_formations formation join public.user_characters owned on owned.id=formation.user_character_id
    where formation.user_id=v_user_id),'[]'::jsonb),
    'total_power',coalesce((select total_power from public.user_power_rankings where user_id=v_user_id),0)
  );
end;
$$;

create or replace function public.get_my_power_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid:=auth.uid(); v_power bigint;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  v_power:=public.refresh_user_power_projection(v_user_id);
  return jsonb_build_object('user_id',v_user_id,'total_power',v_power,'calculated_at',clock_timestamp());
end;
$$;

create or replace function public.power_projection_owned_row_changed()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.refresh_user_power_projection(coalesce(new.user_id,old.user_id));
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists user_character_power_projection_trigger on public.user_characters;
create trigger user_character_power_projection_trigger after insert or update of level,awakening_level or delete on public.user_characters
  for each row execute function public.power_projection_owned_row_changed();
drop trigger if exists user_equipment_power_projection_trigger on public.user_equipments;
create trigger user_equipment_power_projection_trigger after insert or update of level,plus_val,equipped_character_id,equipment_id,equipment_master_id or delete on public.user_equipments
  for each row execute function public.power_projection_owned_row_changed();

create or replace function public.power_projection_master_changed()
returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.refresh_all_user_power_projections(); return null; end;
$$;
drop trigger if exists character_growth_power_projection_trigger on public.character_growth_patterns;
create trigger character_growth_power_projection_trigger after insert or update or delete on public.character_growth_patterns
  for each statement execute function public.power_projection_master_changed();
drop trigger if exists character_awakening_power_projection_trigger on public.character_awakening_master;
create trigger character_awakening_power_projection_trigger after insert or update or delete on public.character_awakening_master
  for each statement execute function public.power_projection_master_changed();
drop trigger if exists character_battle_power_projection_trigger on public.character_battle_master;
create trigger character_battle_power_projection_trigger after insert or update or delete on public.character_battle_master
  for each statement execute function public.power_projection_master_changed();
drop trigger if exists equipment_battle_power_projection_trigger on public.equipment_battle_master;
create trigger equipment_battle_power_projection_trigger after insert or update or delete on public.equipment_battle_master
  for each statement execute function public.power_projection_master_changed();

create table if not exists public.pvp_daily_wins (
  activity_date date not null,
  user_id uuid not null references public.users(id) on delete cascade,
  wins integer not null default 0 check(wins>=0),
  updated_at timestamptz not null default now(),
  primary key(activity_date,user_id)
);
create or replace function public.capture_pvp_daily_win()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_delta integer;
begin
  v_delta:=case when tg_op='INSERT' then greatest(coalesce(new.daily_wins,0),0)
                else greatest(coalesce(new.daily_wins,0)-coalesce(old.daily_wins,0),0) end;
  if v_delta>0 then
    insert into public.pvp_daily_wins(activity_date,user_id,wins,updated_at)
    values((clock_timestamp() at time zone 'Asia/Tokyo')::date,new.user_id,v_delta,clock_timestamp())
    on conflict(activity_date,user_id) do update set wins=public.pvp_daily_wins.wins+excluded.wins,updated_at=excluded.updated_at;
  end if;
  return new;
end;
$$;
drop trigger if exists pvp_daily_win_projection_trigger on public.pvp_ranks;
create trigger pvp_daily_win_projection_trigger after insert or update of daily_wins on public.pvp_ranks
  for each row execute function public.capture_pvp_daily_win();

create table if not exists public.gvg_guild_season_rankings (
  season_id uuid not null references public.ranking_seasons(id) on delete cascade,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  rate integer not null default 1000 check(rate>=0),
  rank_tier text,
  wins integer not null default 0 check(wins>=0),
  losses integer not null default 0 check(losses>=0),
  updated_at timestamptz not null default now(),
  primary key(season_id,guild_id)
);
create table if not exists public.gvg_individual_season_rankings (
  season_id uuid not null references public.ranking_seasons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  guild_id uuid references public.guilds(id) on delete set null,
  actual_damage bigint not null default 0 check(actual_damage>=0),
  updated_at timestamptz not null default now(),
  primary key(season_id,user_id)
);

create or replace function public.capture_gvg_individual_damage()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_season uuid;
begin
  if old.battle_result='PENDING' and new.battle_result in('VICTORY','DEFEAT') then
    v_season:=public.current_ranking_season_id('GVG',coalesce(new.resolved_at,clock_timestamp()));
    if v_season is not null then
      insert into public.gvg_individual_season_rankings(season_id,user_id,guild_id,actual_damage)
      values(v_season,new.attacker_user_id,new.attacker_guild_id,new.raw_damage)
      on conflict(season_id,user_id) do update set
        guild_id=excluded.guild_id,actual_damage=public.gvg_individual_season_rankings.actual_damage+excluded.actual_damage,updated_at=clock_timestamp();
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists gvg_individual_damage_projection_trigger on public.gvg_attack_logs;
create trigger gvg_individual_damage_projection_trigger after update of battle_result on public.gvg_attack_logs
  for each row execute function public.capture_gvg_individual_damage();

create or replace function public.capture_gvg_guild_result()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_season uuid; v_guild uuid;
begin
  if old.status<>'COMPLETED' and new.status='COMPLETED' then
    v_season:=public.current_ranking_season_id('GVG',coalesce(new.completed_at,clock_timestamp()));
    if v_season is not null then
      foreach v_guild in array array_remove(array[new.guild_a_id,new.guild_b_id],null) loop
        insert into public.gvg_guild_season_rankings(season_id,guild_id,rate,wins,losses)
        select v_season,v_guild,coalesce(rating.rating,1000),
          case when new.winner_guild_id=v_guild then 1 else 0 end,
          case when new.winner_guild_id is not null and new.winner_guild_id<>v_guild then 1 else 0 end
        from (select 1) seed left join public.gvg_guild_ratings rating on rating.guild_id=v_guild
        on conflict(season_id,guild_id) do update set
          rate=excluded.rate,wins=public.gvg_guild_season_rankings.wins+excluded.wins,
          losses=public.gvg_guild_season_rankings.losses+excluded.losses,updated_at=clock_timestamp();
      end loop;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists gvg_guild_result_projection_trigger on public.gvg_match_sessions;
create trigger gvg_guild_result_projection_trigger after update of status on public.gvg_match_sessions
  for each row execute function public.capture_gvg_guild_result();

create or replace function public.get_public_power_rankings(p_daily boolean,p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_start timestamptz; v_end timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'invalid pagination' using errcode='22023'; end if;
  v_start:=date_trunc('day',clock_timestamp() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'; v_end:=v_start+interval '1 day';
  return coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.rank_position) from (
    select ranking.user_id,player.username,player.avatar_url,ranking.total_power current_power,ranking.updated_at,
      member.guild_id,guild.name guild_name,
      dense_rank() over(order by ranking.total_power desc,ranking.updated_at asc) rank_position,
      (player.last_active_at>=v_start and player.last_active_at<v_end) is_daily_active
    from public.user_power_rankings ranking join public.users player on player.id=ranking.user_id
    left join public.guild_members member on member.user_id=ranking.user_id left join public.guilds guild on guild.id=member.guild_id
    where not p_daily or (player.last_active_at>=v_start and player.last_active_at<v_end)
    order by ranking.total_power desc,ranking.updated_at asc limit p_limit offset p_offset
  ) row_data),'[]'::jsonb);
end;
$$;
create or replace function public.get_public_power_rankings()
returns jsonb language sql stable security definer set search_path=public as $$ select public.get_public_power_rankings(false,100,0) $$;

create or replace function public.get_public_guild_power_rankings(p_daily boolean,p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_start timestamptz; v_end timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'invalid pagination' using errcode='22023'; end if;
  v_start:=date_trunc('day',clock_timestamp() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'; v_end:=v_start+interval '1 day';
  return coalesce((select jsonb_agg(to_jsonb(ranked) order by ranked.rank_position) from (
    select aggregated.*,dense_rank() over(order by aggregated.score desc,aggregated.guild_id) rank_position from (
      select guild.id guild_id,guild.name,
        sum(power.total_power)::bigint current_power,
        coalesce(sum(power.total_power) filter(where player.last_active_at>=v_start and player.last_active_at<v_end),0)::bigint daily_power,
        count(*)::integer member_count,
        count(*) filter(where player.last_active_at>=v_start and player.last_active_at<v_end)::integer active_member_count,
        case when p_daily then coalesce(sum(power.total_power) filter(where player.last_active_at>=v_start and player.last_active_at<v_end),0) else sum(power.total_power) end::bigint score
      from public.guilds guild join public.guild_members member on member.guild_id=guild.id
      join public.users player on player.id=member.user_id join public.user_power_rankings power on power.user_id=member.user_id
      group by guild.id,guild.name
    ) aggregated where not p_daily or aggregated.active_member_count>0
    order by score desc,guild_id limit p_limit offset p_offset
  ) ranked),'[]'::jsonb);
end;
$$;

create or replace function public.get_public_pvp_rankings(p_daily boolean,p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_today date:=(clock_timestamp() at time zone 'Asia/Tokyo')::date; v_season uuid:=public.current_ranking_season_id('PVP');
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'invalid pagination' using errcode='22023'; end if;
  return coalesce((select jsonb_agg(to_jsonb(ranked) order by ranked.rank_position) from (
    select row_data.*,dense_rank() over(order by row_data.score desc,row_data.user_id) rank_position from (
      select rank.user_id,player.username,player.avatar_url,coalesce(rank.rank_points,1000) rank_points,
        coalesce(daily.wins,0) daily_wins,coalesce(power.total_power,0) current_power,
        member.guild_id,guild.name guild_name,v_season season_id,
        case when p_daily then coalesce(daily.wins,0) else coalesce(rank.rank_points,1000) end score
      from public.pvp_ranks rank join public.users player on player.id=rank.user_id
      left join public.pvp_daily_wins daily on daily.user_id=rank.user_id and daily.activity_date=v_today
      left join public.user_power_rankings power on power.user_id=rank.user_id
      left join public.guild_members member on member.user_id=rank.user_id left join public.guilds guild on guild.id=member.guild_id
    ) row_data order by score desc,user_id limit p_limit offset p_offset
  ) ranked),'[]'::jsonb);
end;
$$;

create or replace function public.get_raid_season_rankings(p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_season public.ranking_seasons%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'invalid pagination' using errcode='22023'; end if;
  select * into v_season from public.ranking_seasons where id=public.current_ranking_season_id('RAID');
  return jsonb_build_object('season_id',v_season.id,'starts_at',v_season.starts_at,'ends_at',v_season.ends_at,
    'individual',coalesce((select jsonb_agg(to_jsonb(rows) order by rows.contribution desc) from (
      select log.user_id,player.username,sum(log.raw_damage)::bigint contribution
      from public.raid_damage_logs log join public.users player on player.id=log.user_id
      where log.raid_boss_instance_id is not null and log.created_at>=v_season.starts_at and log.created_at<v_season.ends_at
      group by log.user_id,player.username order by contribution desc limit p_limit offset p_offset) rows),'[]'::jsonb),
    'guild',coalesce((select jsonb_agg(to_jsonb(rows) order by rows.contribution desc) from (
      select log.guild_id,guild.name guild_name,sum(log.raw_damage)::bigint contribution,count(distinct log.user_id)::integer participant_count
      from public.raid_damage_logs log join public.guilds guild on guild.id=log.guild_id
      where log.raid_boss_instance_id is not null and log.guild_id is not null and log.created_at>=v_season.starts_at and log.created_at<v_season.ends_at
      group by log.guild_id,guild.name order by contribution desc limit p_limit offset p_offset) rows),'[]'::jsonb));
end;
$$;

create or replace function public.get_public_gvg_rankings(p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_season public.ranking_seasons%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'invalid pagination' using errcode='22023'; end if;
  select * into v_season from public.ranking_seasons where id=public.current_ranking_season_id('GVG');
  return jsonb_build_object('season_id',v_season.id,'starts_at',v_season.starts_at,'ends_at',v_season.ends_at,
    'guild',coalesce((select jsonb_agg(to_jsonb(rows) order by rows.rate desc) from (
      select ranking.guild_id,guild.name guild_name,ranking.rate,ranking.rank_tier,ranking.wins,ranking.losses,
        dense_rank() over(order by ranking.rate desc,ranking.guild_id) rank_position
      from public.gvg_guild_season_rankings ranking join public.guilds guild on guild.id=ranking.guild_id
      where ranking.season_id=v_season.id order by ranking.rate desc,ranking.guild_id limit p_limit offset p_offset) rows),'[]'::jsonb),
    'individual',coalesce((select jsonb_agg(to_jsonb(rows) order by rows.actual_damage desc) from (
      select ranking.user_id,player.username,ranking.guild_id,guild.name guild_name,ranking.actual_damage,
        dense_rank() over(order by ranking.actual_damage desc,ranking.user_id) rank_position
      from public.gvg_individual_season_rankings ranking join public.users player on player.id=ranking.user_id
      left join public.guilds guild on guild.id=ranking.guild_id where ranking.season_id=v_season.id
      order by ranking.actual_damage desc,ranking.user_id limit p_limit offset p_offset) rows),'[]'::jsonb));
end;
$$;

create or replace function public.get_active_ranking_seasons()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'season_id',season.id,
      'ranking_type',season.ranking_type,
      'starts_at',season.starts_at,
      'ends_at',season.ends_at,
      'status',season.status
    ) order by season.ranking_type)
    from public.ranking_seasons season
    where season.status='ACTIVE'
      and clock_timestamp()>=season.starts_at
      and clock_timestamp()<season.ends_at
  ),'[]'::jsonb);
end;
$$;

create or replace function public.get_public_player_detail(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  select jsonb_build_object(
    'user_id',player.id,'username',player.username,'avatar_url',player.avatar_url,'bio',player.bio,'level',player.level,
    'guild_id',member.guild_id,'guild_name',guild.name,'total_power',coalesce(power.total_power,0),
    'main_formation',coalesce((select jsonb_agg(jsonb_build_object(
      'slot',formation.slot,'character_master_id',owned.character_id,'display_name',release.display_name,
      'rarity',release.rarity,'asset_identifier',release.asset_path,'level',owned.level,
      'awakening_level',coalesce(owned.awakening_level,0),'character_power',public.calculate_user_character_power(player.id,owned.id)
    ) order by formation.slot)
    from public.user_main_formations formation join public.user_characters owned on owned.id=formation.user_character_id
    join public.character_release_master release on release.character_id=owned.character_id
    where formation.user_id=player.id),'[]'::jsonb)
  ) into v_result
  from public.users player left join public.guild_members member on member.user_id=player.id
  left join public.guilds guild on guild.id=member.guild_id left join public.user_power_rankings power on power.user_id=player.id
  where player.id=p_user_id;
  if v_result is null then raise exception 'public player was not found' using errcode='P0002'; end if;
  return v_result;
end;
$$;

-- Existing batched public profile consumers receive only the new public Power
-- and Main Formation identifiers; inventories and owned-row IDs remain hidden.
create or replace function public.get_public_profiles(p_user_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null or p_user_ids is null or cardinality(p_user_ids) not between 1 and 100 then
    raise exception 'invalid public profile request' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(profile)) from (
    select player.id,player.id user_id,player.username,player.avatar_url,player.bio,player.favorite_character_id,
      player.level,player.xp,player.title_equipped,coalesce(title.name,player.title_equipped) title_name,
      member.guild_id,guild.name guild_name,coalesce(power.total_power,0) total_power,
      coalesce((select jsonb_agg(owned.character_id order by formation.slot)
        from public.user_main_formations formation join public.user_characters owned on owned.id=formation.user_character_id
        where formation.user_id=player.id),'[]'::jsonb) main_formation_character_ids
    from public.users player left join public.title_master title on title.id=player.title_equipped
    left join public.guild_members member on member.user_id=player.id left join public.guilds guild on guild.id=member.guild_id
    left join public.user_power_rankings power on power.user_id=player.id where player.id=any(p_user_ids)
  ) profile),'[]'::jsonb);
end;
$$;

-- Remove consumer authority from projections and raw competition logs.
drop policy if exists "public read user_power_rankings" on public.user_power_rankings;
drop policy if exists "owner write user_power_rankings" on public.user_power_rankings;
drop policy if exists "Allow all access to raid_damage_logs" on public.raid_damage_logs;
drop policy if exists "Allow all access to guild_base_controls" on public.guild_base_controls;

alter table public.ranking_seasons enable row level security;
alter table public.user_main_formations enable row level security;
alter table public.pvp_daily_wins enable row level security;
alter table public.gvg_guild_season_rankings enable row level security;
alter table public.gvg_individual_season_rankings enable row level security;

revoke all on table public.user_power_rankings,public.user_main_formations,public.ranking_seasons,
  public.pvp_daily_wins,public.raid_damage_logs,public.guild_base_controls,
  public.gvg_guild_ratings,public.gvg_guild_season_rankings,public.gvg_individual_season_rankings
  from public,anon,authenticated;
grant all on table public.user_power_rankings,public.user_main_formations,public.ranking_seasons,
  public.pvp_daily_wins,public.raid_damage_logs,public.guild_base_controls,
  public.gvg_guild_ratings,public.gvg_guild_season_rankings,public.gvg_individual_season_rankings
  to service_role;

revoke all on function public.current_ranking_season_id(text,timestamptz),public.calculate_user_character_power(uuid,uuid),
  public.calculate_user_total_power(uuid),public.refresh_user_power_projection(uuid),public.refresh_all_user_power_projections(),
  public.power_projection_owned_row_changed(),public.power_projection_master_changed(),public.capture_pvp_daily_win(),
  public.capture_gvg_individual_damage(),public.capture_gvg_guild_result()
  from public,anon,authenticated;
grant execute on function public.current_ranking_season_id(text,timestamptz),public.calculate_user_character_power(uuid,uuid),
  public.calculate_user_total_power(uuid),public.refresh_user_power_projection(uuid),public.refresh_all_user_power_projections(),
  public.power_projection_owned_row_changed(),public.power_projection_master_changed(),public.capture_pvp_daily_win(),
  public.capture_gvg_individual_damage(),public.capture_gvg_guild_result()
  to service_role;

revoke all on function public.save_main_formation(text[]),public.get_current_main_formation(),public.get_my_power_snapshot(),
  public.get_public_power_rankings(),public.get_public_power_rankings(boolean,integer,integer),
  public.get_public_guild_power_rankings(boolean,integer,integer),public.get_public_pvp_rankings(boolean,integer,integer),
  public.get_raid_season_rankings(integer,integer),public.get_public_gvg_rankings(integer,integer),
  public.get_active_ranking_seasons(),public.get_public_player_detail(uuid),public.get_public_profiles(uuid[])
  from public,anon;
grant execute on function public.save_main_formation(text[]),public.get_current_main_formation(),public.get_my_power_snapshot(),
  public.get_public_power_rankings(),public.get_public_power_rankings(boolean,integer,integer),
  public.get_public_guild_power_rankings(boolean,integer,integer),public.get_public_pvp_rankings(boolean,integer,integer),
  public.get_raid_season_rankings(integer,integer),public.get_public_gvg_rankings(integer,integer),
  public.get_active_ranking_seasons(),public.get_public_player_detail(uuid),public.get_public_profiles(uuid[])
  to authenticated,service_role;

-- Legacy GvG point projections remain for historical migrations only.
revoke all on table public.user_gvg_ranks from public,anon,authenticated;
grant all on table public.user_gvg_ranks to service_role;

select public.refresh_all_user_power_projections();
notify pgrst,'reload schema';
commit;
