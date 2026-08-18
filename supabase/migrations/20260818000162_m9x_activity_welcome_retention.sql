-- M9-X real social projections, pre-open speed-up, welcome configuration,
-- and first-human-response measurement. No synthetic users/messages.
begin;

create or replace function public.complete_patrol_preopen(p_patrol_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_level integer; v_status text;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.feature_operating_states where feature_key='PRE_OPEN' and state='OPEN') then
    raise exception 'pre-open speed-up is closed';
  end if;
  select level into v_level from public.users where id=v_user;
  if coalesce(v_level,1)>=8 then raise exception 'pre-open speed-up is limited to players below level 8'; end if;
  select status into v_status from public.user_patrols where id=p_patrol_id and user_id=v_user for update;
  if v_status is null then raise exception 'patrol not found' using errcode='P0002'; end if;
  if v_status<>'ONGOING' then raise exception 'patrol is not eligible for speed-up'; end if;
  update public.user_patrols set status='CLAIMABLE',expires_at=now() where id=p_patrol_id and user_id=v_user;
  return jsonb_build_object('status','success','patrol_id',p_patrol_id,'currency','FREE_PREOPEN','cash_cost',0,'diamond_cost',0);
end $$;

create or replace function public.set_current_guild_welcome_message(p_message text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_guild uuid; v_clean text:=trim(coalesce(p_message,''));
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  select guild_id into v_guild from public.guild_members where user_id=v_user and role='MASTER';
  if v_guild is null then raise exception 'guild master required' using errcode='42501'; end if;
  if char_length(v_clean)>120 then raise exception 'welcome message is too long'; end if;
  update public.guilds set welcome_message=nullif(v_clean,'') where id=v_guild;
  return jsonb_build_object('status','success','welcome_message',coalesce(nullif(v_clean,''),'加入ありがとう。まずは挨拶して、仲間とレイドへ挑もう。'));
end $$;

create or replace function public.on_m9x_gacha_activity()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_name text;
begin
  if new.status<>'COMPLETED' or new.result_payload is null or old.status='COMPLETED' then return new; end if;
  select username into v_name from public.users where id=new.user_id;
  for v_result in select value from jsonb_array_elements(coalesce(new.result_payload->'results','[]'::jsonb))
  loop
    if v_result->>'rarity'='SSR' then
      insert into public.social_activity_feed(activity_type,actor_user_id,actor_display_name,object_master_id,display_payload)
      values(case v_result->>'type' when 'SKILL' then 'SSR_SKILL' when 'EQUIPMENT' then 'SSR_EQUIPMENT' else 'SSR_CHARACTER' end,
        new.user_id,coalesce(v_name,'PLAYER'),coalesce(v_result->>'character_id',v_result->>'item_id'),
        jsonb_build_object('rarity','SSR','outcome',v_result->>'outcome'));
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists m9x_gacha_activity_trigger on public.gacha_execution_history;
create trigger m9x_gacha_activity_trigger after update of status on public.gacha_execution_history
for each row execute function public.on_m9x_gacha_activity();

create or replace function public.on_m9x_guild_created_activity()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_name text;
begin
  select username into v_name from public.users where id=new.leader_id;
  insert into public.social_activity_feed(activity_type,actor_user_id,actor_display_name,guild_id,display_payload,permanent)
  values('GUILD_CREATED',new.leader_id,coalesce(v_name,'PLAYER'),new.id,jsonb_build_object('guild_name',new.name),true);
  return new;
end $$;
drop trigger if exists m9x_guild_created_activity_trigger on public.guilds;
create trigger m9x_guild_created_activity_trigger after insert on public.guilds for each row execute function public.on_m9x_guild_created_activity();

create table if not exists public.social_activity_projection_state(
  projection_key text primary key,
  subject_user_id uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.social_activity_projection_state enable row level security;
revoke all on public.social_activity_projection_state from public,anon,authenticated;
grant all on public.social_activity_projection_state to service_role;

create or replace function public.on_m9x_power_leader_activity()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_current uuid; v_name text;
begin
  if exists(select 1 from public.user_power_rankings other where other.user_id<>new.user_id and other.total_power>new.total_power) then return new; end if;
  select subject_user_id into v_current from public.social_activity_projection_state where projection_key='POWER_RANK_1' for update;
  if v_current is not distinct from new.user_id then return new; end if;
  insert into public.social_activity_projection_state(projection_key,subject_user_id) values('POWER_RANK_1',new.user_id)
  on conflict(projection_key) do update set subject_user_id=excluded.subject_user_id,updated_at=now();
  select username into v_name from public.users where id=new.user_id;
  insert into public.social_activity_feed(activity_type,actor_user_id,actor_display_name,display_payload)
  values('POWER_RANK_1',new.user_id,coalesce(v_name,'PLAYER'),jsonb_build_object('total_power',new.total_power));
  return new;
end $$;
drop trigger if exists m9x_power_leader_activity_trigger on public.user_power_rankings;
create trigger m9x_power_leader_activity_trigger after insert or update of total_power on public.user_power_rankings
for each row execute function public.on_m9x_power_leader_activity();

create or replace function public.on_m9x_join_approved_metric()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='APPROVED' and old.status is distinct from 'APPROVED' then
    insert into public.guild_human_response_metrics(join_request_id,guild_id,joined_user_id,joined_at)
    values(new.id,new.guild_id,new.user_id,coalesce(new.reviewed_at,now())) on conflict(join_request_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists m9x_join_approved_metric_trigger on public.guild_join_requests;
create trigger m9x_join_approved_metric_trigger after update of status on public.guild_join_requests
for each row execute function public.on_m9x_join_approved_metric();

create or replace function public.on_m9x_first_human_response()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.target_type<>'GUILD' or new.is_system or new.user_id is null then return new; end if;
  update public.guild_human_response_metrics metric
  set first_human_response_message_id=new.id,first_human_response_at=new.created_at,
      response_seconds=greatest(0,extract(epoch from(new.created_at-metric.joined_at))::integer),updated_at=now()
  where metric.guild_id=new.target_id and metric.joined_user_id<>new.user_id
    and metric.first_human_response_at is null and new.created_at>=metric.joined_at;
  return new;
end $$;
drop trigger if exists m9x_first_human_response_trigger on public.board_posts;
create trigger m9x_first_human_response_trigger after insert on public.board_posts
for each row execute function public.on_m9x_first_human_response();

revoke all on function public.complete_patrol_preopen(uuid),public.set_current_guild_welcome_message(text) from public,anon;
grant execute on function public.complete_patrol_preopen(uuid),public.set_current_guild_welcome_message(text) to authenticated;

commit;
notify pgrst,'reload schema';
