-- Open Beta P0+: master-driven funnel missions, recommendation v1.1 and
-- allowlisted navigation analytics. All values remain replaceable.

begin;

create table if not exists public.guild_recommendation_weights(
  config_key text primary key,
  weight numeric not null,
  description text not null,
  is_provisional boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.guild_recommendation_weights(config_key,weight,description,is_provisional) values
 ('active_member_7d',18,'7日以内に活動したメンバー1人あたり',true),
 ('raid_participant_7d',16,'7日以内のRaid参加者1人あたり',true),
 ('chat_member_7d',10,'7日以内のTRIBE Chat投稿者1人あたり',true),
 ('activity_contributor_7d',12,'7日以内のGuild Activity参加者1人あたり',true),
 ('target_fill_bonus',45,'在籍率50〜80%の活動中TRIBE',true),
 ('instant_join_bonus',12,'即時加入可能',true),
 ('raid_contribution_scale',4,'Raid貢献log10倍率',true),
 ('guild_power_scale',2,'Guild戦力log10倍率',true),
 ('inactive_14d_penalty',60,'最終活動14日超過',true),
 ('stale_request_penalty',8,'承認待ち72時間超過1件あたり',true),
 ('rotation_range',9,'週次ユーザー別ローテーション幅',true)
on conflict(config_key) do update set weight=excluded.weight,description=excluded.description,
 is_provisional=excluded.is_provisional,updated_at=now();
alter table public.guild_recommendation_weights enable row level security;
revoke all on public.guild_recommendation_weights from public,anon,authenticated;

insert into public.missions(
 id,category,trigger_type,title,desc_text,description,target_value,condition_params,
 reward_item_id,reward_qty,reward_quantity,prerequisite_mission_id,display_order,is_enabled,is_repeatable,is_provisional
) values
 ('ob_funnel_gacha_01','NORMAL','FUNNEL_FIRST_GACHA','最初の仲間を迎えろ','初回ガチャを引く','初回ガチャを引く',1,
  '{"cta_tab":"gacha","cta_label":"ガチャへ","balance_status":"PROVISIONAL"}', 'CASH',500,500,null,81,true,false,true),
 ('ob_funnel_growth_01','NORMAL','FUNNEL_FIRST_GROWTH','力を引き出せ','キャラクター・装備・スキルのいずれかを強化する','キャラクター・装備・スキルのいずれかを強化する',1,
  '{"cta_tab":"character","cta_label":"強化へ","balance_status":"PROVISIONAL"}', 'CHAR_EXP_S',3,3,'ob_funnel_gacha_01',82,true,false,true),
 ('ob_funnel_battle_01','NORMAL','FUNNEL_FIRST_BATTLE','街で力を試せ','最初のバトルを完了する','最初のバトルを完了する',1,
  '{"cta_tab":"patrol","cta_label":"クエストへ","balance_status":"PROVISIONAL"}', 'CASH',500,500,'ob_funnel_growth_01',83,true,false,true),
 ('ob_funnel_pvp_01','NORMAL','FUNNEL_FIRST_PVP','街の猛者と競え','PvPを1回完了する','PvPを1回完了する',1,
  '{"cta_tab":"pvp","cta_label":"PvPへ","balance_status":"PROVISIONAL"}', 'CASH',800,800,'ob_funnel_battle_01',84,true,false,true),
 ('ob_funnel_raid_01','NORMAL','FUNNEL_FIRST_RAID','強敵へ挑め','レイドに1回参加する','レイドに1回参加する',1,
  '{"cta_tab":"raid","cta_label":"レイドへ","balance_status":"PROVISIONAL"}', 'CHAR_EXP_S',3,3,'ob_funnel_pvp_01',85,true,false,true),
 ('ob_funnel_guild_view_01','NORMAL','FUNNEL_GUILD_VIEW','共に戦うTRIBEを探せ','おすすめTRIBEの詳細を見る','おすすめTRIBEの詳細を見る',1,
  '{"cta_tab":"guild","cta_label":"TRIBEを見る","balance_status":"PROVISIONAL"}', 'CASH',300,300,'ob_funnel_raid_01',86,true,false,true),
 ('ob_funnel_guild_join_01','NORMAL','FUNNEL_GUILD_JOIN','旗の下へ集え','TRIBEへ加入または加入申請する','TRIBEへ加入または加入申請する',1,
  '{"cta_tab":"guild","cta_label":"加入先を探す","balance_status":"PROVISIONAL"}', 'CASH',500,500,'ob_funnel_guild_view_01',87,true,false,true),
 ('ob_funnel_guild_activation_01','NORMAL','FUNNEL_GUILD_ACTIVATION','仲間へ声を届けろ','加入したTRIBEのChatへ投稿する','加入したTRIBEのChatへ投稿する',1,
  '{"cta_action":"guild_chat","cta_label":"TRIBE Chatへ","balance_status":"PROVISIONAL"}', 'CHAR_EXP_S',3,3,'ob_funnel_guild_join_01',88,true,false,true),
 ('ob_funnel_second_raid_01','NORMAL','FUNNEL_SECOND_RAID','TRIBEと再び強敵へ','2回目のレイドに参加する','2回目のレイドに参加する',1,
  '{"cta_tab":"raid","cta_label":"レイドへ戻る","balance_status":"PROVISIONAL"}', 'CASH',1000,1000,'ob_funnel_guild_activation_01',89,true,false,true)
on conflict(id) do update set category=excluded.category,trigger_type=excluded.trigger_type,title=excluded.title,
 desc_text=excluded.desc_text,description=excluded.description,target_value=excluded.target_value,
 condition_params=excluded.condition_params,reward_item_id=excluded.reward_item_id,reward_qty=excluded.reward_qty,
 reward_quantity=excluded.reward_quantity,prerequisite_mission_id=excluded.prerequisite_mission_id,
 display_order=excluded.display_order,is_enabled=excluded.is_enabled,is_repeatable=excluded.is_repeatable,is_provisional=excluded.is_provisional;

create or replace function public.funnel_mission_trigger_type(p_milestone text)
returns text language sql immutable set search_path=public as $$
 select case p_milestone
  when 'first_gacha' then 'FUNNEL_FIRST_GACHA' when 'first_growth' then 'FUNNEL_FIRST_GROWTH'
  when 'first_battle' then 'FUNNEL_FIRST_BATTLE' when 'first_pvp' then 'FUNNEL_FIRST_PVP'
  when 'first_raid' then 'FUNNEL_FIRST_RAID' when 'guild_detail_view' then 'FUNNEL_GUILD_VIEW'
  when 'guild_join_applied' then 'FUNNEL_GUILD_JOIN' when 'guild_joined' then 'FUNNEL_GUILD_JOIN'
  when 'guild_activation' then 'FUNNEL_GUILD_ACTIVATION' when 'second_raid' then 'FUNNEL_SECOND_RAID'
 end
$$;

create or replace function public.on_funnel_mission_progress()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_trigger text:=public.funnel_mission_trigger_type(new.milestone);
begin
 if v_trigger is null then return new; end if;
 insert into public.user_missions(user_id,mission_id,current_progress,progress_val,status)
 select new.user_id,m.id,m.target_value,m.target_value,'CLEAR' from public.missions m
 where m.is_enabled and m.trigger_type=v_trigger
 on conflict(user_id,mission_id) do update set current_progress=excluded.current_progress,
  progress_val=excluded.progress_val,status=case when public.user_missions.status='CLAIMED' then 'CLAIMED' else 'CLEAR' end,
  updated_at=clock_timestamp();
 return new;
end; $$;
drop trigger if exists funnel_mission_progress_trigger on public.user_funnel_milestones;
create trigger funnel_mission_progress_trigger after insert or update on public.user_funnel_milestones
for each row execute function public.on_funnel_mission_progress();

-- Current players receive the first navigation mission. Already recorded
-- milestones are reflected without granting rewards directly.
insert into public.user_missions(user_id,mission_id,current_progress,progress_val,status)
select u.id,'ob_funnel_gacha_01',0,0,'PROGRESS' from public.users u
on conflict(user_id,mission_id) do nothing;
insert into public.user_missions(user_id,mission_id,current_progress,progress_val,status)
select distinct f.user_id,m.id,m.target_value,m.target_value,'CLEAR'
from public.user_funnel_milestones f join public.missions m
 on m.trigger_type=public.funnel_mission_trigger_type(f.milestone) and m.is_enabled
on conflict(user_id,mission_id) do update set current_progress=excluded.current_progress,progress_val=excluded.progress_val,
 status=case when public.user_missions.status='CLAIMED' then 'CLAIMED' else 'CLEAR' end,updated_at=clock_timestamp();

create or replace function public.record_funnel_milestone(p_user_id uuid,p_milestone text,p_metadata jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_inserted boolean;
begin
 if p_milestone not in ('tutorial_complete','first_gacha','first_growth','first_battle','first_pvp','first_raid',
  'guild_detail_view','guild_join_applied','guild_joined','guild_activation','second_raid') then
  raise exception 'unsupported funnel milestone';
 end if;
 insert into public.user_funnel_milestones(user_id,milestone,metadata)
 values(p_user_id,p_milestone,coalesce(p_metadata,'{}'::jsonb))
 on conflict(user_id,milestone) do update set last_occurred_at=now(),
  occurrence_count=public.user_funnel_milestones.occurrence_count+1,
  metadata=public.user_funnel_milestones.metadata||excluded.metadata returning xmax=0 into v_inserted;
 return v_inserted;
end; $$;

create or replace function public.record_client_funnel_event(p_event_name text,p_source_screen text default null,p_source_cta text default null,p_object_id text default null,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_guild_events text[]:=array['guild_recommendation_click','ranking_guild_detail','guild_detail_view','guild_detail_join_click','guild_welcome_chat_click','guild_chat_raid_click'];
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_event_name not in ('game_start','tutorial_complete','first_gacha','first_growth','first_battle',
  'guild_recommendation_impression','guild_detail_view','pvp_to_raid_cta','raid_to_guild_cta',
  'home_primary_cta_impression','home_primary_cta_click','mission_cta_click','ranking_player_detail',
  'ranking_guild_detail','guild_recommendation_click','guild_detail_join_click','guild_welcome_chat_click','guild_chat_raid_click') then
  raise exception 'event is not allowlisted' using errcode='22023';
 end if;
 if pg_column_size(coalesce(p_metadata,'{}'::jsonb))>4096 then raise exception 'event metadata is too large'; end if;
 if p_event_name=any(v_guild_events) and (p_object_id is null or not exists(select 1 from public.guilds where id::text=p_object_id)) then
  raise exception 'valid Guild target is required' using errcode='22023';
 end if;
 if p_event_name='ranking_player_detail' and (p_object_id is null or not exists(select 1 from public.users where id::text=p_object_id)) then
  raise exception 'valid player target is required' using errcode='22023';
 end if;
 if p_event_name='guild_recommendation_impression' and coalesce(p_source_screen,'') not in ('raid','home','guild') then
  raise exception 'invalid recommendation source' using errcode='22023';
 end if;
 insert into public.client_funnel_events(user_id,event_name,source_screen,source_cta,object_id,metadata)
 values(v_user,p_event_name,left(p_source_screen,64),left(p_source_cta,64),left(p_object_id,128),coalesce(p_metadata,'{}'::jsonb));
 if p_event_name='guild_detail_view' then
  perform public.record_funnel_milestone(v_user,'guild_detail_view',jsonb_build_object('guildId',p_object_id,'source',p_source_screen));
 end if;
end; $$;

create or replace function public.get_recommended_guilds(p_limit integer default 5)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
 return coalesce((with weights as (
  select
   max(weight) filter(where config_key='active_member_7d') active_member,
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
 ), scored as (
  select g.id guild_id,g.name,g.description,g.level,g.approval_required,
   stats.member_count,stats.member_limit,stats.fill_ratio,stats.active_members_7d,
   stats.raid_participants_7d,stats.raid_contribution_7d,stats.chatters_7d,
   stats.activity_contributors_7d,stats.guild_power,stats.stale_requests,
   round((stats.active_members_7d*coalesce(w.active_member,18)
    +stats.raid_participants_7d*coalesce(w.raid_participant,16)
    +stats.chatters_7d*coalesce(w.chat_member,10)
    +stats.activity_contributors_7d*coalesce(w.activity_contributor,12)
    +case when stats.fill_ratio between .5 and .8 and stats.active_members_7d>0 then coalesce(w.target_fill,45) else 0 end
    +case when not g.approval_required then coalesce(w.instant_join,12) else 0 end
    +ln(greatest(stats.raid_contribution_7d,0)+1)*coalesce(w.raid_scale,4)
    +ln(greatest(stats.guild_power,0)+1)*coalesce(w.power_scale,2)
    -case when stats.last_active_at<now()-interval '14 days' or stats.last_active_at is null then coalesce(w.inactive_penalty,60) else 0 end
    -stats.stale_requests*coalesce(w.stale_penalty,8)
    +(abs(hashtextextended(v_user::text||':'||g.id::text||':'||date_trunc('week',now())::text,0))
      % greatest(coalesce(w.rotation_range,9)::integer,1)))::numeric,2) recommendation_score
  from public.guilds g cross join weights w cross join lateral (
   select
    (select count(*) from public.guild_members gm where gm.guild_id=g.id)::integer member_count,
    coalesce((select max_members from public.guild_level_master where level=g.level),10)::integer member_limit,
    (select count(*)::numeric/greatest(coalesce((select max_members from public.guild_level_master where level=g.level),10),1) from public.guild_members gm where gm.guild_id=g.id) fill_ratio,
    (select count(distinct gm.user_id) from public.guild_members gm join public.users u on u.id=gm.user_id where gm.guild_id=g.id and u.last_active_at>=now()-interval '7 days')::integer active_members_7d,
    (select count(distinct r.user_id) from public.raid_damage_logs r where r.guild_id=g.id and r.created_at>=now()-interval '7 days')::integer raid_participants_7d,
    coalesce((select sum(r.raw_damage) from public.raid_damage_logs r where r.guild_id=g.id and r.created_at>=now()-interval '7 days'),0)::bigint raid_contribution_7d,
    (select count(distinct b.user_id) from public.board_posts b where b.target_type='GUILD' and b.target_id=g.id and b.created_at>=now()-interval '7 days')::integer chatters_7d,
    (select count(distinct a.user_id) from public.guild_activity_grants a where a.guild_id=g.id and a.created_at>=now()-interval '7 days')::integer activity_contributors_7d,
    coalesce((select sum(p.total_power) from public.guild_members gm join public.user_power_rankings p on p.user_id=gm.user_id where gm.guild_id=g.id),0)::bigint guild_power,
    (select count(*) from public.guild_join_requests j where j.guild_id=g.id and j.status='PENDING' and j.requested_at<now()-interval '72 hours')::integer stale_requests,
    (select max(u.last_active_at) from public.guild_members gm join public.users u on u.id=gm.user_id where gm.guild_id=g.id) last_active_at
  ) stats
  where stats.member_count<stats.member_limit
 ) select jsonb_agg(to_jsonb(s) order by s.recommendation_score desc,s.guild_id)
 from (select * from scored order by recommendation_score desc,guild_id limit least(greatest(coalesce(p_limit,5),3),5)) s),'[]'::jsonb);
end; $$;

revoke all on function public.funnel_mission_trigger_type(text),public.on_funnel_mission_progress() from public,anon,authenticated;
revoke all on function public.record_client_funnel_event(text,text,text,text,jsonb),public.get_recommended_guilds(integer) from public,anon;
grant execute on function public.record_client_funnel_event(text,text,text,text,jsonb),public.get_recommended_guilds(integer) to authenticated;

commit;
notify pgrst,'reload schema';
