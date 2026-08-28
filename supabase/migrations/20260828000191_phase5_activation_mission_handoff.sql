begin;

create or replace function public.complete_activation_mission_handoff()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.guild_members member
    where member.user_id = v_user_id
  ) or not exists (
    select 1 from public.user_funnel_milestones milestone
    where milestone.user_id = v_user_id
      and milestone.milestone = 'guild_activation'
  ) then
    raise exception 'activation prerequisites not met' using errcode = '55000';
  end if;

  insert into public.user_funnel_milestones(user_id, milestone, metadata)
  values (
    v_user_id,
    'activation_mission_handoff',
    jsonb_build_object('source', 'home', 'destination', 'mission')
  )
  on conflict (user_id, milestone) do nothing;

  return true;
end;
$$;

revoke all on function public.complete_activation_mission_handoff() from public, anon;
grant execute on function public.complete_activation_mission_handoff() to authenticated;

comment on function public.complete_activation_mission_handoff() is
  'Idempotently finalizes the activation journey after Guild Chat activation and while the user is a Guild member.';

commit;
notify pgrst, 'reload schema';
