-- Open Beta P0: bind important conversion milestones to authoritative state changes.

begin;

create or replace function public.record_client_funnel_event(
  p_event_name text,
  p_source_screen text default null,
  p_source_cta text default null,
  p_object_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_event_name not in ('game_start','tutorial_complete','first_gacha','first_growth','first_battle','guild_recommendation_impression','guild_detail_view','pvp_to_raid_cta','raid_to_guild_cta') then
    raise exception 'event is not allowlisted' using errcode='22023';
  end if;
  if pg_column_size(coalesce(p_metadata,'{}'::jsonb))>4096 then raise exception 'event metadata is too large'; end if;
  insert into public.client_funnel_events(user_id,event_name,source_screen,source_cta,object_id,metadata)
  values(v_user,p_event_name,left(p_source_screen,64),left(p_source_cta,64),left(p_object_id,128),coalesce(p_metadata,'{}'::jsonb));
end; $$;

create or replace function public.on_tutorial_complete_funnel()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.step_id='COMPLETE' and old.step_id is distinct from new.step_id then
    perform public.record_funnel_milestone(new.user_id,'tutorial_complete',jsonb_build_object('source','tutorial_progress'));
  end if;
  return new;
end; $$;
drop trigger if exists tutorial_complete_funnel_trigger on public.tutorial_progress;
create trigger tutorial_complete_funnel_trigger after update of step_id on public.tutorial_progress
for each row execute function public.on_tutorial_complete_funnel();

create or replace function public.on_progression_growth_funnel()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_changed boolean:=false;
begin
  if tg_table_name='user_characters' then
    v_changed:=coalesce(new.level,1)>coalesce(old.level,1)
      or coalesce(new.awakening_level,0)>coalesce(old.awakening_level,0);
  elsif tg_table_name='user_equipments' then
    v_changed:=coalesce(new.level,1)>coalesce(old.level,1)
      or coalesce(new.plus_val,0)>coalesce(old.plus_val,0);
  elsif tg_table_name='user_skills' then
    v_changed:=coalesce(new.plus_val,0)>coalesce(old.plus_val,0);
  end if;
  if v_changed then
    perform public.record_funnel_milestone(new.user_id,'first_growth',jsonb_build_object('source',tg_table_name));
  end if;
  return new;
end; $$;
drop trigger if exists character_growth_funnel_trigger on public.user_characters;
create trigger character_growth_funnel_trigger after update on public.user_characters
for each row execute function public.on_progression_growth_funnel();
drop trigger if exists equipment_growth_funnel_trigger on public.user_equipments;
create trigger equipment_growth_funnel_trigger after update on public.user_equipments
for each row execute function public.on_progression_growth_funnel();
drop trigger if exists skill_growth_funnel_trigger on public.user_skills;
create trigger skill_growth_funnel_trigger after update on public.user_skills
for each row execute function public.on_progression_growth_funnel();

create or replace function public.on_first_official_battle_funnel()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='RESOLVED' and old.status is distinct from new.status
    and new.resolution_authority in ('PATROL_SERVER','PVP_SERVER','RAID_SERVER','SERVER') then
    perform public.record_funnel_milestone(new.requester_user_id,'first_battle',jsonb_build_object(
      'replayId',new.id,'mode',new.battle_mode,'authority',new.resolution_authority));
  end if;
  return new;
end; $$;
drop trigger if exists first_official_battle_funnel_trigger on public.battle_replay_sessions;
create trigger first_official_battle_funnel_trigger after update of status on public.battle_replay_sessions
for each row execute function public.on_first_official_battle_funnel();

create or replace function public.execute_character_gacha(
  p_user_id uuid,
  p_gacha_id text,
  p_pull_count integer,
  p_currency_type text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'not authorized'; end if;
  if p_currency_type='free' and p_gacha_id<>'CHAR_NORMAL' then raise exception 'daily free is only available for normal gacha'; end if;
  v_result:=public.execute_character_gacha_core_20260812(p_user_id,p_gacha_id,p_pull_count,p_currency_type);
  perform public.record_funnel_milestone(p_user_id,'first_gacha',jsonb_build_object('gachaId',p_gacha_id,'pullCount',p_pull_count));
  return v_result;
end; $$;

create or replace function public.execute_asset_gacha(
  p_user_id uuid,
  p_gacha_id text,
  p_pull_count integer,
  p_currency_type text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'not authorized'; end if;
  if p_currency_type='free' and p_gacha_id not in ('SKILL_NORMAL','EQUIP_NORMAL') then raise exception 'daily free is only available for normal gacha'; end if;
  v_result:=public.execute_asset_gacha_core_20260812(p_user_id,p_gacha_id,p_pull_count,p_currency_type);
  perform public.record_funnel_milestone(p_user_id,'first_gacha',jsonb_build_object('gachaId',p_gacha_id,'pullCount',p_pull_count));
  return v_result;
end; $$;

revoke all on function public.on_tutorial_complete_funnel(),public.on_progression_growth_funnel(),public.on_first_official_battle_funnel() from public,anon,authenticated;
revoke all on function public.execute_character_gacha(uuid,text,integer,text),public.execute_asset_gacha(uuid,text,integer,text) from public,anon;
grant execute on function public.execute_character_gacha(uuid,text,integer,text),public.execute_asset_gacha(uuid,text,integer,text) to authenticated;

commit;
notify pgrst,'reload schema';
