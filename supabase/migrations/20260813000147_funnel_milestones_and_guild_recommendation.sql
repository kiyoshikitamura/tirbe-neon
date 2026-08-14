-- Open Beta P0-B: minimal funnel event contract, initial progression bridge,
-- active-guild recommendation and server-side social activation milestones.

begin;

create table if not exists public.user_funnel_milestones(
  user_id uuid not null references public.users(id) on delete cascade,
  milestone text not null,
  first_occurred_at timestamptz not null default now(),
  last_occurred_at timestamptz not null default now(),
  occurrence_count integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  primary key(user_id,milestone)
);
create table if not exists public.client_funnel_events(
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  event_name text not null,
  source_screen text,
  source_cta text,
  object_id text,
  metadata jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  occurred_at timestamptz not null default now()
);
create index if not exists client_funnel_events_user_event_idx on public.client_funnel_events(user_id,event_name,occurred_at);
alter table public.user_funnel_milestones enable row level security;
alter table public.client_funnel_events enable row level security;
create policy funnel_milestones_own_read on public.user_funnel_milestones for select to authenticated using(user_id=auth.uid());
revoke all on public.user_funnel_milestones,public.client_funnel_events from public,anon,authenticated;
grant select on public.user_funnel_milestones to authenticated;

create or replace function public.record_funnel_milestone(p_user_id uuid,p_milestone text,p_metadata jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_inserted boolean;
begin
  if p_milestone not in ('tutorial_complete','first_gacha','first_growth','first_battle','first_pvp','first_raid','guild_join_applied','guild_joined','guild_activation','second_raid') then raise exception 'unsupported funnel milestone'; end if;
  insert into public.user_funnel_milestones(user_id,milestone,metadata) values(p_user_id,p_milestone,coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,milestone) do update set last_occurred_at=now(),occurrence_count=public.user_funnel_milestones.occurrence_count+1,
    metadata=public.user_funnel_milestones.metadata||excluded.metadata returning xmax=0 into v_inserted;
  return v_inserted;
end; $$;

create or replace function public.record_client_funnel_event(p_event_name text,p_source_screen text default null,p_source_cta text default null,p_object_id text default null,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_event_name not in ('game_start','tutorial_complete','first_gacha','first_growth','first_battle','guild_recommendation_impression','guild_detail_view','pvp_to_raid_cta','raid_to_guild_cta') then raise exception 'event is not allowlisted' using errcode='22023'; end if;
 if pg_column_size(coalesce(p_metadata,'{}'::jsonb))>4096 then raise exception 'event metadata is too large'; end if;
 insert into public.client_funnel_events(user_id,event_name,source_screen,source_cta,object_id,metadata)
 values(v_user,p_event_name,left(p_source_screen,64),left(p_source_cta,64),left(p_object_id,128),coalesce(p_metadata,'{}'::jsonb));
 if p_event_name in ('tutorial_complete','first_gacha','first_growth','first_battle') then perform public.record_funnel_milestone(v_user,p_event_name,p_metadata); end if;
end; $$;

create or replace function public.on_official_battle_funnel()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_first boolean; v_needed integer:=0; v_level integer; v_xp integer; v_l integer;
begin
 if new.finalization_status<>'FINALIZED' or old.finalization_status='FINALIZED' then return new; end if;
 if new.battle_mode='PVP' and new.resolution_authority='PVP_SERVER' then
   v_first:=public.record_funnel_milestone(new.requester_user_id,'first_pvp',jsonb_build_object('replayId',new.id));
   if v_first then
     select level,xp into v_level,v_xp from public.users where id=new.requester_user_id for update;
     if v_level<5 then
       v_needed:=-v_xp;
       for v_l in v_level..4 loop v_needed:=v_needed+coalesce((select next_xp from public.user_level_master where level=v_l),0); end loop;
       if v_needed>0 then perform public.apply_user_xp(new.requester_user_id,v_needed); end if;
     end if;
   end if;
 elsif new.battle_mode='RAID' and new.resolution_authority='RAID_SERVER' then
   if not exists(select 1 from public.user_funnel_milestones where user_id=new.requester_user_id and milestone='first_raid') then
     perform public.record_funnel_milestone(new.requester_user_id,'first_raid',jsonb_build_object('replayId',new.id,'raidInstanceId',new.source_reference_id));
   elsif not exists(select 1 from public.user_funnel_milestones where user_id=new.requester_user_id and milestone='second_raid') then
     perform public.record_funnel_milestone(new.requester_user_id,'second_raid',jsonb_build_object('replayId',new.id,'raidInstanceId',new.source_reference_id));
   end if;
 end if;
 return new;
end; $$;
drop trigger if exists official_battle_funnel_trigger on public.battle_replay_sessions;
create trigger official_battle_funnel_trigger after update of finalization_status on public.battle_replay_sessions for each row execute function public.on_official_battle_funnel();

create or replace function public.on_guild_funnel()
returns trigger language plpgsql security definer set search_path=public as $$ begin
 if tg_table_name='guild_join_requests' then perform public.record_funnel_milestone(new.user_id,'guild_join_applied',jsonb_build_object('guildId',new.guild_id));
 else perform public.record_funnel_milestone(new.user_id,'guild_joined',jsonb_build_object('guildId',new.guild_id)); end if; return new; end $$;
drop trigger if exists guild_join_request_funnel_trigger on public.guild_join_requests;
create trigger guild_join_request_funnel_trigger after insert on public.guild_join_requests for each row execute function public.on_guild_funnel();
drop trigger if exists guild_member_funnel_trigger on public.guild_members;
create trigger guild_member_funnel_trigger after insert on public.guild_members for each row execute function public.on_guild_funnel();

create or replace function public.on_guild_chat_activation()
returns trigger language plpgsql security definer set search_path=public as $$ begin
 if new.target_type='GUILD' and new.user_id is not null and exists(select 1 from public.guild_members where user_id=new.user_id and guild_id=new.target_id) then
  perform public.record_funnel_milestone(new.user_id,'guild_activation',jsonb_build_object('guildId',new.target_id)); end if; return new; end $$;
drop trigger if exists guild_chat_activation_funnel_trigger on public.board_posts;
create trigger guild_chat_activation_funnel_trigger after insert on public.board_posts for each row execute function public.on_guild_chat_activation();

create or replace function public.get_recommended_guilds(p_limit integer default 5)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.recommendation_score desc,row_data.guild_id) from (
   select guild.id guild_id,guild.name,guild.description,guild.level,guild.approval_required,
     count(distinct member.user_id)::integer member_count,
     coalesce(level_master.max_members,10)::integer member_limit,
     count(distinct member.user_id) filter(where player.last_active_at>=now()-interval '7 days')::integer active_members_7d,
     count(distinct activity.user_id)::integer active_contributors_7d,
     count(distinct chat.user_id)::integer chatters_7d,
     coalesce(sum(power.total_power),0)::bigint guild_power,
     (count(distinct member.user_id) filter(where player.last_active_at>=now()-interval '7 days')*20
       +count(distinct activity.user_id)*15+count(distinct chat.user_id)*10
       +least(count(distinct member.user_id),8)*5
       +case when guild.approval_required then 0 else 10 end)::integer recommendation_score
   from public.guilds guild left join public.guild_level_master level_master on level_master.level=guild.level
   left join public.guild_members member on member.guild_id=guild.id left join public.users player on player.id=member.user_id
   left join public.guild_activity_grants activity on activity.guild_id=guild.id and activity.created_at>=now()-interval '7 days'
   left join public.board_posts chat on chat.target_type='GUILD' and chat.target_id=guild.id and chat.created_at>=now()-interval '7 days'
   left join public.user_power_rankings power on power.user_id=member.user_id
   group by guild.id,guild.name,guild.description,guild.level,guild.approval_required,level_master.max_members
   having count(distinct member.user_id)<coalesce(level_master.max_members,10)
   order by recommendation_score desc,guild.id limit least(greatest(coalesce(p_limit,5),3),5)
 ) row_data),'[]'::jsonb);
end; $$;

revoke all on function public.record_funnel_milestone(uuid,text,jsonb),public.on_official_battle_funnel(),public.on_guild_funnel(),public.on_guild_chat_activation() from public,anon,authenticated;
grant execute on function public.record_funnel_milestone(uuid,text,jsonb) to service_role;
revoke all on function public.record_client_funnel_event(text,text,text,text,jsonb),public.get_recommended_guilds(integer) from public,anon;
grant execute on function public.record_client_funnel_event(text,text,text,text,jsonb),public.get_recommended_guilds(integer) to authenticated;

commit;
notify pgrst,'reload schema';
