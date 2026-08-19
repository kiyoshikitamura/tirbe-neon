-- M9-X Round 5: keep the guaranteed tutorial SSR as the same owned character
-- through formation, dispatch and the server-authoritative quest replay.
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
  v_guaranteed_master text;
  v_leader_owned uuid;
  v_skill uuid;
  v_save jsonb;
  v_defense jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
    return jsonb_build_object('status','already_advanced','tutorial_step',v_step);
  end if;
  if v_step<>'AUTO_FORMATION' then raise exception 'tutorial formation is unavailable'; end if;

  -- Resolve slot 10 from the authoritative, idempotent gacha history. A
  -- timestamp or pre-existing starter is not an acceptable substitute.
  select result->>'character_id'
  into v_guaranteed_master
  from public.gacha_execution_history history
  cross join lateral jsonb_array_elements(coalesce(history.result_payload->'results','[]'::jsonb)) result
  where history.user_id=v_user_id
    and history.status='COMPLETED'
    and coalesce((history.result_payload->>'tutorial')::boolean,false)
    and coalesce((result->>'tutorial_slot')::integer,0)=10
  order by history.created_at desc
  limit 1;
  if v_guaranteed_master is null then raise exception 'guaranteed tutorial gacha result is required' using errcode='23514'; end if;
  select owned.id into v_leader_owned
  from public.user_characters owned
  where owned.user_id=v_user_id and owned.character_id=v_guaranteed_master
  limit 1;
  if v_leader_owned is null then raise exception 'guaranteed tutorial character is not owned' using errcode='23514'; end if;

  select array_agg(character_id order by is_guaranteed desc,is_ssr desc,created_at desc)
  into v_party
  from (
    select owned.character_id,owned.created_at,(owned.id=v_leader_owned) is_guaranteed,(release.rarity='SSR') is_ssr
    from public.user_characters owned
    join public.character_release_master release
      on release.character_id=owned.character_id and release.is_enabled
    where owned.user_id=v_user_id
    order by (owned.id=v_leader_owned) desc,(release.rarity='SSR') desc,owned.created_at desc
    limit 5
  ) picked;
  if coalesce(cardinality(v_party),0)=0 then raise exception 'owned character required'; end if;

  v_save:=public.save_main_formation(v_party);
  -- Quest replay snapshots currently consume the canonical competition deck.
  -- Persist the same tutorial party atomically so the quest leader cannot
  -- drift back to the initialization starter before the first PvP setup.
  v_defense:=public.save_pvp_defense_deck(v_party,'ATTACK_PRIORITY');

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
    'defense',v_defense,
    'leader_character_id',v_party[1],
    'leader_user_character_id',v_leader_owned,
    'skill_equipped',v_skill is not null
  );
end;
$$;

revoke all on function public.complete_current_tutorial_formation() from public,anon;
grant execute on function public.complete_current_tutorial_formation() to authenticated;

commit;
notify pgrst,'reload schema';
