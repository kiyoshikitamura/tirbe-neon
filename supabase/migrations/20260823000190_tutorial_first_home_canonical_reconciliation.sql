-- Phase C1-R2: Tutorial / First Home P0 Canonical DB reconciliation.
-- Existing user, ownership, formation, town and history rows are not rewritten.
begin;

-- Keep frozen aggregate rarity rates, price, pity and draw logic unchanged.
-- Only Character pool metadata is aligned to the sole rarity authority.
update public.gacha_items_master pool
set rarity=master.rarity
from public.canonical_character_master master
where master.version='2026-08-21'
  and pool.item_type='CHARACTER'
  and pool.item_id=master.character_id
  and pool.rarity is distinct from master.rarity;

create or replace function public.initialize_current_player(p_username text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_username text:=btrim(p_username);
  v_is_anonymous boolean:=coalesce((auth.jwt()->>'is_anonymous')::boolean,false);
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  if not v_is_anonymous then raise exception 'Anonymous onboarding session is required'; end if;
  if v_username is null or char_length(v_username) not between 1 and 8 then
    raise exception 'Username must contain 1 to 8 characters';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text,0));
  if exists(select 1 from public.users where id=v_user_id) then
    insert into public.tutorial_progress(user_id,step_id) values(v_user_id,'WORLD_INTRO') on conflict(user_id) do nothing;
    return jsonb_build_object('status','already_initialized','tutorial_step',(select step_id from public.tutorial_progress where user_id=v_user_id));
  end if;
  if exists(select 1 from public.users where lower(btrim(username))=lower(v_username)) then
    raise exception 'Username is already in use' using errcode='23505';
  end if;
  insert into public.users(id,username,current_base_id,favorite_character_id)
  values(v_user_id,v_username,'shinjuku',null);
  insert into public.tutorial_progress(user_id,step_id) values(v_user_id,'WORLD_INTRO') on conflict(user_id) do nothing;
  return jsonb_build_object('status','success','tutorial_step','WORLD_INTRO');
end;
$$;

create or replace function public.execute_tutorial_character_gacha(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid();
  v_history record;
  v_existing record;
  v_results jsonb:='[]'::jsonb;
  v_response jsonb;
  v_item_id text;
  v_rarity text;
  v_index integer;
  v_inserted integer;
  v_progress jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'request_id is required' using errcode='22023'; end if;
  if not exists(select 1 from public.tutorial_progress where user_id=v_user_id and step_id='FREE_GACHA') then
    raise exception 'tutorial gacha is unavailable' using errcode='42501';
  end if;
  insert into public.gacha_execution_history(user_id,request_id,gacha_id,payment_source,pull_count,cost_amount,pity_before,pity_after)
  values(v_user_id,p_request_id,'CHAR_NORMAL','free',10,0,0,0)
  on conflict(user_id,request_id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_history from public.gacha_execution_history where user_id=v_user_id and request_id=p_request_id for update;
    if v_history.gacha_id<>'CHAR_NORMAL' or v_history.pull_count<>10 then raise exception 'request_id was already used for a different request'; end if;
    if v_history.status='COMPLETED' and v_history.result_payload is not null then return v_history.result_payload; end if;
    raise exception 'tutorial gacha request is already in progress';
  end if;

  for v_index in 1..10 loop
    if v_index=10 then
      v_item_id:=public.draw_gacha_item('CHAR_SPECIAL','SSR');
    else
      v_rarity:=public.draw_gacha_rarity('CHAR_NORMAL');
      v_item_id:=public.draw_gacha_item('CHAR_NORMAL',v_rarity);
    end if;
    if v_item_id is null then raise exception 'canonical tutorial gacha bucket is empty'; end if;
    select rarity into v_rarity
    from public.canonical_character_master
    where version='2026-08-21' and character_id=v_item_id;
    if v_rarity is null then raise exception 'tutorial gacha Character is absent from Canonical Master' using errcode='P0002'; end if;
    if v_index=10 and v_rarity<>'SSR' then raise exception 'tutorial guaranteed slot is not Canonical SSR' using errcode='23514'; end if;

    select id,awakening_level into v_existing from public.user_characters
    where user_id=v_user_id and character_id=v_item_id for update;
    if found and coalesce(v_existing.awakening_level,0)<5 then
      v_progress:=public.apply_character_awakening_equivalent(v_user_id,v_existing.id,1);
      v_results:=v_results||jsonb_build_array(jsonb_build_object(
        'type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,'outcome',v_progress->>'outcome',
        'awakening_progress_added',1,'awakening_level',(v_progress->>'awakening_level')::integer,
        'awakening_progress',(v_progress->>'awakening_progress')::integer,
        'awakening_required',(v_progress->>'awakening_required')::integer,'tutorial_slot',v_index));
    elsif found then
      insert into public.user_items(user_id,item_id,quantity) values(v_user_id,'AWAKENING_BOOK',1)
      on conflict(user_id,item_id) do update set quantity=public.user_items.quantity+1,updated_at=now();
      v_results:=v_results||jsonb_build_array(jsonb_build_object(
        'type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,'outcome','converted',
        'converted_item_id','AWAKENING_BOOK','converted_quantity',1,'tutorial_slot',v_index));
    else
      insert into public.user_characters(user_id,character_id,level,awakening_level) values(v_user_id,v_item_id,1,0);
      v_results:=v_results||jsonb_build_array(jsonb_build_object(
        'type','CHARACTER','character_id',v_item_id,'rarity',v_rarity,'outcome','new','tutorial_slot',v_index));
    end if;
  end loop;
  perform public.record_funnel_milestone(v_user_id,'first_gacha',jsonb_build_object('source','tutorial_guaranteed_ssr','pullCount',10));
  v_response:=jsonb_build_object('status','success','request_id',p_request_id,'results',v_results,'tutorial',true,'guaranteed_ssr_slot',10);
  update public.gacha_execution_history set result_payload=v_response,status='COMPLETED',completed_at=now()
  where user_id=v_user_id and request_id=p_request_id;
  return v_response;
end;
$$;

create or replace function public.complete_current_tutorial_formation()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid:=auth.uid(); v_step text; v_party text[]; v_guaranteed_master text; v_leader_owned uuid;
  v_skill uuid; v_skill_master text; v_skill_name text; v_starter_granted boolean:=false; v_save jsonb; v_defense jsonb;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select step_id into v_step from public.tutorial_progress where user_id=v_user_id for update;
  if v_step in ('DISPATCH','FREE_INSTANT','TUTORIAL_BATTLE','RULE_GUIDE','COMPLETE','AUTHENTICATION') then
    return jsonb_build_object('status','already_advanced','tutorial_step',v_step);
  end if;
  if v_step<>'AUTO_FORMATION' then raise exception 'tutorial formation is unavailable'; end if;
  select result->>'character_id' into v_guaranteed_master
  from public.gacha_execution_history history
  cross join lateral jsonb_array_elements(coalesce(history.result_payload->'results','[]'::jsonb)) result
  where history.user_id=v_user_id and history.status='COMPLETED'
    and coalesce((history.result_payload->>'tutorial')::boolean,false)
    and coalesce((result->>'tutorial_slot')::integer,0)=10
  order by history.created_at desc limit 1;
  if v_guaranteed_master is null then raise exception 'guaranteed tutorial gacha result is required' using errcode='23514'; end if;
  select owned.id into v_leader_owned from public.user_characters owned
  where owned.user_id=v_user_id and owned.character_id=v_guaranteed_master limit 1;
  if v_leader_owned is null then raise exception 'guaranteed tutorial character is not owned' using errcode='23514'; end if;
  select array_agg(character_id order by is_guaranteed desc,is_ssr desc,created_at desc) into v_party
  from (
    select owned.character_id,owned.created_at,(owned.id=v_leader_owned) is_guaranteed,(master.rarity='SSR') is_ssr
    from public.user_characters owned
    join public.canonical_character_master master
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
  return jsonb_build_object(
    'status','advanced','tutorial_step','DISPATCH','formation',v_save,'defense',v_defense,
    'leader_character_id',v_party[1],'leader_user_character_id',v_leader_owned,
    'skill_equipped',true,'skill_id',v_skill_master,'skill_name',v_skill_name,'starter_skill_granted',v_starter_granted);
end;
$$;

do $$
begin
  if exists(
    select 1 from public.gacha_items_master pool
    join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=pool.item_id
    where pool.item_type='CHARACTER' and pool.rarity<>master.rarity
  ) then raise exception 'Character gacha rarity parity mismatch'; end if;
  if (select rarity from public.canonical_character_master where version='2026-08-21' and character_id='char_chang_01')<>'R' then
    raise exception 'Chang Canonical rarity mismatch';
  end if;
end;
$$;

revoke all on function public.initialize_current_player(text),public.execute_tutorial_character_gacha(uuid),public.complete_current_tutorial_formation() from public,anon;
grant execute on function public.initialize_current_player(text),public.execute_tutorial_character_gacha(uuid),public.complete_current_tutorial_formation() to authenticated;

commit;
notify pgrst,'reload schema';
