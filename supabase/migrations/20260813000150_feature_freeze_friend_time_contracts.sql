-- Pre-M9 Feature Freeze: canonical Friend/Invitation flows and server-owned
-- Raid daily configuration. Existing data is retained; legacy caller-id RPCs
-- remain retired.

begin;

-- --------------------------------------------------------------------------
-- Friend request / friendship boundary
-- --------------------------------------------------------------------------
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  created_at timestamptz not null default clock_timestamp(),
  resolved_at timestamptz,
  check (sender_id <> receiver_id)
);
create unique index if not exists friend_requests_one_pending_pair_uidx
  on public.friend_requests(least(sender_id,receiver_id),greatest(sender_id,receiver_id))
  where status='PENDING';

alter table public.user_friends enable row level security;
alter table public.friend_requests enable row level security;
drop policy if exists user_friends_owner_read on public.user_friends;
create policy user_friends_owner_read on public.user_friends for select to authenticated
  using(user_id=auth.uid());
drop policy if exists friend_requests_participant_read on public.friend_requests;
create policy friend_requests_participant_read on public.friend_requests for select to authenticated
  using(sender_id=auth.uid() or receiver_id=auth.uid());
revoke all on public.user_friends,public.friend_requests from public,anon,authenticated;
grant select on public.user_friends,public.friend_requests to authenticated;

create or replace function public.search_user_by_name(p_username text)
returns table(id uuid,username text,avatar_url text,level integer)
language sql security definer set search_path=public as $$
 select u.id,u.username,u.avatar_url,u.level from public.users u
 where auth.uid() is not null and lower(btrim(u.username))=lower(btrim(p_username))
   and u.id<>auth.uid() limit 10
$$;

create or replace function public.send_friend_request(p_receiver_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sender uuid:=auth.uid(); v_request uuid;
begin
 if v_sender is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_receiver_id is null or p_receiver_id=v_sender then raise exception 'invalid friend target' using errcode='22023'; end if;
 if not exists(select 1 from public.users where id=p_receiver_id) then raise exception 'player not found' using errcode='P0002'; end if;
 if exists(select 1 from public.user_friends where user_id=v_sender and friend_id=p_receiver_id and status='ACCEPTED') then
  raise exception 'already friends' using errcode='23505';
 end if;
 if (select count(*) from public.user_friends where user_id=v_sender and status='ACCEPTED')>=30
    or (select count(*) from public.user_friends where user_id=p_receiver_id and status='ACCEPTED')>=30 then
  raise exception 'friend limit reached' using errcode='23514';
 end if;
 insert into public.friend_requests(sender_id,receiver_id) values(v_sender,p_receiver_id)
 returning id into v_request;
 return jsonb_build_object('request_id',v_request,'status','PENDING');
exception when unique_violation then raise exception 'friend request already pending' using errcode='23505';
end $$;

create or replace function public.accept_friend_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_request public.friend_requests%rowtype;
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 select * into v_request from public.friend_requests where id=p_request_id for update;
 if not found or v_request.receiver_id<>v_user or v_request.status<>'PENDING' then raise exception 'request is not acceptable' using errcode='42501'; end if;
 if (select count(*) from public.user_friends where user_id=v_request.sender_id and status='ACCEPTED')>=30
    or (select count(*) from public.user_friends where user_id=v_request.receiver_id and status='ACCEPTED')>=30 then
  raise exception 'friend limit reached' using errcode='23514';
 end if;
 insert into public.user_friends(user_id,friend_id,status) values
  (v_request.sender_id,v_request.receiver_id,'ACCEPTED'),(v_request.receiver_id,v_request.sender_id,'ACCEPTED')
 on conflict(user_id,friend_id) do update set status='ACCEPTED',updated_at=clock_timestamp();
 update public.friend_requests set status='ACCEPTED',resolved_at=clock_timestamp() where id=p_request_id;
 return jsonb_build_object('status','ACCEPTED');
end $$;

create or replace function public.reject_friend_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 update public.friend_requests set status='REJECTED',resolved_at=clock_timestamp()
 where id=p_request_id and receiver_id=v_user and status='PENDING';
 if not found then raise exception 'request is not rejectable' using errcode='42501'; end if;
 return jsonb_build_object('status','REJECTED');
end $$;

create or replace function public.remove_friend(p_friend_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_deleted integer;
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 delete from public.user_friends where (user_id=v_user and friend_id=p_friend_id) or (user_id=p_friend_id and friend_id=v_user);
 get diagnostics v_deleted=row_count;
 if v_deleted=0 then raise exception 'friendship not found' using errcode='P0002'; end if;
 return jsonb_build_object('status','REMOVED');
end $$;

create or replace function public.get_friend_helper_loadout(p_friend_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.user_friends
   where user_id=auth.uid() and friend_id=p_friend_user_id and status='ACCEPTED') then
  raise exception 'accepted friendship required' using errcode='42501';
 end if;
 return public.get_public_battle_loadout(p_friend_user_id);
end $$;

-- Old two-party functions stay service-only; clients receive only auth.uid based APIs.
revoke all on function public.send_friend_request(uuid,uuid),public.accept_friend_request(uuid,uuid),public.remove_friend(uuid,uuid) from public,anon,authenticated;
revoke all on function public.search_user_by_name(text),public.send_friend_request(uuid),public.accept_friend_request(uuid),
 public.reject_friend_request(uuid),public.remove_friend(uuid),public.get_friend_helper_loadout(uuid) from public,anon;
grant execute on function public.search_user_by_name(text),public.send_friend_request(uuid),public.accept_friend_request(uuid),
 public.reject_friend_request(uuid),public.remove_friend(uuid),public.get_friend_helper_loadout(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- Invitation: code -> anonymous initialization -> immutable relationship.
-- --------------------------------------------------------------------------
create unique index if not exists user_invitations_invitee_uidx on public.user_invitations(invitee_user_id);
create unique index if not exists user_invitations_pair_uidx on public.user_invitations(inviter_user_id,invitee_user_id);
alter table public.user_invitations enable row level security;
drop policy if exists "participants access to user_invitations" on public.user_invitations;
drop policy if exists user_invitations_participant_read on public.user_invitations;
create policy user_invitations_participant_read on public.user_invitations for select to authenticated
 using(inviter_user_id=auth.uid() or invitee_user_id=auth.uid());
revoke all on public.user_invitations from public,anon,authenticated;
grant select on public.user_invitations to authenticated;

insert into public.missions(id,category,trigger_type,title,desc_text,description,target_value,condition_params,
 reward_item_id,reward_qty,reward_quantity,display_order,is_enabled,is_repeatable,is_provisional)
select 'ob_invite_'||lpad(n::text,2,'0'),'NORMAL','USER_INVITE','盟友の招聘 '||n,
 n||'人の新規プレイヤーを招待する',n||'人の新規プレイヤーを招待する',n,
 jsonb_build_object('balance_status','PROVISIONAL','invite_tier',n),'DIAMOND',100,100,100+n,true,false,true
from generate_series(1,10) n
on conflict(id) do update set target_value=excluded.target_value,condition_params=excluded.condition_params,
 reward_item_id=excluded.reward_item_id,reward_qty=excluded.reward_qty,reward_quantity=excluded.reward_quantity,
 is_enabled=true,is_provisional=true;

create or replace function public.generate_current_user_invite_code()
returns text language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 return public.generate_user_gift_code(auth.uid());
end $$;

create or replace function public.apply_current_player_invitation(p_gift_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_invitee uuid:=auth.uid(); v_inviter uuid; v_code text:=upper(btrim(p_gift_code)); v_count integer;
begin
 if v_invitee is null then raise exception 'authentication required' using errcode='42501'; end if;
 if v_code is null or v_code='' then return jsonb_build_object('status','NONE'); end if;
 select id into v_inviter from public.users where gift_code=v_code;
 if v_inviter is null then raise exception 'invitation code not found' using errcode='P0002'; end if;
 if v_inviter=v_invitee then raise exception 'self invitation is not allowed' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('INVITE:'||v_inviter::text,0));
 if exists(select 1 from public.user_invitations where invitee_user_id=v_invitee) then
  raise exception 'invitee already linked' using errcode='23505';
 end if;
 select count(*) into v_count from public.user_invitations where inviter_user_id=v_inviter;
 if v_count>=10 then raise exception 'invitation limit reached' using errcode='23514'; end if;
 insert into public.user_invitations(inviter_user_id,invitee_user_id,gift_code) values(v_inviter,v_invitee,v_code);
 v_count:=v_count+1;
 insert into public.presents(user_id,item_id,quantity,message,status,expire_at)
 values(v_invitee,'DIAMOND',100,'友達招待コード入力報酬','UNCLAIMED',clock_timestamp()+interval '30 days');
 insert into public.user_missions(user_id,mission_id,current_progress,progress_val,status)
 select v_inviter,m.id,least(v_count,m.target_value),least(v_count,m.target_value),
  case when v_count>=m.target_value then 'CLEAR' else 'PROGRESS' end
 from public.missions m where m.trigger_type='USER_INVITE' and m.is_enabled
 on conflict(user_id,mission_id) do update set current_progress=excluded.current_progress,progress_val=excluded.progress_val,
  status=case when public.user_missions.status='CLAIMED' then 'CLAIMED' else excluded.status end,updated_at=clock_timestamp();
 return jsonb_build_object('status','APPLIED','inviter_user_id',v_inviter,'invite_count',v_count);
end $$;

create or replace function public.initialize_current_player(p_username text,p_invite_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_invitation jsonb;
begin
 v_result:=public.initialize_current_player(p_username);
 if v_result->>'status'='success' and nullif(btrim(coalesce(p_invite_code,'')),'') is not null then
  v_invitation:=public.apply_current_player_invitation(p_invite_code);
  v_result:=v_result||jsonb_build_object('invitation',v_invitation);
 end if;
 return v_result;
end $$;

revoke all on function public.generate_current_user_invite_code(),public.initialize_current_player(text,text) from public,anon;
grant execute on function public.generate_current_user_invite_code(),public.initialize_current_player(text,text) to authenticated;
revoke all on function public.apply_current_player_invitation(text) from public,anon,authenticated;

-- --------------------------------------------------------------------------
-- Raid daily attempt state and replaceable cost master (JST midnight).
-- --------------------------------------------------------------------------
create table if not exists public.raid_attempt_cost_master(
 attempt_number integer primary key check(attempt_number between 1 and 30),
 currency_type text not null check(currency_type in ('FREE','CASH','DIAMOND')),
 cost integer not null check(cost>=0),
 is_provisional boolean not null default true,
 updated_at timestamptz not null default clock_timestamp()
);
insert into public.raid_attempt_cost_master(attempt_number,currency_type,cost,is_provisional) values
 (1,'FREE',0,true),(2,'FREE',0,true),(3,'FREE',0,true),(4,'CASH',2000,true),(5,'CASH',4000,true),
 (6,'CASH',8000,true),(7,'DIAMOND',50,true),(8,'DIAMOND',50,true),(9,'DIAMOND',100,true),(10,'DIAMOND',100,true)
on conflict(attempt_number) do update set currency_type=excluded.currency_type,cost=excluded.cost,is_provisional=excluded.is_provisional;
alter table public.raid_attempt_cost_master enable row level security;
drop policy if exists raid_attempt_cost_read on public.raid_attempt_cost_master;
create policy raid_attempt_cost_read on public.raid_attempt_cost_master for select to authenticated using(true);
revoke all on public.raid_attempt_cost_master from public,anon,authenticated;
grant select on public.raid_attempt_cost_master to authenticated;

create or replace function public.get_current_raid_attempt_state()
returns jsonb language sql security definer set search_path=public as $$
 select case when auth.uid() is null then null else jsonb_build_object(
  'attemptDate',(clock_timestamp() at time zone 'Asia/Tokyo')::date,
  'attemptCount',coalesce((select attempt_count from public.user_raid_daily_attempts
    where user_id=auth.uid() and attempt_date=(clock_timestamp() at time zone 'Asia/Tokyo')::date),0),
  'maxAttempts',(select max(attempt_number) from public.raid_attempt_cost_master),
  'costs',(select jsonb_agg(jsonb_build_object('attempt',attempt_number,'type',currency_type,'cost',cost)
    order by attempt_number) from public.raid_attempt_cost_master)) end
$$;

create or replace function public.start_raid_battle(p_instance_id uuid,p_character_ids text[],p_tactic text default 'ATTACK_PRIORITY')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_user public.users%rowtype; v_instance record; v_count integer; v_cost_type text; v_cost integer;
 v_today date:=(clock_timestamp() at time zone 'Asia/Tokyo')::date; v_guild_id uuid; v_players jsonb; v_enemy jsonb; v_replay uuid; v_seed bigint;
begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_tactic not in ('ATTACK_PRIORITY','HEAL_PRIORITY','SKILL_PRIORITY','BALANCED','WEAKNESS_FOCUS') then raise exception 'invalid tactic'; end if;
 select * into v_user from public.users where id=v_user_id for update;
 if v_user.level<5 then raise exception 'player level 5 is required' using errcode='23514'; end if;
 select boss.*,master.boss_name,master.level boss_level,master.atk,master.def,master.spd,master.luk
 into v_instance from public.raid_bosses boss join public.raid_boss_master master on master.id=boss.boss_master_id
 where boss.id=p_instance_id and boss.status='ACTIVE' and boss.expires_at>clock_timestamp() for update of boss;
 if not found then raise exception 'Raid instance is not active' using errcode='P0002'; end if;
 insert into public.user_raid_daily_attempts(user_id,attempt_date,attempt_count) values(v_user_id,v_today,0) on conflict do nothing;
 select attempt_count+1 into v_count from public.user_raid_daily_attempts where user_id=v_user_id and attempt_date=v_today for update;
 select currency_type,cost into v_cost_type,v_cost from public.raid_attempt_cost_master where attempt_number=v_count;
 if not found then raise exception 'daily Raid attempt limit reached' using errcode='23514'; end if;
 if v_cost_type='CASH' and v_user.cash<v_cost then raise exception 'insufficient Cash' using errcode='23514'; end if;
 if v_cost_type='DIAMOND' and v_user.neon_diamonds<v_cost then raise exception 'insufficient Diamonds' using errcode='23514'; end if;
 update public.users set cash=cash-case when v_cost_type='CASH' then v_cost else 0 end,
  neon_diamonds=neon_diamonds-case when v_cost_type='DIAMOND' then v_cost else 0 end where id=v_user_id;
 update public.user_raid_daily_attempts set attempt_count=v_count,updated_at=clock_timestamp() where user_id=v_user_id and attempt_date=v_today;
 select guild_id into v_guild_id from public.guild_members where user_id=v_user_id;
 v_players:=public.build_server_battle_snapshot(v_user_id,p_character_ids,'PLAYER');
 v_enemy:=jsonb_build_array(jsonb_build_object('id','raid_'||v_instance.id,'name',v_instance.boss_name,'team','ENEMY','alignment','CHAOS',
  'stats',jsonb_build_object('hp',v_instance.max_hp,'atk',v_instance.atk,'def',v_instance.def,'spd',v_instance.spd,'luk',v_instance.luk),'skills','[]'::jsonb));
 v_seed:=floor(random()*2147483646)::bigint+1;
 insert into public.battle_replay_sessions(requester_user_id,battle_mode,source_reference_id,tactic_id,random_seed,player_snapshot,enemy_snapshot,
  resolution_authority,finalization_status,official_context)
 values(v_user_id,'RAID',p_instance_id,p_tactic,v_seed,v_players,v_enemy,'RAID_SERVER','PENDING',jsonb_build_object(
  'guildIdSnapshot',v_guild_id,'attemptNumber',v_count,'attemptDate',v_today,'costType',v_cost_type,'cost',v_cost,
  'bossHpAtStart',v_instance.current_hp,'bossMaxHp',v_instance.max_hp,'baseId',v_instance.base_id)) returning id into v_replay;
 return jsonb_build_object('replay_session_id',v_replay,'player_snapshot',v_players,'enemy_snapshot',v_enemy,
  'attempt_number',v_count,'attempt_date',v_today,'cost_type',v_cost_type,'cost',v_cost,'guild_id_snapshot',v_guild_id);
end $$;

alter function public.execute_character_gacha(uuid,text,integer,text) set timezone='Asia/Tokyo';
alter function public.execute_asset_gacha(uuid,text,integer,text) set timezone='Asia/Tokyo';
alter function public.get_recommended_guilds(integer) set timezone='Asia/Tokyo';
revoke all on function public.get_current_raid_attempt_state() from public,anon;
grant execute on function public.get_current_raid_attempt_state() to authenticated;
revoke all on function public.start_raid_battle(uuid,text[],text) from public,anon;
grant execute on function public.start_raid_battle(uuid,text[],text) to authenticated;

commit;
notify pgrst,'reload schema';
