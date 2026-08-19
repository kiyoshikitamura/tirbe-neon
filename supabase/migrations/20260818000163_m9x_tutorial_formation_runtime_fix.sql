-- M9-X real-device P0: make the atomic tutorial formation contract use the
-- canonical character release column. The previous function compiled but
-- failed at runtime because PL/pgSQL deferred resolving release.enabled.
begin;

create or replace function public.complete_current_tutorial_formation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_step text;
  v_party text[];
  v_leader_owned uuid;
  v_skill uuid;
  v_save jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
    return jsonb_build_object('status','already_advanced','tutorial_step',v_step);
  end if;
  if v_step<>'AUTO_FORMATION' then raise exception 'tutorial formation is unavailable'; end if;

  select array_agg(character_id order by is_ssr desc,created_at desc)
  into v_party
  from (
    select owned.character_id,owned.created_at,(release.rarity='SSR') is_ssr
    from public.user_characters owned
    join public.character_release_master release
      on release.character_id=owned.character_id and release.is_enabled
    where owned.user_id=v_user_id
    order by (release.rarity='SSR') desc,owned.created_at desc
    limit 5
  ) picked;
  if coalesce(cardinality(v_party),0)=0 then raise exception 'owned character required'; end if;
  v_save:=public.save_main_formation(v_party);

  select owned.id into v_leader_owned from public.user_characters owned
  where owned.user_id=v_user_id and owned.character_id=v_party[1] limit 1;
  select skill.id into v_skill from public.user_skills skill
  join public.skill_battle_master master on master.skill_id=skill.skill_card_id and master.enabled
  where skill.user_id=v_user_id
    and (master.exclusive_character_id is null or master.exclusive_character_id=v_party[1])
  order by coalesce(master.power_percent,0) desc,skill.created_at asc limit 1;
  if v_skill is not null then perform public.set_character_skill(v_leader_owned,v_skill,0); end if;

  update public.tutorial_progress set step_id='DISPATCH',updated_at=now()
  where user_id=v_user_id and step_id='AUTO_FORMATION';
  return jsonb_build_object(
    'status','advanced',
    'tutorial_step','DISPATCH',
    'formation',v_save,
    'leader_character_id',v_party[1],
    'skill_equipped',v_skill is not null
  );
end;
$$;

revoke all on function public.complete_current_tutorial_formation() from public,anon;
grant execute on function public.complete_current_tutorial_formation() to authenticated;

commit;
notify pgrst,'reload schema';
