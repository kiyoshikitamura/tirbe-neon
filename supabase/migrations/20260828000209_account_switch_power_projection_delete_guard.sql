begin;

-- Deleting a player cascades through owned characters and equipment. Their
-- projection triggers run after the parent row has been removed, so they must
-- not recreate a ranking row for a user that no longer exists.
create or replace function public.refresh_user_power_projection(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_power bigint;
begin
  if p_user_id is null then
    return 0;
  end if;

  if not exists(select 1 from public.users where id = p_user_id) then
    delete from public.user_power_rankings where user_id = p_user_id;
    return 0;
  end if;

  v_power := public.calculate_user_total_power(p_user_id);
  insert into public.user_power_rankings(user_id,total_power,updated_at)
  values(p_user_id,least(v_power,2147483647)::integer,clock_timestamp())
  on conflict(user_id) do update
    set total_power=excluded.total_power,updated_at=excluded.updated_at;
  return v_power;
end;
$$;

commit;
notify pgrst, 'reload schema';
