-- Phase C1-R3: reconnect visible Canonical Character Growth before formation.
-- Simulation authority: guaranteed SSR leader Lv1 -> Lv7, CHAR_EXP_S x6,
-- CASH 600. No Battle snapshot modifier, enemy nerf or forced result is added.
begin;

create or replace function public.prepare_current_tutorial_growth()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_step text; v_character_id text; v_owned_id uuid;
  v_level integer; v_required_level constant integer:=7; v_required integer;
  v_before integer:=0; v_after integer:=0;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step is null then raise exception 'tutorial progress not found' using errcode='P0002'; end if;
  if v_step<>'AUTO_FORMATION' then
    if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
      return jsonb_build_object('status','already_advanced','tutorial_step',v_step,'granted_quantity',0);
    end if;
    raise exception 'tutorial growth is not active' using errcode='23514';
  end if;
  select result->>'character_id' into v_character_id
  from public.gacha_execution_history history
  cross join lateral jsonb_array_elements(coalesce(history.result_payload->'results','[]'::jsonb)) result
  where history.user_id=v_user_id and history.status='COMPLETED'
    and coalesce((history.result_payload->>'tutorial')::boolean,false)
    and coalesce((result->>'tutorial_slot')::integer,0)=10
  order by history.created_at desc limit 1;
  select id,level into v_owned_id,v_level from public.user_characters
  where user_id=v_user_id and character_id=v_character_id for update;
  if v_owned_id is null then raise exception 'guaranteed tutorial Character is required' using errcode='23514'; end if;
  v_required:=greatest(v_required_level-coalesce(v_level,1),0);
  select coalesce(quantity,0) into v_before from public.user_items
  where user_id=v_user_id and item_id='CHAR_EXP_S' for update;
  if not found then v_before:=0; end if;
  if v_before<v_required then
    insert into public.user_items(user_id,item_id,quantity) values(v_user_id,'CHAR_EXP_S',v_required)
    on conflict(user_id,item_id) do update set quantity=greatest(public.user_items.quantity,excluded.quantity),updated_at=now();
  end if;
  select coalesce(quantity,0) into v_after from public.user_items where user_id=v_user_id and item_id='CHAR_EXP_S';
  return jsonb_build_object(
    'status',case when v_level>=v_required_level then 'growth_complete' else 'ready' end,
    'tutorial_step',v_step,'target_character_id',v_character_id,'target_user_character_id',v_owned_id,
    'current_level',v_level,'required_level',v_required_level,'required_quantity',v_required,
    'quantity',v_after,'granted_quantity',greatest(v_after-v_before,0),'cash_cost',v_required*100);
end;
$$;

create or replace function public.advance_current_tutorial_after_growth()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_step text; v_character_id text; v_level integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
    return jsonb_build_object('status','already_advanced','tutorial_step',v_step);
  end if;
  if v_step<>'AUTO_FORMATION' then raise exception 'tutorial growth is not active' using errcode='23514'; end if;
  if not exists(select 1 from public.user_funnel_milestones where user_id=v_user_id and milestone='first_growth') then
    raise exception 'character growth is required' using errcode='23514';
  end if;
  select result->>'character_id' into v_character_id
  from public.gacha_execution_history history
  cross join lateral jsonb_array_elements(coalesce(history.result_payload->'results','[]'::jsonb)) result
  where history.user_id=v_user_id and history.status='COMPLETED'
    and coalesce((history.result_payload->>'tutorial')::boolean,false)
    and coalesce((result->>'tutorial_slot')::integer,0)=10
  order by history.created_at desc limit 1;
  select level into v_level from public.user_characters where user_id=v_user_id and character_id=v_character_id;
  if coalesce(v_level,0)<7 then raise exception 'tutorial Character must reach level 7' using errcode='23514'; end if;
  return jsonb_build_object('status','ready_for_formation','tutorial_step','AUTO_FORMATION','target_character_id',v_character_id,'level',v_level);
end;
$$;

create or replace function public.complete_current_tutorial_formation()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user_id uuid:=auth.uid(); v_step text; v_party text[]; v_guaranteed_master text; v_leader_owned uuid; v_leader_level integer;
  v_skill uuid; v_skill_master text; v_skill_name text; v_starter_granted boolean:=false; v_save jsonb; v_defense jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
    return jsonb_build_object('status','already_advanced','tutorial_step',v_step);
  end if;
  if v_step<>'AUTO_FORMATION' then raise exception 'tutorial formation is unavailable'; end if;
  if not exists(select 1 from public.user_funnel_milestones where user_id=v_user_id and milestone='first_growth') then
    raise exception 'character growth is required before formation' using errcode='23514';
  end if;
  select result->>'character_id' into v_guaranteed_master
  from public.gacha_execution_history history
  cross join lateral jsonb_array_elements(coalesce(history.result_payload->'results','[]'::jsonb)) result
  where history.user_id=v_user_id and history.status='COMPLETED'
    and coalesce((history.result_payload->>'tutorial')::boolean,false)
    and coalesce((result->>'tutorial_slot')::integer,0)=10
  order by history.created_at desc limit 1;
  if v_guaranteed_master is null then raise exception 'guaranteed tutorial gacha result is required' using errcode='23514'; end if;
  select owned.id,owned.level into v_leader_owned,v_leader_level from public.user_characters owned
  where owned.user_id=v_user_id and owned.character_id=v_guaranteed_master limit 1;
  if v_leader_owned is null then raise exception 'guaranteed tutorial character is not owned' using errcode='23514'; end if;
  if coalesce(v_leader_level,0)<7 then raise exception 'tutorial Character must reach level 7 before formation' using errcode='23514'; end if;
  select array_agg(character_id order by is_guaranteed desc,is_ssr desc,created_at desc) into v_party from (
    select owned.character_id,owned.created_at,(owned.id=v_leader_owned) is_guaranteed,(master.rarity='SSR') is_ssr
    from public.user_characters owned join public.canonical_character_master master
      on master.version='2026-08-21' and master.character_id=owned.character_id
    where owned.user_id=v_user_id
    order by (owned.id=v_leader_owned) desc,(master.rarity='SSR') desc,owned.created_at desc limit 5
  ) picked;
  if coalesce(cardinality(v_party),0)=0 then raise exception 'owned character required'; end if;
  v_save:=public.save_main_formation(v_party);
  v_defense:=public.save_pvp_defense_deck(v_party,'ATTACK_PRIORITY');
  select skill.id,master.skill_id,master.display_name into v_skill,v_skill_master,v_skill_name
  from public.user_skills skill join public.skill_battle_master master on master.skill_id=skill.skill_card_id and master.enabled
  where skill.user_id=v_user_id and (master.exclusive_character_id is null or master.exclusive_character_id=v_party[1])
  order by coalesce(master.power_percent,0) desc,skill.created_at asc limit 1;
  if v_skill is null then
    select master.skill_id,master.display_name into v_skill_master,v_skill_name
    from public.skill_battle_master master where master.skill_id='SKILL_001' and master.enabled and master.exclusive_character_id is null;
    if v_skill_master is null then raise exception 'tutorial starter skill is unavailable' using errcode='P0002'; end if;
    select id into v_skill from public.user_skills where user_id=v_user_id and skill_card_id=v_skill_master order by created_at,id limit 1;
    if v_skill is null then
      insert into public.user_skills(user_id,skill_card_id,plus_val) values(v_user_id,v_skill_master,0) returning id into v_skill;
      v_starter_granted:=true;
    end if;
  end if;
  perform public.set_character_skill(v_leader_owned,v_skill,0);
  update public.users set favorite_character_id=v_party[1] where id=v_user_id;
  update public.tutorial_progress set step_id='DISPATCH',updated_at=now() where user_id=v_user_id and step_id='AUTO_FORMATION';
  return jsonb_build_object('status','advanced','tutorial_step','DISPATCH','formation',v_save,'defense',v_defense,
    'leader_character_id',v_party[1],'leader_user_character_id',v_leader_owned,'leader_level',v_leader_level,
    'skill_equipped',true,'skill_id',v_skill_master,'skill_name',v_skill_name,'starter_skill_granted',v_starter_granted);
end;
$$;

revoke all on function public.prepare_current_tutorial_growth(),public.advance_current_tutorial_after_growth(),public.complete_current_tutorial_formation() from public,anon;
grant execute on function public.prepare_current_tutorial_growth(),public.advance_current_tutorial_after_growth(),public.complete_current_tutorial_formation() to authenticated;

commit;
notify pgrst,'reload schema';
