-- Align the public ranking RPC with the development schema column name.
create or replace function public.get_public_power_rankings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.current_power desc) from (
      select r.user_id, r.total_power as current_power, r.updated_at,
             u.username, u.avatar_url,
             gm.guild_id, g.name as guild_name
      from public.user_power_rankings r
      left join public.users u on u.id = r.user_id
      left join public.guild_members gm on gm.user_id = r.user_id
      left join public.guilds g on g.id = gm.guild_id
    ) x
  ), '[]'::jsonb);
end;
$$;
