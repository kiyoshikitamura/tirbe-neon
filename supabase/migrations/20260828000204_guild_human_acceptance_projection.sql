begin;

-- Phase 4 remediation: add the public fields required by Guild cards and the
-- compact member list. Membership, role, join, and gameplay authorities are
-- unchanged; both projections remain authenticated and read-only.
drop function if exists public.search_guilds(text);
create function public.search_guilds(p_query text default '')
returns table(
  id uuid,
  name text,
  level integer,
  description text,
  approval_required boolean,
  member_count bigint,
  member_limit integer,
  recruitment_mode text,
  active_members_7d bigint,
  main_alignment text,
  sub_alignment text,
  emblem_url text
)
language plpgsql stable security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if char_length(coalesce(p_query,'')) > 30 then raise exception 'Guild search query is too long'; end if;
  return query
  select g.id, g.name, g.level, g.description, g.approval_required,
    count(m.id), public.canonical_guild_member_cap(g.id), g.recruitment_mode,
    count(m.id) filter(where u.last_active_at >= now() - interval '7 days'),
    g.main_alignment, g.sub_alignment, g.logo_icon
  from public.guilds g
  left join public.guild_members m on m.guild_id = g.id
  left join public.users u on u.id = m.user_id
  where not g.is_disbanded
    and (trim(coalesce(p_query,'')) = '' or g.name ilike '%' || trim(p_query) || '%')
  group by g.id
  order by g.level desc, g.name asc
  limit 50;
end;
$$;

revoke all on function public.search_guilds(text) from public, anon;
grant execute on function public.search_guilds(text) to authenticated;

create or replace function public.get_public_guild_detail(p_guild_id uuid)
returns jsonb
language plpgsql stable security definer set search_path=public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  select jsonb_build_object(
    'guild_id', g.id,
    'name', g.name,
    'level', g.level,
    'xp', g.xp,
    'description', coalesce(g.description,''),
    'approval_required', coalesce(g.approval_required,false),
    'recruitment_mode', g.recruitment_mode,
    'member_count', (select count(*) from public.guild_members gm where gm.guild_id=g.id),
    'member_limit', public.canonical_guild_member_cap(g.id),
    'main_alignment', g.main_alignment,
    'sub_alignment', g.sub_alignment,
    'emblem_url', g.logo_icon,
    'leader_user_id', leader.id,
    'leader_name', coalesce(leader.username,'不在'),
    'leader_favorite_character_id', leader.favorite_character_id,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', member_profile.id,
        'username', member_profile.username,
        'favorite_character_id', member_profile.favorite_character_id,
        'role', gm.role,
        'level', member_profile.level
      ) order by
        case gm.role when 'MASTER' then 0 when 'SUB_MASTER' then 1 when 'SUBMASTER' then 1 else 2 end,
        gm.joined_at,
        gm.user_id)
      from public.guild_members gm
      join public.users member_profile on member_profile.id = gm.user_id
      where gm.guild_id = g.id
    ), '[]'::jsonb),
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
  left join public.users leader on leader.id = g.leader_id
  where g.id = p_guild_id and not g.is_disbanded;

  if v_result is null then
    raise exception 'Guild not found' using errcode='P0002';
  end if;
  return v_result;
end;
$$;

revoke all on function public.get_public_guild_detail(uuid) from public, anon;
grant execute on function public.get_public_guild_detail(uuid) to authenticated;

comment on function public.get_public_guild_detail(uuid) is
  'Authenticated public Guild snapshot with canonical leader and compact member identities. Excludes funds, requests, and private settings.';

commit;
notify pgrst, 'reload schema';
