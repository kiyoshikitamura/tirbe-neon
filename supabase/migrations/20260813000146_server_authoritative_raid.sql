-- Open Beta P0-A: instance-aware, server-authoritative two-location Raid.

begin;

alter table public.raid_boss_master
  add column if not exists boss_name text,
  add column if not exists level integer not null default 1,
  add column if not exists max_hp bigint,
  add column if not exists atk integer,
  add column if not exists def integer,
  add column if not exists luk integer not null default 5,
  add column if not exists skills jsonb not null default '[]'::jsonb,
  add column if not exists enabled boolean not null default true;
update public.raid_boss_master set
  boss_name = coalesce(boss_name, name), max_hp = coalesce(max_hp, base_hp),
  atk = coalesce(atk, base_atk), def = coalesce(def, base_def)
where boss_name is null or max_hp is null or atk is null or def is null;
alter table public.raid_boss_master alter column boss_name set not null;
alter table public.raid_boss_master alter column max_hp set not null;
alter table public.raid_boss_master alter column atk set not null;
alter table public.raid_boss_master alter column def set not null;

insert into public.raid_boss_master(id, name, base_hp, base_atk, base_def, spd, duration_minutes, rewards,
  boss_name, level, max_hp, atk, def, luk, skills, enabled)
values ('BOSS_001', '極道連合組長', 9999999, 250, 150, 100, 1440, '[]'::jsonb,
  '極道連合組長', 99, 9999999, 250, 150, 5, '[]'::jsonb, true)
on conflict (id) do update set enabled = true;

alter table public.raid_bosses
  add column if not exists boss_master_id text references public.raid_boss_master(id),
  add column if not exists spawned_at timestamptz not null default now(),
  add column if not exists cycle_id uuid not null default gen_random_uuid(),
  add column if not exists outcome text,
  add column if not exists outcome_finalized_at timestamptz;
update public.raid_bosses set boss_master_id = coalesce(boss_master_id, boss_id), spawned_at = coalesce(spawned_at, created_at);

alter table public.raid_damage_logs
  add column if not exists raid_boss_instance_id uuid references public.raid_bosses(id) on delete cascade,
  add column if not exists battle_replay_session_id uuid references public.battle_replay_sessions(id) on delete restrict,
  add column if not exists guild_id uuid references public.guilds(id) on delete set null,
  add column if not exists raw_damage bigint not null default 0,
  add column if not exists applied_damage bigint not null default 0;
create unique index if not exists raid_damage_logs_replay_uidx on public.raid_damage_logs(battle_replay_session_id)
  where battle_replay_session_id is not null;
create index if not exists raid_damage_logs_instance_personal_idx on public.raid_damage_logs(raid_boss_instance_id, user_id);
create index if not exists raid_damage_logs_instance_guild_idx on public.raid_damage_logs(raid_boss_instance_id, guild_id)
  where guild_id is not null;

create table if not exists public.user_raid_daily_attempts(
  user_id uuid not null references public.users(id) on delete cascade,
  attempt_date date not null,
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  updated_at timestamptz not null default now(),
  primary key(user_id, attempt_date)
);
create table if not exists public.raid_reward_grants(
  raid_boss_instance_id uuid not null references public.raid_bosses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reward_id integer not null references public.raid_rewards_master(id) on delete restrict,
  reward_reason text not null,
  granted_at timestamptz not null default now(),
  primary key(raid_boss_instance_id, user_id, reward_id, reward_reason)
);
alter table public.user_raid_daily_attempts enable row level security;
alter table public.raid_reward_grants enable row level security;
drop policy if exists user_raid_daily_attempts_own_read on public.user_raid_daily_attempts;
create policy user_raid_daily_attempts_own_read on public.user_raid_daily_attempts for select to authenticated using(user_id = auth.uid());
drop policy if exists raid_reward_grants_own_read on public.raid_reward_grants;
create policy raid_reward_grants_own_read on public.raid_reward_grants for select to authenticated using(user_id = auth.uid());
revoke all on public.user_raid_daily_attempts, public.raid_reward_grants from public, anon, authenticated;
grant select on public.user_raid_daily_attempts, public.raid_reward_grants to authenticated;

insert into public.raid_rewards_master(reward_type, threshold_val, item_id, quantity, reward_item_id, reward_quantity)
select seed.reward_type, seed.threshold_val, seed.item_id, seed.quantity, seed.item_id, seed.quantity
from (values
  ('DAMAGE_ACCUM'::text, 1000::bigint, 'CASH'::text, 500),
  ('DEFEAT'::text, 1::bigint, 'DIAMOND'::text, 10),
  ('FAILURE'::text, 1::bigint, 'CASH'::text, 200)
) seed(reward_type, threshold_val, item_id, quantity)
where not exists (
  select 1 from public.raid_rewards_master current
  where current.reward_type = seed.reward_type and current.threshold_val = seed.threshold_val
    and coalesce(current.reward_item_id, current.item_id) = seed.item_id
);

create or replace function public.grant_raid_reward(
  p_instance_id uuid, p_user_id uuid, p_reward_id integer, p_reason text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_reward record;
begin
  insert into public.raid_reward_grants(raid_boss_instance_id,user_id,reward_id,reward_reason)
  values(p_instance_id,p_user_id,p_reward_id,p_reason) on conflict do nothing;
  if not found then return false; end if;
  select coalesce(reward_item_id,item_id) item_id, greatest(coalesce(reward_quantity,quantity,1),1) quantity
  into v_reward from public.raid_rewards_master where id=p_reward_id;
  insert into public.presents(user_id,item_id,quantity,message,status,expire_at)
  values(p_user_id,v_reward.item_id,v_reward.quantity,'レイド報酬','UNCLAIMED',now()+interval '30 days');
  return true;
end; $$;

create or replace function public.finalize_expired_raid_instance(p_instance_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_instance public.raid_bosses%rowtype; v_participant record; v_reward record;
begin
  select * into v_instance from public.raid_bosses where id=p_instance_id for update;
  if not found or v_instance.outcome_finalized_at is not null then return; end if;
  if v_instance.status='ACTIVE' and v_instance.expires_at>now() then return; end if;
  update public.raid_bosses set status=case when current_hp=0 then 'DEFEATED' else 'EXPIRED' end,
    outcome=case when current_hp=0 then 'DEFEAT_SUCCESS' else 'TIMEOUT_FAILURE' end,
    outcome_finalized_at=now() where id=p_instance_id;
  for v_participant in select distinct user_id from public.raid_damage_logs where raid_boss_instance_id=p_instance_id loop
    for v_reward in select id from public.raid_rewards_master
      where reward_type=case when v_instance.current_hp=0 then 'DEFEAT' else 'FAILURE' end loop
      perform public.grant_raid_reward(p_instance_id,v_participant.user_id,v_reward.id,
        case when v_instance.current_hp=0 then 'DEFEAT' else 'FAILURE' end);
    end loop;
  end loop;
end; $$;

create or replace function public.rotate_daily_raids()
returns void language plpgsql security definer set search_path = public as $$
declare v_row record; v_needed integer; v_base text; v_master record;
begin
  perform pg_advisory_xact_lock(hashtextextended('OPEN_BETA_RAID_ROTATION',0));
  for v_row in select id from public.raid_bosses where status='ACTIVE' and expires_at<=now() for update loop
    perform public.finalize_expired_raid_instance(v_row.id);
  end loop;
  select greatest(0,2-count(*)) into v_needed from public.raid_bosses where status='ACTIVE' and expires_at>now();
  select * into v_master from public.raid_boss_master where enabled order by id limit 1;
  if v_master.id is null then raise exception 'Raid boss master is unavailable'; end if;
  while v_needed>0 loop
    select candidate into v_base from unnest(array['shinjuku','shibuya','ikebukuro','roppongi','akihabara']) candidate
    where not exists(select 1 from public.raid_bosses where status='ACTIVE' and expires_at>now() and base_id=candidate)
    order by random() limit 1;
    insert into public.raid_bosses(boss_id,boss_master_id,current_hp,max_hp,base_id,status,spawned_at,expires_at,cycle_id)
    values(v_master.id,v_master.id,v_master.max_hp,v_master.max_hp,v_base,'ACTIVE',now(),now()+interval '24 hours',gen_random_uuid());
    v_needed:=v_needed-1;
  end loop;
end; $$;

create or replace function public.get_active_raids()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform public.rotate_daily_raids();
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',boss.id,'bossMasterId',boss.boss_master_id,'bossName',master.boss_name,'level',master.level,
    'currentHp',boss.current_hp,'maxHp',boss.max_hp,'baseId',boss.base_id,
    'spawnedAt',boss.spawned_at,'expiresAt',boss.expires_at,'status',boss.status
  ) order by boss.base_id) from public.raid_bosses boss join public.raid_boss_master master on master.id=boss.boss_master_id
  where boss.status='ACTIVE' and boss.expires_at>now()),'[]'::jsonb);
end; $$;

create or replace function public.start_raid_battle(p_instance_id uuid,p_character_ids text[],p_tactic text default 'ATTACK_PRIORITY')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user_id uuid:=auth.uid(); v_user public.users%rowtype; v_instance record; v_count integer; v_cost_type text; v_cost integer;
  v_guild_id uuid; v_players jsonb; v_enemy jsonb; v_replay uuid; v_seed bigint;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_tactic not in ('ATTACK_PRIORITY','HEAL_PRIORITY','SKILL_PRIORITY','BALANCED','WEAKNESS_FOCUS') then raise exception 'invalid tactic'; end if;
  select * into v_user from public.users where id=v_user_id for update;
  if v_user.level<5 then raise exception 'player level 5 is required' using errcode='23514'; end if;
  select boss.*,master.boss_name,master.level boss_level,master.atk,master.def,master.spd,master.luk
  into v_instance from public.raid_bosses boss join public.raid_boss_master master on master.id=boss.boss_master_id
  where boss.id=p_instance_id and boss.status='ACTIVE' and boss.expires_at>now() for update of boss;
  if not found then raise exception 'Raid instance is not active' using errcode='P0002'; end if;
  insert into public.user_raid_daily_attempts(user_id,attempt_date,attempt_count) values(v_user_id,current_date,0)
  on conflict do nothing;
  select attempt_count into v_count from public.user_raid_daily_attempts where user_id=v_user_id and attempt_date=current_date for update;
  v_count:=v_count+1; if v_count>10 then raise exception 'daily Raid attempt limit reached' using errcode='23514'; end if;
  v_cost_type:=case when v_count<=3 then 'FREE' when v_count<=6 then 'CASH' else 'DIAMOND' end;
  v_cost:=case v_count when 4 then 2000 when 5 then 4000 when 6 then 8000 when 7 then 50 when 8 then 50 when 9 then 100 when 10 then 100 else 0 end;
  if v_cost_type='CASH' and v_user.cash<v_cost then raise exception 'insufficient Cash' using errcode='23514'; end if;
  if v_cost_type='DIAMOND' and v_user.neon_diamonds<v_cost then raise exception 'insufficient Diamonds' using errcode='23514'; end if;
  update public.users set cash=cash-case when v_cost_type='CASH' then v_cost else 0 end,
    neon_diamonds=neon_diamonds-case when v_cost_type='DIAMOND' then v_cost else 0 end where id=v_user_id;
  update public.user_raid_daily_attempts set attempt_count=v_count,updated_at=now() where user_id=v_user_id and attempt_date=current_date;
  select guild_id into v_guild_id from public.guild_members where user_id=v_user_id;
  v_players:=public.build_server_battle_snapshot(v_user_id,p_character_ids,'PLAYER');
  v_enemy:=jsonb_build_array(jsonb_build_object('id','raid_'||v_instance.id,'name',v_instance.boss_name,'team','ENEMY','alignment','CHAOS',
    'stats',jsonb_build_object('hp',v_instance.max_hp,'atk',v_instance.atk,'def',v_instance.def,'spd',v_instance.spd,'luk',v_instance.luk),
    'skills','[]'::jsonb));
  v_seed:=floor(random()*2147483646)::bigint+1;
  insert into public.battle_replay_sessions(requester_user_id,battle_mode,source_reference_id,tactic_id,random_seed,player_snapshot,enemy_snapshot,
    resolution_authority,finalization_status,official_context)
  values(v_user_id,'RAID',p_instance_id,p_tactic,v_seed,v_players,v_enemy,'RAID_SERVER','PENDING',jsonb_build_object(
    'guildIdSnapshot',v_guild_id,'attemptNumber',v_count,'costType',v_cost_type,'cost',v_cost,'bossHpAtStart',v_instance.current_hp,
    'bossMaxHp',v_instance.max_hp,'baseId',v_instance.base_id)) returning id into v_replay;
  return jsonb_build_object('replay_session_id',v_replay,'player_snapshot',v_players,'enemy_snapshot',v_enemy,
    'attempt_number',v_count,'cost_type',v_cost_type,'cost',v_cost,'guild_id_snapshot',v_guild_id);
end; $$;

create or replace function public.finalize_raid_battle(p_replay_id uuid,p_result jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_replay public.battle_replay_sessions%rowtype; v_instance public.raid_bosses%rowtype; v_raw bigint; v_applied bigint;
  v_remaining bigint; v_total bigint; v_reward record; v_final jsonb;
begin
  select * into v_replay from public.battle_replay_sessions where id=p_replay_id for update;
  if not found or v_replay.battle_mode<>'RAID' or v_replay.resolution_authority<>'RAID_SERVER' then raise exception 'not an official Raid replay' using errcode='42501'; end if;
  if v_replay.finalization_status='FINALIZED' then return v_replay.finalization_result; end if;
  if v_replay.status<>'PENDING' or v_replay.finalization_status<>'PENDING' then raise exception 'Raid replay is not finalizable'; end if;
  perform public.validate_official_battle_result(p_result);
  select * into v_instance from public.raid_bosses where id=v_replay.source_reference_id for update;
  if not found then raise exception 'Raid instance missing'; end if;
  v_raw:=greatest(coalesce((p_result->>'playerRawDamage')::bigint,0),0);
  v_applied:=least(v_raw,greatest(v_instance.current_hp,0)); v_remaining:=greatest(v_instance.current_hp-v_applied,0);
  update public.raid_bosses set current_hp=v_remaining,status=case when v_remaining=0 then 'DEFEATED' else status end where id=v_instance.id;
  insert into public.raid_damage_logs(boss_id,raid_boss_id,user_id,damage,damage_dealt,raid_boss_instance_id,battle_replay_session_id,guild_id,raw_damage,applied_damage)
  values(v_instance.boss_id,v_instance.boss_id,v_replay.requester_user_id,v_raw,v_raw,v_instance.id,p_replay_id,
    nullif(v_replay.official_context->>'guildIdSnapshot','')::uuid,v_raw,v_applied);
  select coalesce(sum(raw_damage),0) into v_total from public.raid_damage_logs where raid_boss_instance_id=v_instance.id and user_id=v_replay.requester_user_id;
  for v_reward in select id from public.raid_rewards_master where reward_type='DAMAGE_ACCUM' and threshold_val<=v_total loop
    perform public.grant_raid_reward(v_instance.id,v_replay.requester_user_id,v_reward.id,'DAMAGE_ACCUM');
  end loop;
  if v_remaining=0 then perform public.finalize_expired_raid_instance(v_instance.id); end if;
  v_final:=p_result||jsonb_build_object('mode','RAID','raidInstanceId',v_instance.id,'baseId',v_instance.base_id,
    'rawDamage',v_raw,'appliedDamage',v_applied,'remainingBossHp',v_remaining,'personalContribution',v_total,
    'guildIdSnapshot',v_replay.official_context->>'guildIdSnapshot');
  insert into public.battle_replay_events(battle_replay_session_id,event_index,round_number,event_type,payload)
  select p_replay_id,greatest(coalesce((e.value->>'index')::integer,e.ordinality::integer-1),0),greatest(coalesce((e.value->>'round')::integer,1),1),
    coalesce(nullif(e.value->>'type',''),'UNKNOWN'),coalesce(e.value->'payload','{}'::jsonb)
  from jsonb_array_elements(p_result->'events') with ordinality e(value,ordinality) on conflict do nothing;
  update public.battle_replay_sessions set status='RESOLVED',result=v_final,resolved_at=now(),finalization_status='FINALIZED',finalized_at=now(),finalization_result=v_final where id=p_replay_id;
  return v_final;
end; $$;

create or replace function public.get_raid_rankings(p_instance_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  return jsonb_build_object(
    'individual',coalesce((select jsonb_agg(to_jsonb(r) order by r.contribution desc) from (
      select log.user_id,user_row.username,sum(log.raw_damage) contribution,log.guild_id,guild.name guild_name
      from public.raid_damage_logs log join public.users user_row on user_row.id=log.user_id left join public.guilds guild on guild.id=log.guild_id
      where log.raid_boss_instance_id=p_instance_id group by log.user_id,user_row.username,log.guild_id,guild.name order by contribution desc limit 100) r),'[]'::jsonb),
    'guild',coalesce((select jsonb_agg(to_jsonb(r) order by r.contribution desc) from (
      select log.guild_id,guild.name guild_name,sum(log.raw_damage) contribution,count(distinct log.user_id) participant_count
      from public.raid_damage_logs log join public.guilds guild on guild.id=log.guild_id
      where log.raid_boss_instance_id=p_instance_id and log.guild_id is not null group by log.guild_id,guild.name order by contribution desc limit 100) r),'[]'::jsonb)
  );
end; $$;

do $$ begin perform public.rotate_daily_raids(); end $$;

revoke all on function public.grant_raid_reward(uuid,uuid,integer,text), public.finalize_expired_raid_instance(uuid), public.rotate_daily_raids(), public.finalize_raid_battle(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.grant_raid_reward(uuid,uuid,integer,text), public.finalize_expired_raid_instance(uuid), public.rotate_daily_raids(), public.finalize_raid_battle(uuid,jsonb) to service_role;
revoke all on function public.get_active_raids(), public.start_raid_battle(uuid,text[],text), public.get_raid_rankings(uuid) from public,anon;
grant execute on function public.get_active_raids(), public.start_raid_battle(uuid,text[],text), public.get_raid_rankings(uuid) to authenticated;

commit;
notify pgrst,'reload schema';
