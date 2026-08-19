-- M9-X Battle B4: restore the approved tutorial recommended-skill contract.
-- The starter grant is tutorial-only, idempotent and does not touch gacha,
-- pity, currency or payment history.
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
  v_skill_master text;
  v_skill_name text;
  v_starter_granted boolean:=false;
  v_save jsonb;
  v_defense jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
    return jsonb_build_object('status','already_advanced','tutorial_step',v_step);
  end if;
  if v_step<>'AUTO_FORMATION' then raise exception 'tutorial formation is unavailable'; end if;

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
  v_defense:=public.save_pvp_defense_deck(v_party,'ATTACK_PRIORITY');

  -- Prefer a usable owned skill. Only a Fresh User without an eligible skill
  -- receives the approved Production-enabled starter skill.
  select skill.id,master.skill_id,master.display_name
  into v_skill,v_skill_master,v_skill_name
  from public.user_skills skill
  join public.skill_battle_master master on master.skill_id=skill.skill_card_id and master.enabled
  where skill.user_id=v_user_id
    and (master.exclusive_character_id is null or master.exclusive_character_id=v_party[1])
  order by coalesce(master.power_percent,0) desc,skill.created_at asc
  limit 1;

  if v_skill is null then
    select master.skill_id,master.display_name
    into v_skill_master,v_skill_name
    from public.skill_battle_master master
    where master.skill_id='SKILL_001'
      and master.enabled
      and master.exclusive_character_id is null;
    if v_skill_master is null then
      raise exception 'tutorial starter skill is unavailable' using errcode='P0002';
    end if;
    -- The tutorial_progress row lock serializes retries. The NOT EXISTS guard
    -- also makes the grant safe if historic data already owns the starter.
    select id into v_skill from public.user_skills
    where user_id=v_user_id and skill_card_id=v_skill_master
    order by created_at,id limit 1;
    if v_skill is null then
      insert into public.user_skills(user_id,skill_card_id,plus_val)
      values(v_user_id,v_skill_master,0)
      returning id into v_skill;
      v_starter_granted:=true;
    end if;
  end if;

  perform public.set_character_skill(v_leader_owned,v_skill,0);

  update public.tutorial_progress set step_id='DISPATCH',updated_at=now()
  where user_id=v_user_id and step_id='AUTO_FORMATION';
  return jsonb_build_object(
    'status','advanced',
    'tutorial_step','DISPATCH',
    'formation',v_save,
    'defense',v_defense,
    'leader_character_id',v_party[1],
    'leader_user_character_id',v_leader_owned,
    'skill_equipped',true,
    'skill_id',v_skill_master,
    'skill_name',v_skill_name,
    'starter_skill_granted',v_starter_granted
  );
end;
$$;

-- Tutorial-only replay shaping. The master value remains unchanged. A value
-- of 2 becomes 1 before the first leader action and 0 before the second.
create or replace function public.apply_tutorial_player_snapshot(
  p_user_id uuid,
  p_snapshot jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when exists(
    select 1 from public.tutorial_progress
    where user_id=p_user_id and step_id='TUTORIAL_BATTLE'
  ) then coalesce((
    select jsonb_agg(
      case when unit_ordinality=1 then jsonb_set(
        unit,'{skills}',coalesce((
          select jsonb_agg(
            jsonb_set(skill,'{initialCooldown}','2'::jsonb,true)
            order by skill_ordinality
          )
          from jsonb_array_elements(coalesce(unit->'skills','[]'::jsonb))
            with ordinality skills(skill,skill_ordinality)
        ),'[]'::jsonb),true
      ) else unit end
      order by unit_ordinality
    )
    from jsonb_array_elements(coalesce(p_snapshot,'[]'::jsonb))
      with ordinality units(unit,unit_ordinality)
  ),'[]'::jsonb) else p_snapshot end;
$$;

create or replace function public.apply_tutorial_enemy_snapshot(
  p_user_id uuid,
  p_player_snapshot jsonb,
  p_enemy_snapshot jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when exists(
    select 1 from public.tutorial_progress
    where user_id=p_user_id and step_id='TUTORIAL_BATTLE'
  ) and jsonb_array_length(coalesce(p_enemy_snapshot,'[]'::jsonb))>0
  then jsonb_set(
    p_enemy_snapshot,'{0,stats,hp}',to_jsonb(greatest(
      coalesce((p_enemy_snapshot#>>'{0,stats,hp}')::integer,1),
      coalesce((select sum((unit->'stats'->>'atk')::integer) from jsonb_array_elements(p_player_snapshot) unit),1)*4
    )),true
  ) else p_enemy_snapshot end;
$$;

do $migration$
declare
  v_definition text;
  v_updated text;
  v_marker text := $marker$  v_server_seed := floor(random() * 2147483646)::bigint + 1;$marker$;
  v_replacement text := $replacement$  v_player_snapshot := public.apply_tutorial_player_snapshot(v_user_id,v_player_snapshot);
  v_enemy_snapshot := public.apply_tutorial_enemy_snapshot(v_user_id,v_player_snapshot,v_enemy_snapshot);

  v_server_seed := floor(random() * 2147483646)::bigint + 1;$replacement$;
begin
  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')) into v_definition;
  if v_definition is null then raise exception 'create_patrol_battle_replay(uuid,text) is required' using errcode='P0002'; end if;
  if position('apply_tutorial_player_snapshot' in v_definition)>0 then return; end if;
  v_updated:=replace(v_definition,v_marker,v_replacement);
  if v_updated=v_definition then raise exception 'patrol replay insertion point did not match'; end if;
  execute v_updated;
end;
$migration$;

revoke all on function public.complete_current_tutorial_formation() from public,anon;
grant execute on function public.complete_current_tutorial_formation() to authenticated;
revoke all on function public.apply_tutorial_player_snapshot(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.apply_tutorial_enemy_snapshot(uuid,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.create_patrol_battle_replay(uuid,text) from public,anon;
grant execute on function public.create_patrol_battle_replay(uuid,text) to authenticated;

commit;
notify pgrst,'reload schema';
