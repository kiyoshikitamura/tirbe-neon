-- Public GvG base state used by Home/Guild/GvG presentation.
-- Retired daily point fields are intentionally not exposed.

begin;

create or replace function public.get_public_guild_base_controls()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'base_id',control.base_id,
      'guild_id',control.guild_id,
      'guild_name',guild.name,
      'is_controlling',control.is_controlling,
      'total_seasonal_days',control.total_seasonal_days,
      'updated_at',control.updated_at
    ) order by control.base_id,control.is_controlling desc,control.guild_id)
    from public.guild_base_controls control
    left join public.guilds guild on guild.id=control.guild_id
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.get_public_guild_base_controls() from public,anon;
grant execute on function public.get_public_guild_base_controls() to authenticated,service_role;

commit;
