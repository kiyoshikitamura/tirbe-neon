-- Guild Production Social Core. Generated from guild_production_20260823.json.
-- Development promotion only until the guarded Preview replay is authorized.
begin;

create table if not exists public.canonical_guild_progression_master(
  level integer primary key check(level between 1 and 5),
  required_exp integer not null check(required_exp>=0), cumulative_exp integer not null check(cumulative_exp>=0),
  member_cap integer not null check(member_cap between 1 and 20), version text not null, is_production_enabled boolean not null default true
);
insert into public.canonical_guild_progression_master values
 (1,1000,0,10,'2026-08-23',true),(2,2500,1000,12,'2026-08-23',true),(3,6000,3500,14,'2026-08-23',true),
 (4,12000,9500,17,'2026-08-23',true),(5,0,21500,20,'2026-08-23',true)
on conflict(level) do update set required_exp=excluded.required_exp,cumulative_exp=excluded.cumulative_exp,member_cap=excluded.member_cap,version=excluded.version,is_production_enabled=true;

create table if not exists public.canonical_guild_exp_source_master(
 source text primary key, exp_grant integer not null, daily_per_member integer not null, event_threshold integer not null default 1,
 enabled boolean not null, version text not null
);
insert into public.canonical_guild_exp_source_master values
 ('LOGIN',10,1,1,true,'2026-08-23'),('FIRST_GUILD_CHAT',10,1,1,true,'2026-08-23'),('QUEST_3_CLEAR',10,1,3,true,'2026-08-23'),
 ('PVP_FINALIZED',10,1,1,true,'2026-08-23'),('RAID_FINALIZED',15,1,1,true,'2026-08-23'),('DONATION',20,1,1,true,'2026-08-23'),
 ('GVG',0,0,1,false,'2026-08-23')
on conflict(source) do update set exp_grant=excluded.exp_grant,daily_per_member=excluded.daily_per_member,event_threshold=excluded.event_threshold,enabled=excluded.enabled,version=excluded.version;

create table if not exists public.canonical_guild_role_master(role text primary key,permissions jsonb not null,version text not null);
insert into public.canonical_guild_role_master values
 ('MASTER','["APPLICATION_APPROVE","APPLICATION_REJECT","MEMBER_KICK","SUB_MASTER_KICK","ROLE_ASSIGNMENT","RECRUITMENT_EDIT","DESCRIPTION_EDIT","WELCOME_EDIT","GUILD_SHOP","LEADER_TRANSFER","DISBAND"]','2026-08-23'),
 ('SUB_MASTER','["APPLICATION_APPROVE","APPLICATION_REJECT","MEMBER_KICK","RECRUITMENT_EDIT","DESCRIPTION_EDIT","WELCOME_EDIT","GUILD_SHOP"]','2026-08-23'),
 ('MEMBER','["GUILD_CHAT","DONATION","GUILD_CONTENT"]','2026-08-23')
on conflict(role) do update set permissions=excluded.permissions,version=excluded.version;

create table if not exists public.canonical_guild_recruitment_master(mode text primary key,accepts_direct_join boolean not null,accepts_new_application boolean not null,version text not null);
insert into public.canonical_guild_recruitment_master values
 ('OPEN_JOIN',true,false,'2026-08-23'),('APPLICATION_REQUIRED',false,true,'2026-08-23'),('CLOSED',false,false,'2026-08-23')
on conflict(mode) do update set accepts_direct_join=excluded.accepts_direct_join,accepts_new_application=excluded.accepts_new_application,version=excluded.version;

create table if not exists public.canonical_guild_donation_master(id text primary key,cash_cost integer not null,guild_exp integer not null,daily_per_member integer not null,version text not null);
insert into public.canonical_guild_donation_master values('PRODUCTION_DONATION',5000,20,1,'2026-08-23')
on conflict(id) do update set cash_cost=excluded.cash_cost,guild_exp=excluded.guild_exp,daily_per_member=excluded.daily_per_member,version=excluded.version;

update public.guild_level_master legacy set next_xp=canonical.required_exp,max_members=canonical.member_cap,member_buff_atk=0,member_buff_hp=0
from public.canonical_guild_progression_master canonical where legacy.level=canonical.level;
update public.guild_recommendation_weights set is_provisional=false,updated_at=now() where config_key in
 ('active_member_7d','raid_participant_7d','chat_member_7d','activity_contributor_7d','target_fill_bonus','instant_join_bonus','raid_contribution_scale','guild_power_scale','inactive_14d_penalty','stale_request_penalty','rotation_range');

alter table public.guilds add column if not exists recruitment_mode text;
alter table public.guilds add column if not exists is_disbanded boolean not null default false;
alter table public.guilds add column if not exists disbanded_at timestamptz;
update public.guilds set recruitment_mode=case when approval_required then 'APPLICATION_REQUIRED' else 'OPEN_JOIN' end where recruitment_mode is null;
alter table public.guilds alter column recruitment_mode set default 'OPEN_JOIN';
alter table public.guilds alter column recruitment_mode set not null;
alter table public.guilds drop constraint if exists guilds_recruitment_mode_check;
alter table public.guilds add constraint guilds_recruitment_mode_check check(recruitment_mode in('OPEN_JOIN','APPLICATION_REQUIRED','CLOSED'));
alter table public.guilds drop constraint if exists guilds_production_name_length_check;
alter table public.guilds add constraint guilds_production_name_length_check check(char_length(trim(name)) between 1 and 12) not valid;
create unique index if not exists guilds_normalized_active_name_uidx on public.guilds(lower(trim(name))) where not is_disbanded;

create table if not exists public.guild_exp_daily_ledger(
 id uuid primary key default gen_random_uuid(), guild_id uuid not null references public.guilds(id), user_id uuid not null references public.users(id),
 source text not null references public.canonical_guild_exp_source_master(source), jst_date date not null, exp_granted integer not null,
 source_reference_id uuid, created_at timestamptz not null default now(), unique(guild_id,user_id,source,jst_date)
);
create table if not exists public.guild_exp_daily_progress(
 guild_id uuid not null references public.guilds(id), user_id uuid not null references public.users(id), source text not null,
 jst_date date not null,event_count integer not null default 0,updated_at timestamptz not null default now(),primary key(guild_id,user_id,source,jst_date)
);
alter table public.guild_exp_daily_ledger enable row level security;
alter table public.guild_exp_daily_progress enable row level security;
revoke all on public.canonical_guild_progression_master,public.canonical_guild_exp_source_master,public.canonical_guild_role_master,
 public.canonical_guild_recruitment_master,public.canonical_guild_donation_master,public.guild_exp_daily_ledger,public.guild_exp_daily_progress from public,anon,authenticated;
grant select on public.canonical_guild_progression_master,public.canonical_guild_exp_source_master,public.canonical_guild_role_master,
 public.canonical_guild_recruitment_master,public.canonical_guild_donation_master to authenticated;
create policy guild_exp_ledger_own_read on public.guild_exp_daily_ledger for select to authenticated using(user_id=auth.uid());
grant select on public.guild_exp_daily_ledger to authenticated;

create or replace function public.guild_jst_date(p_at timestamptz default now()) returns date language sql stable set search_path=public as $$
 select (p_at at time zone 'Asia/Tokyo')::date
$$;
create or replace function public.canonical_guild_member_cap(p_guild_id uuid) returns integer language sql stable set search_path=public as $$
 select coalesce((select member_cap from public.canonical_guild_progression_master m join public.guilds g on g.level=m.level where g.id=p_guild_id),10)
$$;

create or replace function public.apply_canonical_guild_exp(p_guild_id uuid,p_exp integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_level integer;v_xp integer;v_required integer;
begin
 if p_exp<0 then raise exception 'guild EXP cannot be negative'; end if;
 select level,xp into v_level,v_xp from public.guilds where id=p_guild_id and not is_disbanded for update;
 if not found then raise exception 'active guild not found'; end if;
 v_xp:=coalesce(v_xp,0)+p_exp;
 while v_level<5 loop
  select required_exp into v_required from public.canonical_guild_progression_master where level=v_level;
  exit when v_xp<v_required;
  v_xp:=v_xp-v_required; v_level:=v_level+1;
 end loop;
 update public.guilds set level=v_level,xp=v_xp where id=p_guild_id;
 return jsonb_build_object('level',v_level,'xp',v_xp,'memberCap',public.canonical_guild_member_cap(p_guild_id));
end $$;

create or replace function public.grant_canonical_guild_daily_exp(p_user_id uuid,p_source text,p_source_reference_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_guild uuid;v_exp integer;v_day date:=public.guild_jst_date();v_result jsonb;
begin
 select guild_id into v_guild from public.guild_members where user_id=p_user_id;
 if v_guild is null then return jsonb_build_object('status','not_in_guild'); end if;
 select exp_grant into v_exp from public.canonical_guild_exp_source_master where source=p_source and enabled and daily_per_member=1;
 if not found then raise exception 'unsupported Guild EXP source'; end if;
 insert into public.guild_exp_daily_ledger(guild_id,user_id,source,jst_date,exp_granted,source_reference_id)
 values(v_guild,p_user_id,p_source,v_day,v_exp,p_source_reference_id) on conflict(guild_id,user_id,source,jst_date) do nothing;
 if not found then return jsonb_build_object('status','already_recorded','source',p_source); end if;
 v_result:=public.apply_canonical_guild_exp(v_guild,v_exp);
 return jsonb_build_object('status','granted','source',p_source,'expGained',v_exp,'guild',v_result);
end $$;

create or replace function public.record_current_guild_login() returns jsonb language plpgsql security definer set search_path=public as $$
begin if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 return public.grant_canonical_guild_daily_exp(auth.uid(),'LOGIN',null); end $$;

create or replace function public.on_canonical_guild_chat_exp() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.target_type='GUILD' and not coalesce(new.is_system,false) and new.user_id is not null then
 perform public.grant_canonical_guild_daily_exp(new.user_id,'FIRST_GUILD_CHAT',new.id); end if; return new; end $$;
drop trigger if exists canonical_guild_chat_exp_trigger on public.board_posts;
create trigger canonical_guild_chat_exp_trigger after insert on public.board_posts for each row execute function public.on_canonical_guild_chat_exp();

create or replace function public.on_canonical_guild_quest_exp() returns trigger language plpgsql security definer set search_path=public as $$
declare v_guild uuid;v_day date:=public.guild_jst_date();v_count integer;
begin
 if new.status not in('COMPLETED','CLAIMABLE','CLAIMED') or old.status in('COMPLETED','CLAIMABLE','CLAIMED') then return new; end if;
 select guild_id into v_guild from public.guild_members where user_id=new.user_id; if v_guild is null then return new; end if;
 insert into public.guild_exp_daily_progress(guild_id,user_id,source,jst_date,event_count) values(v_guild,new.user_id,'QUEST_3_CLEAR',v_day,1)
 on conflict(guild_id,user_id,source,jst_date) do update set event_count=public.guild_exp_daily_progress.event_count+1,updated_at=now() returning event_count into v_count;
 if v_count=3 then perform public.grant_canonical_guild_daily_exp(new.user_id,'QUEST_3_CLEAR',new.id); end if; return new;
end $$;
drop trigger if exists canonical_guild_quest_exp_trigger on public.user_patrols;
create trigger canonical_guild_quest_exp_trigger after update of status on public.user_patrols for each row execute function public.on_canonical_guild_quest_exp();

create or replace function public.on_canonical_guild_official_battle_exp() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.finalization_status='FINALIZED' and old.finalization_status is distinct from 'FINALIZED' then
 if new.battle_mode='PVP' and new.resolution_authority='PVP_SERVER' then perform public.grant_canonical_guild_daily_exp(new.requester_user_id,'PVP_FINALIZED',new.id);
 elsif new.battle_mode='RAID' and new.resolution_authority='RAID_SERVER' then perform public.grant_canonical_guild_daily_exp(new.requester_user_id,'RAID_FINALIZED',new.id); end if; end if; return new; end $$;
drop trigger if exists canonical_guild_official_battle_exp_trigger on public.battle_replay_sessions;
create trigger canonical_guild_official_battle_exp_trigger after update of finalization_status on public.battle_replay_sessions for each row execute function public.on_canonical_guild_official_battle_exp();

create or replace function public.create_guild_v2(p_user_id uuid,p_guild_name text,p_creation_cost integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user public.users%rowtype;v_name text:=trim(coalesce(p_guild_name,''));v_guild uuid;
begin
 if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'Only the current user can create a guild'; end if;
 if char_length(v_name) not between 1 and 12 or p_creation_cost<>5000 then raise exception 'Invalid guild creation request'; end if;
 select * into v_user from public.users where id=auth.uid() for update;
 if not found or v_user.level<8 or v_user.cash<5000 then raise exception 'Guild creation requirements are not met'; end if;
 if v_user.last_guild_left_at is not null and v_user.last_guild_left_at>now()-interval '24 hours' then raise exception 'Guild rejoin cooldown is active'; end if;
 if exists(select 1 from public.guild_members where user_id=auth.uid()) then raise exception 'Leave the current guild before creating another guild'; end if;
 perform 1 from public.guilds where lower(trim(name))=lower(v_name) and not is_disbanded for update;
 if found then raise exception 'Guild name is already in use' using errcode='23505'; end if;
 update public.guild_join_requests set status='CANCELLED',reviewed_at=now(),reviewed_by=auth.uid() where user_id=auth.uid() and status='PENDING';
 insert into public.guilds(name,leader_id,level,xp,funds,recruitment_mode,approval_required) values(v_name,auth.uid(),1,0,0,'OPEN_JOIN',false) returning id into v_guild;
 insert into public.guild_members(guild_id,user_id,role,weekly_contribution,total_contribution) values(v_guild,auth.uid(),'MASTER',0,0);
 update public.users set cash=cash-5000,guild_id=v_guild where id=auth.uid();
 perform public.evaluate_mission_progress(auth.uid(),'GUILD_JOIN',1);
 return jsonb_build_object('status','success','guild_id',v_guild);
end $$;

create or replace function public.join_guild(p_guild_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_mode text;v_cap integer;v_count integer;v_user public.users%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication is required'; end if; select * into v_user from public.users where id=auth.uid() for update;
 if v_user.last_guild_left_at is not null and v_user.last_guild_left_at>now()-interval '24 hours' then raise exception 'Guild rejoin cooldown is active'; end if;
 if exists(select 1 from public.guild_members where user_id=auth.uid()) then raise exception 'Already in a guild'; end if;
 select recruitment_mode,public.canonical_guild_member_cap(id) into v_mode,v_cap from public.guilds where id=p_guild_id and not is_disbanded for update;
 if not found then raise exception 'Guild not found'; end if; if v_mode<>'OPEN_JOIN' then raise exception 'Guild does not accept direct joins'; end if;
 select count(*) into v_count from public.guild_members where guild_id=p_guild_id; if v_count>=v_cap then raise exception 'Guild member cap reached'; end if;
 insert into public.guild_members(guild_id,user_id,role,weekly_contribution,total_contribution) values(p_guild_id,auth.uid(),'MEMBER',0,0);
 update public.guild_join_requests set status='CANCELLED',reviewed_at=now(),reviewed_by=auth.uid() where user_id=auth.uid() and status='PENDING';
 perform public.evaluate_mission_progress(auth.uid(),'GUILD_JOIN',1); return jsonb_build_object('status','success');
end $$;

create or replace function public.request_guild_join(p_guild_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_mode text;v_cap integer;v_count integer;v_request uuid;
begin
 if auth.uid() is null then raise exception 'Authentication is required'; end if;
 if exists(select 1 from public.guild_members where user_id=auth.uid()) then raise exception 'Already in a guild'; end if;
 select recruitment_mode,public.canonical_guild_member_cap(id) into v_mode,v_cap from public.guilds where id=p_guild_id and not is_disbanded for update;
 if not found or v_mode<>'APPLICATION_REQUIRED' then raise exception 'Guild is not accepting applications'; end if;
 select count(*) into v_count from public.guild_members where guild_id=p_guild_id; if v_count>=v_cap then raise exception 'Guild member cap reached'; end if;
 if exists(select 1 from public.guild_join_requests where user_id=auth.uid() and status='PENDING') then raise exception 'A pending guild application already exists'; end if;
 insert into public.guild_join_requests(guild_id,user_id) values(p_guild_id,auth.uid()) returning id into v_request;
 return jsonb_build_object('status','pending','request_id',v_request);
end $$;

create or replace function public.review_guild_join_request(p_request_id uuid,p_approve boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_request public.guild_join_requests%rowtype;v_role text;v_cap integer;v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication is required'; end if;
 select * into v_request from public.guild_join_requests where id=p_request_id for update;
 if not found or v_request.status<>'PENDING' then raise exception 'Pending guild application not found'; end if;
 select role into v_role from public.guild_members where guild_id=v_request.guild_id and user_id=auth.uid();
 if coalesce(v_role,'') not in('MASTER','SUB_MASTER') then raise exception 'Guild application review permission required'; end if;
 perform 1 from public.guilds where id=v_request.guild_id and not is_disbanded for update; if not found then raise exception 'Active guild not found'; end if;
 if p_approve then
  if exists(select 1 from public.guild_members where user_id=v_request.user_id) then raise exception 'Applicant already belongs to a guild'; end if;
  v_cap:=public.canonical_guild_member_cap(v_request.guild_id); select count(*) into v_count from public.guild_members where guild_id=v_request.guild_id;
  if v_count>=v_cap then raise exception 'Guild member cap reached'; end if;
  insert into public.guild_members(guild_id,user_id,role,weekly_contribution,total_contribution) values(v_request.guild_id,v_request.user_id,'MEMBER',0,0);
  update public.guild_join_requests set status='CANCELLED',reviewed_at=now(),reviewed_by=auth.uid() where user_id=v_request.user_id and status='PENDING' and id<>p_request_id;
  perform public.evaluate_mission_progress(v_request.user_id,'GUILD_JOIN',1);
 end if;
 update public.guild_join_requests set status=case when p_approve then 'APPROVED' else 'REJECTED' end,reviewed_at=now(),reviewed_by=auth.uid() where id=p_request_id;
 return jsonb_build_object('status',case when p_approve then 'approved' else 'rejected' end);
end $$;

create or replace function public.update_guild_recruitment(p_guild_id uuid,p_mode text,p_description text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text;v_desc text:=trim(coalesce(p_description,''));
begin select role into v_role from public.guild_members where guild_id=p_guild_id and user_id=auth.uid();
 if coalesce(v_role,'') not in('MASTER','SUB_MASTER') then raise exception 'Guild setting permission required'; end if;
 if p_mode not in('OPEN_JOIN','APPLICATION_REQUIRED','CLOSED') or char_length(v_desc)>200 then raise exception 'Invalid guild recruitment settings'; end if;
 update public.guilds set recruitment_mode=p_mode,approval_required=(p_mode='APPLICATION_REQUIRED'),description=v_desc where id=p_guild_id and not is_disbanded;
 return jsonb_build_object('status','success','mode',p_mode); end $$;

create or replace function public.set_current_guild_welcome_message(p_message text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_guild uuid;v_clean text:=trim(coalesce(p_message,''));
begin select guild_id into v_guild from public.guild_members where user_id=auth.uid() and role in('MASTER','SUB_MASTER');
 if v_guild is null then raise exception 'Guild setting permission required'; end if; if char_length(v_clean)>120 then raise exception 'welcome message is too long'; end if;
 update public.guilds set welcome_message=nullif(v_clean,'') where id=v_guild and not is_disbanded; return jsonb_build_object('status','success','welcome_message',v_clean); end $$;

create or replace function public.transfer_guild_leader(p_guild_id uuid,p_old_id uuid,p_new_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_locked uuid;
begin if auth.uid() is null or auth.uid()<>p_old_id or p_old_id=p_new_id then raise exception 'Invalid guild leadership transfer'; end if;
 select id into v_locked from public.guilds where id=p_guild_id and leader_id=p_old_id and not is_disbanded for update;
 if not found then raise exception 'Only current Guild MASTER can transfer leadership'; end if;
 perform 1 from public.guild_members where guild_id=p_guild_id and user_id in(p_old_id,p_new_id) order by user_id for update;
 if not exists(select 1 from public.guild_members where guild_id=p_guild_id and user_id=p_new_id) then raise exception 'New MASTER must be a Guild member'; end if;
 update public.guild_members set role=case when user_id=p_old_id then 'SUB_MASTER' else 'MASTER' end where guild_id=p_guild_id and user_id in(p_old_id,p_new_id);
 update public.guilds set leader_id=p_new_id where id=p_guild_id; return jsonb_build_object('status','success'); end $$;

create or replace function public.donate_to_guild(p_user_id uuid,p_guild_id uuid,p_amount integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_cash bigint;v_inserted integer;v_result jsonb;v_day date:=public.guild_jst_date();
begin if auth.uid() is null or auth.uid()<>p_user_id or p_amount<>5000 then raise exception 'Invalid Production donation'; end if;
 if not exists(select 1 from public.guild_members where guild_id=p_guild_id and user_id=auth.uid()) then raise exception 'Guild membership required'; end if;
 select cash into v_cash from public.users where id=auth.uid() for update; if v_cash<5000 then raise exception 'Insufficient cash'; end if;
 perform 1 from public.guilds where id=p_guild_id and not is_disbanded for update; if not found then raise exception 'Active guild not found'; end if;
 insert into public.guild_exp_daily_ledger(guild_id,user_id,source,jst_date,exp_granted) values(p_guild_id,auth.uid(),'DONATION',v_day,20)
 on conflict(guild_id,user_id,source,jst_date) do nothing; get diagnostics v_inserted=row_count;
 if v_inserted=0 then raise exception 'Guild donation already completed today'; end if;
 update public.users set cash=cash-5000 where id=auth.uid() returning cash into v_cash;
 update public.guilds set funds=coalesce(funds,0)+5000 where id=p_guild_id;
 v_result:=public.apply_canonical_guild_exp(p_guild_id,20);
 return jsonb_build_object('status','success','next_cash',v_cash,'xp_gained',20,'guild',v_result); end $$;

create or replace function public.leave_guild(p_user_id uuid,p_guild_id uuid,p_is_master boolean,p_has_others boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text;v_other integer;
begin if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'Only current user can leave Guild'; end if;
 perform 1 from public.guilds where id=p_guild_id for update; select role into v_role from public.guild_members where guild_id=p_guild_id and user_id=auth.uid() for update;
 if v_role is null then raise exception 'Guild membership required'; end if; select count(*) into v_other from public.guild_members where guild_id=p_guild_id and user_id<>auth.uid();
 if v_role='MASTER' and v_other>0 then raise exception 'Transfer MASTER before leaving Guild'; end if;
 delete from public.guild_members where guild_id=p_guild_id and user_id=auth.uid(); update public.users set last_guild_left_at=now() where id=auth.uid();
 if v_role='MASTER' then update public.guilds set is_disbanded=true,disbanded_at=now(),recruitment_mode='CLOSED',approval_required=false where id=p_guild_id; end if;
 return jsonb_build_object('status','success','disbanded',v_role='MASTER'); end $$;

drop function if exists public.search_guilds(text);
create function public.search_guilds(p_query text default '') returns table(id uuid,name text,level integer,description text,approval_required boolean,member_count bigint,member_limit integer,recruitment_mode text,active_members_7d bigint)
language plpgsql stable security definer set search_path=public as $$
begin if auth.uid() is null then raise exception 'Authentication is required'; end if; if char_length(coalesce(p_query,''))>30 then raise exception 'Guild search query is too long'; end if;
 return query select g.id,g.name,g.level,g.description,g.approval_required,count(m.id),public.canonical_guild_member_cap(g.id),g.recruitment_mode,
  count(m.id) filter(where u.last_active_at>=now()-interval '7 days')
 from public.guilds g left join public.guild_members m on m.guild_id=g.id left join public.users u on u.id=m.user_id
 where not g.is_disbanded and (trim(coalesce(p_query,''))='' or g.name ilike '%'||trim(p_query)||'%')
 group by g.id order by g.level desc,g.name asc limit 50; end $$;

create or replace function public.get_recommended_guilds(p_limit integer default 5) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 return coalesce((with w as(select config_key,weight from public.guild_recommendation_weights),s as(
  select g.id guild_id,g.name,g.description,g.level,g.approval_required,g.recruitment_mode,count(gm.id)::integer member_count,
   public.canonical_guild_member_cap(g.id) member_limit,count(gm.id) filter(where u.last_active_at>=now()-interval '7 days')::integer active_members_7d,
   round((count(gm.id) filter(where u.last_active_at>=now()-interval '7 days')*coalesce((select weight from w where config_key='active_member_7d'),18)
   +case when g.recruitment_mode='OPEN_JOIN' then coalesce((select weight from w where config_key='instant_join_bonus'),12) else 0 end
   +case when count(gm.id)::numeric/greatest(public.canonical_guild_member_cap(g.id),1) between .5 and .8 then coalesce((select weight from w where config_key='target_fill_bonus'),45) else 0 end
   +(abs(hashtextextended(v_user::text||':'||g.id::text||':'||date_trunc('week',now())::text,0))%greatest(coalesce((select weight::integer from w where config_key='rotation_range'),9),1)))::numeric,2) recommendation_score
  from public.guilds g left join public.guild_members gm on gm.guild_id=g.id left join public.users u on u.id=gm.user_id
  where not g.is_disbanded and g.recruitment_mode<>'CLOSED' group by g.id
  having count(gm.id)<public.canonical_guild_member_cap(g.id)) select jsonb_agg(to_jsonb(x) order by recommendation_score desc,guild_id)
  from(select * from s order by recommendation_score desc,guild_id limit least(greatest(coalesce(p_limit,5),3),5))x),'[]'::jsonb); end $$;

-- Full v1.1 score: all eleven frozen inputs remain active. Recruitment mode is
-- the canonical eligibility source; weekly hash is deterministic rotation only.
create or replace function public.get_recommended_guilds(p_limit integer default 5)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 return coalesce((with weights as (
  select max(weight) filter(where config_key='active_member_7d') active_member,
   max(weight) filter(where config_key='raid_participant_7d') raid_participant,
   max(weight) filter(where config_key='chat_member_7d') chat_member,
   max(weight) filter(where config_key='activity_contributor_7d') activity_contributor,
   max(weight) filter(where config_key='target_fill_bonus') target_fill,
   max(weight) filter(where config_key='instant_join_bonus') instant_join,
   max(weight) filter(where config_key='raid_contribution_scale') raid_scale,
   max(weight) filter(where config_key='guild_power_scale') power_scale,
   max(weight) filter(where config_key='inactive_14d_penalty') inactive_penalty,
   max(weight) filter(where config_key='stale_request_penalty') stale_penalty,
   max(weight) filter(where config_key='rotation_range') rotation_range
  from public.guild_recommendation_weights
 ),scored as(
  select g.id guild_id,g.name,g.description,g.level,g.approval_required,g.recruitment_mode,
   stats.member_count,stats.member_limit,stats.fill_ratio,stats.active_members_7d,stats.raid_participants_7d,
   stats.raid_contribution_7d,stats.chatters_7d,stats.activity_contributors_7d,stats.guild_power,stats.stale_requests,
   round((stats.active_members_7d*coalesce(w.active_member,18)+stats.raid_participants_7d*coalesce(w.raid_participant,16)
    +stats.chatters_7d*coalesce(w.chat_member,10)+stats.activity_contributors_7d*coalesce(w.activity_contributor,12)
    +case when stats.fill_ratio between .5 and .8 and stats.active_members_7d>0 then coalesce(w.target_fill,45) else 0 end
    +case when g.recruitment_mode='OPEN_JOIN' then coalesce(w.instant_join,12) else 0 end
    +ln(greatest(stats.raid_contribution_7d,0)+1)*coalesce(w.raid_scale,4)
    +ln(greatest(stats.guild_power,0)+1)*coalesce(w.power_scale,2)
    -case when stats.last_active_at<now()-interval '14 days' or stats.last_active_at is null then coalesce(w.inactive_penalty,60) else 0 end
    -stats.stale_requests*coalesce(w.stale_penalty,8)
    +(abs(hashtextextended(v_user::text||':'||g.id::text||':'||date_trunc('week',now())::text,0))%greatest(coalesce(w.rotation_range,9)::integer,1)))::numeric,2) recommendation_score
  from public.guilds g cross join weights w cross join lateral(
   select (select count(*) from public.guild_members gm where gm.guild_id=g.id)::integer member_count,
    public.canonical_guild_member_cap(g.id)::integer member_limit,
    (select count(*)::numeric/greatest(public.canonical_guild_member_cap(g.id),1) from public.guild_members gm where gm.guild_id=g.id) fill_ratio,
    (select count(distinct gm.user_id) from public.guild_members gm join public.users u on u.id=gm.user_id where gm.guild_id=g.id and u.last_active_at>=now()-interval '7 days')::integer active_members_7d,
    (select count(distinct r.user_id) from public.raid_damage_logs r where r.guild_id=g.id and r.created_at>=now()-interval '7 days')::integer raid_participants_7d,
    coalesce((select sum(r.raw_damage) from public.raid_damage_logs r where r.guild_id=g.id and r.created_at>=now()-interval '7 days'),0)::bigint raid_contribution_7d,
    (select count(distinct b.user_id) from public.board_posts b where b.target_type='GUILD' and b.target_id=g.id and b.created_at>=now()-interval '7 days')::integer chatters_7d,
    (select count(distinct a.user_id) from public.guild_exp_daily_ledger a where a.guild_id=g.id and a.created_at>=now()-interval '7 days')::integer activity_contributors_7d,
    coalesce((select sum(p.total_power) from public.guild_members gm join public.user_power_rankings p on p.user_id=gm.user_id where gm.guild_id=g.id),0)::bigint guild_power,
    (select count(*) from public.guild_join_requests j where j.guild_id=g.id and j.status='PENDING' and j.requested_at<now()-interval '72 hours')::integer stale_requests,
    (select max(u.last_active_at) from public.guild_members gm join public.users u on u.id=gm.user_id where gm.guild_id=g.id) last_active_at
  )stats where not g.is_disbanded and g.recruitment_mode<>'CLOSED' and stats.member_count<stats.member_limit
 ) select jsonb_agg(to_jsonb(s) order by s.recommendation_score desc,s.guild_id)
 from(select * from scored order by recommendation_score desc,guild_id limit least(greatest(coalesce(p_limit,5),3),5))s),'[]'::jsonb);
end $$;

create or replace function public.get_public_guild_detail(p_guild_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 select jsonb_build_object('guild_id',g.id,'name',g.name,'level',g.level,'xp',g.xp,'description',coalesce(g.description,''),
  'approval_required',coalesce(g.approval_required,false),'recruitment_mode',g.recruitment_mode,
  'member_count',(select count(*) from public.guild_members gm where gm.guild_id=g.id),'member_limit',public.canonical_guild_member_cap(g.id),
  'main_alignment',g.main_alignment,'sub_alignment',g.sub_alignment,'emblem_url',g.logo_icon,'leader_name',coalesce(leader.username,'不在'),
  'active_members_7d',(select count(*) from public.guild_members gm join public.users u on u.id=gm.user_id where gm.guild_id=g.id and u.last_active_at>=now()-interval '7 days'),
  'raid_contribution_7d',coalesce((select sum(r.raw_damage) from public.raid_damage_logs r where r.guild_id=g.id and r.created_at>=now()-interval '7 days'),0),
  'guild_power',coalesce((select sum(p.total_power) from public.guild_members gm join public.user_power_rankings p on p.user_id=gm.user_id where gm.guild_id=g.id),0)) into v_result
 from public.guilds g left join public.users leader on leader.id=g.leader_id where g.id=p_guild_id and not g.is_disbanded;
 if v_result is null then raise exception 'Guild not found' using errcode='P0002'; end if; return v_result; end $$;

-- Old client-authoritative activity grants conflict with the per-source ledger.
revoke all on function public.record_guild_activity(text,uuid) from public,anon,authenticated;

revoke all on function public.guild_jst_date(timestamptz),public.canonical_guild_member_cap(uuid),public.apply_canonical_guild_exp(uuid,integer),
 public.grant_canonical_guild_daily_exp(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.record_current_guild_login(),public.create_guild_v2(uuid,text,integer),public.join_guild(uuid),public.request_guild_join(uuid),
 public.review_guild_join_request(uuid,boolean),public.update_guild_recruitment(uuid,text,text),public.set_current_guild_welcome_message(text),
 public.transfer_guild_leader(uuid,uuid,uuid),public.donate_to_guild(uuid,uuid,integer),public.leave_guild(uuid,uuid,boolean,boolean),public.search_guilds(text),public.get_recommended_guilds(integer) from public,anon;
grant execute on function public.record_current_guild_login(),public.create_guild_v2(uuid,text,integer),public.join_guild(uuid),public.request_guild_join(uuid),
 public.review_guild_join_request(uuid,boolean),public.update_guild_recruitment(uuid,text,text),public.set_current_guild_welcome_message(text),
 public.transfer_guild_leader(uuid,uuid,uuid),public.donate_to_guild(uuid,uuid,integer),public.leave_guild(uuid,uuid,boolean,boolean),public.search_guilds(text),public.get_recommended_guilds(integer) to authenticated;

commit;
notify pgrst,'reload schema';
