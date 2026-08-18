begin;

create or replace function public.get_public_guild_detail(p_guild_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'guild_id', g.id,
    'name', g.name,
    'level', g.level,
    'xp', g.xp,
    'description', coalesce(g.description, ''),
    'approval_required', coalesce(g.approval_required, false),
    'member_count', (select count(*) from public.guild_members gm where gm.guild_id = g.id),
    'member_limit', least(coalesce(glm.max_members, 10), 20),
    'main_alignment', g.main_alignment,
    'sub_alignment', g.sub_alignment,
    'emblem_url', g.logo_icon,
    'leader_name', coalesce(leader.username, '不在'),
    'controlled_base_ids', coalesce((
      select jsonb_agg(gbc.base_id order by gbc.base_id)
      from public.guild_base_controls gbc
      where gbc.guild_id = g.id and gbc.is_controlling
    ), '[]'::jsonb),
    'active_members_7d', (
      select count(*) from public.guild_members gm
      join public.users member_profile on member_profile.id = gm.user_id
      where gm.guild_id = g.id and member_profile.last_active_at >= now() - interval '7 days'
    ),
    'raid_contribution_7d', coalesce((
      select sum(rdl.raw_damage) from public.raid_damage_logs rdl
      where rdl.guild_id = g.id and rdl.created_at >= now() - interval '7 days'
    ), 0),
    'guild_power', coalesce((
      select sum(upr.total_power) from public.guild_members gm
      join public.user_power_rankings upr on upr.user_id = gm.user_id
      where gm.guild_id = g.id
    ), 0)
  ) into v_result
  from public.guilds g
  left join public.guild_level_master glm on glm.level = g.level
  left join public.users leader on leader.id = g.leader_id
  where g.id = p_guild_id;

  if v_result is null then
    raise exception 'Guild not found' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create or replace function public.record_funnel_milestone(
  p_user_id uuid,
  p_milestone text,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean;
begin
  if p_milestone not in (
    'tutorial_complete','first_gacha','first_growth','first_battle','first_pvp',
    'ranking_viewed','first_raid','guild_detail_view','guild_join_applied',
    'guild_joined','guild_activation','second_raid'
  ) then
    raise exception 'unsupported funnel milestone';
  end if;
  insert into public.user_funnel_milestones(user_id,milestone,metadata)
  values(p_user_id,p_milestone,coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,milestone) do update set
    last_occurred_at=now(),
    occurrence_count=public.user_funnel_milestones.occurrence_count+1,
    metadata=public.user_funnel_milestones.metadata||excluded.metadata
  returning xmax=0 into v_inserted;
  return v_inserted;
end;
$$;

create or replace function public.record_client_funnel_event(
  p_event_name text,
  p_source_screen text default null,
  p_source_cta text default null,
  p_object_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_guild_events text[]:=array['guild_recommendation_click','ranking_guild_detail','guild_detail_view','guild_detail_join_click','guild_welcome_chat_click','guild_chat_raid_click'];
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_event_name not in (
    'game_start','tutorial_complete','first_gacha','first_growth','first_battle',
    'ranking_viewed','guild_recommendation_impression','guild_detail_view',
    'pvp_to_raid_cta','raid_to_guild_cta','home_primary_cta_impression',
    'home_primary_cta_click','mission_cta_click','ranking_player_detail',
    'ranking_guild_detail','guild_recommendation_click','guild_detail_join_click',
    'guild_welcome_chat_click','guild_chat_raid_click'
  ) then
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
  elsif p_event_name='ranking_viewed' then
    perform public.record_funnel_milestone(v_user,'ranking_viewed',jsonb_build_object('source',coalesce(p_source_screen,'ranking')));
  end if;
end;
$$;

revoke all on function public.get_public_guild_detail(uuid) from public, anon;
grant execute on function public.get_public_guild_detail(uuid) to authenticated;
revoke all on function public.record_client_funnel_event(text,text,text,text,jsonb) from public, anon;
grant execute on function public.record_client_funnel_event(text,text,text,text,jsonb) to authenticated;

comment on function public.get_public_guild_detail(uuid) is
  'Authenticated public Guild display snapshot. Excludes funds, member identities, requests, and private settings.';

commit;
notify pgrst, 'reload schema';
