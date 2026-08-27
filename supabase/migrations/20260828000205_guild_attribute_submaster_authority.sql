create or replace function public.update_guild_alignment(p_guild_id uuid, p_main text, p_sub text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.guild_members
    where guild_id = p_guild_id
      and user_id = auth.uid()
      and role in ('MASTER', 'SUB_MASTER', 'SUBMASTER')
  ) then
    raise exception 'Guild settings authority required';
  end if;

  if p_main not in ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS')
     or p_sub not in ('JUSTICE', 'EVIL', 'ORDER', 'CHAOS') then
    raise exception 'Invalid guild alignment';
  end if;

  update public.guilds
  set main_alignment = p_main,
      sub_alignment = p_sub
  where id = p_guild_id;

  if not found then
    raise exception 'Guild not found';
  end if;

  return jsonb_build_object('status', 'success');
end;
$$;

revoke all on function public.update_guild_alignment(uuid, text, text) from public, anon;
grant execute on function public.update_guild_alignment(uuid, text, text) to authenticated;
