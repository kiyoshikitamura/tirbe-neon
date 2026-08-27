begin;

-- Phase 4 Guild Activation: expose only the canonical public leader identity
-- needed by the shared UserIdentityRow. Guild membership and role authority
-- remain unchanged.
create or replace function public.get_public_guild_detail(p_guild_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'guild_id', g.id,
    'name', g.name,
    'level', g.level,
    'xp', g.xp,
    'description', coalesce(g.description, ''),
    'approval_required', coalesce(g.approval_required, false),
    'recruitment_mode', g.recruitment_mode,
    'member_count', (select count(*) from public.guild_members gm where gm.guild_id = g.id),
    'member_limit', public.canonical_guild_member_cap(g.id),
    'main_alignment', g.main_alignment,
    'sub_alignment', g.sub_alignment,
    'emblem_url', g.logo_icon,
    'leader_user_id', leader.id,
    'leader_name', coalesce(leader.username, '不在'),
    'leader_favorite_character_id', leader.favorite_character_id,
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
    raise exception 'Guild not found' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

revoke all on function public.get_public_guild_detail(uuid) from public, anon;
grant execute on function public.get_public_guild_detail(uuid) to authenticated;

comment on function public.get_public_guild_detail(uuid) is
  'Authenticated public Guild display snapshot including canonical leader identity. Excludes funds, private settings, and requests.';

commit;
notify pgrst, 'reload schema';
