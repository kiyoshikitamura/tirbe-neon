-- Phase B2: canonical User Lv1-8 and action-resource foundation.
-- Generated from the 2026-08-22 machine masters. Do not hand-edit seed values.

begin;

create table if not exists public.canonical_user_level_master (
  version text not null,
  level integer not null check (level >= 1),
  required_exp integer check (required_exp > 0),
  cumulative_exp integer not null check (cumulative_exp >= 0),
  unlock_keys jsonb not null default '[]'::jsonb,
  primary key(version, level)
);

create table if not exists public.canonical_action_resource_master (
  version text not null,
  resource_type text not null check (resource_type in ('VITALITY','PVP_POINT','RAID_POINT')),
  natural_max integer not null check (natural_max > 0),
  hard_cap integer not null check (hard_cap >= natural_max),
  recovery_amount integer not null check (recovery_amount > 0),
  recovery_interval_seconds integer not null check (recovery_interval_seconds > 0),
  entry_cost integer check (entry_cost >= 0),
  primary key(version, resource_type)
);

create table if not exists public.canonical_quest_resource_cost (
  version text not null,
  difficulty text not null check (difficulty in ('EASY','NORMAL','HARD')),
  vitality_cost integer not null check (vitality_cost > 0),
  primary key(version, difficulty)
);

insert into public.canonical_user_level_master(version,level,required_exp,cumulative_exp,unlock_keys) values
  ('2026-08-22',1,100,0,'[]'::jsonb),
  ('2026-08-22',2,150,100,'[]'::jsonb),
  ('2026-08-22',3,200,250,'[]'::jsonb),
  ('2026-08-22',4,250,450,'[]'::jsonb),
  ('2026-08-22',5,300,700,'[]'::jsonb),
  ('2026-08-22',6,350,1000,'[]'::jsonb),
  ('2026-08-22',7,400,1350,'[]'::jsonb),
  ('2026-08-22',8,null,1750,'["GUILD_CREATION"]'::jsonb)
on conflict(version,level) do update set required_exp=excluded.required_exp,cumulative_exp=excluded.cumulative_exp,unlock_keys=excluded.unlock_keys;

insert into public.canonical_action_resource_master(version,resource_type,natural_max,hard_cap,recovery_amount,recovery_interval_seconds,entry_cost) values
  ('2026-08-22','VITALITY',100,500,1,360,null),
  ('2026-08-22','PVP_POINT',5,5,1,7200,1),
  ('2026-08-22','RAID_POINT',5,5,1,7200,1)
on conflict(version,resource_type) do update set natural_max=excluded.natural_max,hard_cap=excluded.hard_cap,recovery_amount=excluded.recovery_amount,recovery_interval_seconds=excluded.recovery_interval_seconds,entry_cost=excluded.entry_cost;

insert into public.canonical_quest_resource_cost(version,difficulty,vitality_cost) values
  ('2026-08-22','EASY',5),
  ('2026-08-22','NORMAL',10),
  ('2026-08-22','HARD',15)
on conflict(version,difficulty) do update set vitality_cost=excluded.vitality_cost;

insert into public.user_level_master(level,next_xp) values
  (1,100),(2,150),(3,200),(4,250),(5,300),(6,350),(7,400)
on conflict(level) do update set next_xp=excluded.next_xp;

update public.quests set cost_vitality=case level_type when 'EASY' then 5 when 'NORMAL' then 10 when 'HARD' then 15 else cost_vitality end
where level_type in ('EASY','NORMAL','HARD');

alter table public.users
  add column if not exists raid_points integer not null default 5 check (raid_points between 0 and 5),
  add column if not exists raid_points_last_recovered_at timestamptz not null default now(),
  add column if not exists raid_free_entry_consumed boolean not null default false;

update public.users player set raid_free_entry_consumed=true
where not player.raid_free_entry_consumed and exists (
  select 1 from public.user_raid_daily_attempts attempts where attempts.user_id=player.id and attempts.attempt_count>0
);

create or replace function public.apply_user_xp(p_user_id uuid,p_xp_amount integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_level integer; v_xp integer; v_required integer; v_leveled boolean:=false;
begin
 if p_xp_amount<0 then raise exception 'XP amount must not be negative' using errcode='22023'; end if;
 select level,xp into v_level,v_xp from public.users where id=p_user_id for update;
 if not found then raise exception 'user not found' using errcode='P0002'; end if;
 v_xp:=greatest(coalesce(v_xp,0),0)+p_xp_amount;
 while v_level<8 loop
  select required_exp into v_required from public.canonical_user_level_master where version='2026-08-22' and level=v_level;
  exit when v_required is null or v_xp<v_required;
  v_xp:=v_xp-v_required; v_level:=v_level+1; v_leveled:=true;
 end loop;
 update public.users set level=v_level,xp=v_xp where id=p_user_id;
 return jsonb_build_object('level',v_level,'xp',v_xp,'leveled_up',v_leveled,'frozen_through_level',8);
end $$;

create or replace function public.sync_and_recover_vitality_and_pvp_points(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user public.users%rowtype; v_now timestamptz:=now(); v_vit_steps integer; v_pvp_steps integer; v_raid_steps integer;
 v_vit integer; v_pvp integer; v_raid integer; v_vit_at timestamptz; v_pvp_at timestamptz; v_raid_at timestamptz;
begin
 if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'not authorized' using errcode='42501'; end if;
 select * into v_user from public.users where id=p_user_id for update;
 if not found then raise exception 'user not found' using errcode='P0002'; end if;
 v_vit:=least(500,greatest(0,v_user.vitality)); v_pvp:=least(5,greatest(0,v_user.pvp_points)); v_raid:=least(5,greatest(0,v_user.raid_points));
 v_vit_at:=v_user.vitality_last_recovered_at; v_pvp_at:=v_user.pvp_points_last_recovered_at; v_raid_at:=v_user.raid_points_last_recovered_at;
 if v_vit<100 then
  v_vit_steps:=greatest(0,floor(extract(epoch from(v_now-coalesce(v_vit_at,v_now)))/360));
  v_vit:=least(100,v_vit+v_vit_steps);
  if v_vit_steps>0 then v_vit_at:=case when v_vit=100 then v_now else v_vit_at+(v_vit_steps*interval '360 seconds') end; end if;
 end if;
 if v_pvp<5 then
  v_pvp_steps:=greatest(0,floor(extract(epoch from(v_now-coalesce(v_pvp_at,v_now)))/7200));
  v_pvp:=least(5,v_pvp+v_pvp_steps);
  if v_pvp_steps>0 then v_pvp_at:=case when v_pvp=5 then v_now else v_pvp_at+(v_pvp_steps*interval '7200 seconds') end; end if;
 end if;
 if v_raid<5 then
  v_raid_steps:=greatest(0,floor(extract(epoch from(v_now-coalesce(v_raid_at,v_now)))/7200));
  v_raid:=least(5,v_raid+v_raid_steps);
  if v_raid_steps>0 then v_raid_at:=case when v_raid=5 then v_now else v_raid_at+(v_raid_steps*interval '7200 seconds') end; end if;
 end if;
 update public.users set vitality=v_vit,vitality_last_recovered_at=v_vit_at,pvp_points=v_pvp,pvp_points_last_recovered_at=v_pvp_at,
  raid_points=v_raid,raid_points_last_recovered_at=v_raid_at where id=p_user_id;
 return jsonb_build_object('out_vitality',v_vit,'out_pvp_points',v_pvp,'out_raid_points',v_raid,
  'out_cash',v_user.cash,'out_diamonds',v_user.neon_diamonds,'raid_first_entry_free',not v_user.raid_free_entry_consumed);
end $$;

create or replace function public.use_energy_drink()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_vitality integer; v_quantity integer;
begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 perform public.sync_and_recover_vitality_and_pvp_points(v_user_id);
 select vitality into v_vitality from public.users where id=v_user_id for update;
 if not found then raise exception 'player profile is not initialized' using errcode='P0002'; end if;
 if v_vitality+50>500 then raise exception 'energy drink would exceed vitality hard cap' using errcode='23514'; end if;
 update public.user_items set quantity=quantity-1 where user_id=v_user_id and item_id='ENERGY_DRINK' and quantity>=1 returning quantity into v_quantity;
 if not found then raise exception 'energy drink is not available' using errcode='23514'; end if;
 update public.users set vitality=vitality+50 where id=v_user_id returning vitality into v_vitality;
 return jsonb_build_object('status','success','quantity',v_quantity,'vitality',v_vitality);
end $$;

create or replace function public.get_current_raid_attempt_state()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_sync jsonb; v_free boolean;
begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 v_sync:=public.sync_and_recover_vitality_and_pvp_points(v_user_id);
 select not raid_free_entry_consumed into v_free from public.users where id=v_user_id;
 return jsonb_build_object('raidPoints',(v_sync->>'out_raid_points')::integer,'maxRaidPoints',5,'firstEntryFree',v_free,'recoveryIntervalSeconds',7200);
end $$;

create or replace function public.start_pvp_battle(
  p_opponent_user_id uuid,
  p_character_ids text[],
  p_tactic text default 'ATTACK_PRIORITY'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user public.users%rowtype;
  v_now timestamptz := now();
  v_recovered integer;
  v_remaining integer;
  v_my_rank integer;
  v_opponent_rank integer;
  v_opponent_name text;
  v_opponent_guild_id uuid;
  v_opponent_guild_name text;
  v_deck public.pvp_defense_decks%rowtype;
  v_player_snapshot jsonb;
  v_enemy_snapshot jsonb;
  v_replay_id uuid;
  v_seed bigint;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_opponent_user_id is null or p_opponent_user_id = v_user_id then
    raise exception 'invalid PvP opponent' using errcode = '22023';
  end if;
  if p_tactic not in ('ATTACK_PRIORITY', 'HEAL_PRIORITY', 'SKILL_PRIORITY', 'BALANCED', 'WEAKNESS_FOCUS') then
    raise exception 'invalid tactic' using errcode = '22023';
  end if;

  select * into v_user from public.users where id = v_user_id for update;
  if not found then raise exception 'player not found' using errcode = 'P0002'; end if;
  v_recovered := floor(extract(epoch from (v_now - coalesce(v_user.pvp_points_last_recovered_at, v_now))) / 7200);
  v_remaining := least(5, coalesce(v_user.pvp_points, 0) + greatest(v_recovered, 0));
  if v_remaining < 1 then raise exception 'insufficient PvP points' using errcode = '23514'; end if;
  v_remaining := v_remaining - 1;
  update public.users
  set pvp_points = v_remaining,
      pvp_points_last_recovered_at = case
        when v_recovered > 0 or coalesce(v_user.pvp_points, 0) = 5 then v_now
        else v_user.pvp_points_last_recovered_at
      end
  where id = v_user_id;

  select deck.* into v_deck
  from public.pvp_defense_decks deck
  where deck.user_id = p_opponent_user_id;
  if not found then raise exception 'opponent defense deck not found' using errcode = 'P0002'; end if;

  select player.username, coalesce(rank.rank_points, 1000), member.guild_id, guild.name
  into v_opponent_name, v_opponent_rank, v_opponent_guild_id, v_opponent_guild_name
  from public.users player
  left join public.pvp_ranks rank on rank.user_id = player.id
  left join public.guild_members member on member.user_id = player.id
  left join public.guilds guild on guild.id = member.guild_id
  where player.id = p_opponent_user_id;
  if not found then raise exception 'opponent not found' using errcode = 'P0002'; end if;

  select coalesce(rank.rank_points, 1000) into v_my_rank
  from public.users player left join public.pvp_ranks rank on rank.user_id = player.id
  where player.id = v_user_id;

  v_player_snapshot := public.build_server_battle_snapshot(v_user_id, p_character_ids, 'PLAYER');
  v_enemy_snapshot := public.build_server_battle_snapshot(p_opponent_user_id, array_remove(array[
    v_deck.character_1_id, v_deck.character_2_id, v_deck.character_3_id,
    v_deck.character_4_id, v_deck.character_5_id
  ]::text[], null), 'ENEMY');
  v_seed := floor(random() * 2147483646)::bigint + 1;

  insert into public.battle_replay_sessions(
    requester_user_id, battle_mode, source_reference_id, tactic_id,
    random_seed, player_snapshot, enemy_snapshot, resolution_authority,
    finalization_status, official_context
  ) values (
    v_user_id, 'PVP', p_opponent_user_id, p_tactic,
    v_seed, v_player_snapshot, v_enemy_snapshot, 'PVP_SERVER',
    'PENDING', jsonb_build_object(
      'opponentUserId', p_opponent_user_id,
      'opponentName', v_opponent_name,
      'opponentGuildId', v_opponent_guild_id,
      'opponentGuildName', v_opponent_guild_name,
      'playerRankPointsAtStart', v_my_rank,
      'opponentRankPointsAtStart', v_opponent_rank,
      'remainingPvpPoints', v_remaining,
      'rewardRevision', 'OPEN_BETA_P0_V1'
    )
  ) returning id into v_replay_id;

  return jsonb_build_object(
    'replay_session_id', v_replay_id,
    'player_snapshot', v_player_snapshot,
    'enemy_snapshot', v_enemy_snapshot,
    'opponent_name', v_opponent_name,
    'opponent_guild_id', v_opponent_guild_id,
    'opponent_guild_name', v_opponent_guild_name,
    'opponent_rank_points', v_opponent_rank,
    'remaining_pvp_points', v_remaining
  );
end;
$$;

create or replace function public.start_patrol(
  p_course_id text,
  p_character_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_master_id text;
  v_duration_seconds integer;
  v_cost_vitality integer;
  v_vitality integer;
  v_active_count integer;
  v_has_battle boolean;
  v_battle_chance numeric;
  v_new_id uuid;
  v_is_tutorial_dispatch boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select quest.duration_seconds, quest.cost_vitality
  into v_duration_seconds, v_cost_vitality
  from public.quests quest
  where quest.id = p_course_id;

  if v_duration_seconds is null then
    raise exception 'quest master not found' using errcode = '23503';
  end if;

  select owned.character_id::text
  into v_character_master_id
  from public.user_characters owned
  where owned.user_id = v_user_id
    and (owned.id::text = p_character_id or owned.character_id::text = p_character_id)
  order by (owned.id::text = p_character_id) desc
  limit 1;

  if v_character_master_id is null then
    raise exception 'character is not owned' using errcode = '23503';
  end if;

  select count(*) into v_active_count
  from public.user_patrols patrol
  where patrol.user_id = v_user_id and patrol.status <> 'COMPLETED';

  if v_active_count >= 5 then
    raise exception 'all dispatch slots are occupied' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.user_patrols patrol
    where patrol.user_id = v_user_id
      and patrol.character_id = v_character_master_id
      and patrol.status <> 'COMPLETED'
  ) then
    raise exception 'character is already dispatched' using errcode = '23505';
  end if;

  -- This function locks the same user row, settles elapsed recovery and resets
  -- a stale full-AP timestamp before this transaction consumes quest AP.
  perform public.sync_and_recover_vitality_and_pvp_points(v_user_id);

  select player.vitality into v_vitality
  from public.users player
  where player.id = v_user_id
  for update;

  if coalesce(v_vitality, 0) < v_cost_vitality then
    raise exception 'insufficient vitality' using errcode = '23514';
  end if;

  if to_regclass('public.tutorial_progress') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'tutorial_progress' and column_name = 'user_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'tutorial_progress' and column_name = 'step_id'
    ) then
    execute 'select progress.step_id = ''DISPATCH'' from public.tutorial_progress progress where progress.user_id = $1'
      into v_is_tutorial_dispatch
      using v_user_id;
  end if;

  select max(npc.encounter_rate)
  into v_battle_chance
  from public.patrol_npcs npc
  where npc.quest_id = p_course_id;

  v_has_battle := v_battle_chance is not null
    and (coalesce(v_is_tutorial_dispatch, false) or random() <= v_battle_chance);

  insert into public.user_patrols (
    user_id, course_id, character_id, started_at, expires_at,
    status, has_battle_event, battle_resolved
  ) values (
    v_user_id, p_course_id, v_character_master_id, now(),
    now() + (v_duration_seconds * interval '1 second'),
    'ONGOING', v_has_battle, false
  ) returning id into v_new_id;

  update public.users as player
  set vitality = player.vitality - v_cost_vitality,
      vitality_last_recovered_at = case when player.vitality >= 100 then now() else player.vitality_last_recovered_at end
  where player.id = v_user_id;

  v_vitality := v_vitality - v_cost_vitality;

  return jsonb_build_object(
    'status', 'success',
    'patrol_id', v_new_id,
    'has_battle', v_has_battle,
    'duration_seconds', v_duration_seconds,
    'cost_vitality', v_cost_vitality,
    'remaining_vitality', v_vitality
  );
end;
$$;

create or replace function public.start_raid_battle(p_instance_id uuid,p_character_ids text[],p_tactic text default 'ATTACK_PRIORITY')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_user public.users%rowtype; v_instance record; v_cost integer; v_cost_type text;
 v_guild_id uuid; v_players jsonb; v_enemy jsonb; v_replay uuid; v_seed bigint;
begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_tactic not in ('ATTACK_PRIORITY','HEAL_PRIORITY','SKILL_PRIORITY','BALANCED','WEAKNESS_FOCUS') then raise exception 'invalid tactic'; end if;
 perform public.sync_and_recover_vitality_and_pvp_points(v_user_id);
 select * into v_user from public.users where id=v_user_id for update;
 if v_user.level<5 then raise exception 'player level 5 is required' using errcode='23514'; end if;
 select boss.*,master.boss_name,master.level boss_level,master.atk,master.def,master.spd,master.luk
 into v_instance from public.raid_bosses boss join public.raid_boss_master master on master.id=boss.boss_master_id
 where boss.id=p_instance_id and boss.status='ACTIVE' and boss.expires_at>clock_timestamp() for update of boss;
 if not found then raise exception 'Raid instance is not active' using errcode='P0002'; end if;
 if not v_user.raid_free_entry_consumed then
  v_cost:=0; v_cost_type:='FREE_FIRST';
  update public.users set raid_free_entry_consumed=true where id=v_user_id;
 elsif v_user.raid_points>=1 then
  v_cost:=1; v_cost_type:='RAID_POINT';
  update public.users set raid_points=raid_points-1,
   raid_points_last_recovered_at=case when raid_points=5 then now() else raid_points_last_recovered_at end where id=v_user_id;
  v_user.raid_points:=v_user.raid_points-1;
 else raise exception 'insufficient Raid points' using errcode='23514'; end if;
 select guild_id into v_guild_id from public.guild_members where user_id=v_user_id;
 v_players:=public.build_server_battle_snapshot(v_user_id,p_character_ids,'PLAYER');
 v_enemy:=jsonb_build_array(jsonb_build_object('id','raid_'||v_instance.id,'name',v_instance.boss_name,'team','ENEMY','alignment','CHAOS',
  'stats',jsonb_build_object('hp',v_instance.max_hp,'atk',v_instance.atk,'def',v_instance.def,'spd',v_instance.spd,'luk',v_instance.luk),'skills','[]'::jsonb));
 v_seed:=floor(random()*2147483646)::bigint+1;
 insert into public.battle_replay_sessions(requester_user_id,battle_mode,source_reference_id,tactic_id,random_seed,player_snapshot,enemy_snapshot,
  resolution_authority,finalization_status,official_context)
 values(v_user_id,'RAID',p_instance_id,p_tactic,v_seed,v_players,v_enemy,'RAID_SERVER','PENDING',jsonb_build_object(
  'guildIdSnapshot',v_guild_id,'costType',v_cost_type,'cost',v_cost,'remainingRaidPoints',v_user.raid_points,
  'bossHpAtStart',v_instance.current_hp,'bossMaxHp',v_instance.max_hp,'baseId',v_instance.base_id)) returning id into v_replay;
 return jsonb_build_object('replay_session_id',v_replay,'player_snapshot',v_players,'enemy_snapshot',v_enemy,
  'cost_type',v_cost_type,'cost',v_cost,'remaining_raid_points',v_user.raid_points,'guild_id_snapshot',v_guild_id);
end $$;

alter table public.canonical_user_level_master enable row level security;
alter table public.canonical_action_resource_master enable row level security;
alter table public.canonical_quest_resource_cost enable row level security;
revoke all on public.canonical_user_level_master,public.canonical_action_resource_master,public.canonical_quest_resource_cost from public,anon,authenticated;
grant select on public.canonical_user_level_master,public.canonical_action_resource_master,public.canonical_quest_resource_cost to authenticated;
revoke all on function public.apply_user_xp(uuid,integer),public.sync_and_recover_vitality_and_pvp_points(uuid),public.use_energy_drink(),
 public.get_current_raid_attempt_state(),public.start_pvp_battle(uuid,text[],text),public.start_patrol(text,text),public.start_raid_battle(uuid,text[],text) from public,anon;
grant execute on function public.sync_and_recover_vitality_and_pvp_points(uuid),public.use_energy_drink(),public.get_current_raid_attempt_state(),
 public.start_pvp_battle(uuid,text[],text),public.start_patrol(text,text),public.start_raid_battle(uuid,text[],text) to authenticated;

commit;
notify pgrst,'reload schema';
