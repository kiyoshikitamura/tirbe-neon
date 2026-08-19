begin;

do $$
declare
  v_user_id uuid;
  v_master_id text;
  v_request_id uuid:=gen_random_uuid();
  v_result jsonb;
  v_retry jsonb;
  v_leader uuid;
  v_skill_count integer;
  v_skill record;
  v_skill_gacha_before integer;
  v_skill_gacha_after integer;
  v_player jsonb;
  v_enemy jsonb;
begin
  select owned.user_id,owned.character_id into v_user_id,v_master_id
  from public.user_characters owned
  join public.character_release_master release
    on release.character_id=owned.character_id and release.is_enabled and release.rarity='SSR'
  order by owned.created_at desc limit 1;
  if v_user_id is null then raise exception 'Tutorial starter Skill E2E requires one owned released SSR'; end if;

  select count(*) into v_skill_gacha_before from public.gacha_execution_history
  where user_id=v_user_id and gacha_id like 'SKILL%';
  delete from public.user_skills where user_id=v_user_id;
  insert into public.gacha_execution_history(user_id,request_id,gacha_id,payment_source,pull_count,status,result_payload,completed_at)
  values(v_user_id,v_request_id,'CHAR_NORMAL','free',10,'COMPLETED',jsonb_build_object(
    'tutorial',true,'results',jsonb_build_array(jsonb_build_object('tutorial_slot',10,'character_id',v_master_id,'rarity','SSR'))
  ),now());
  insert into public.tutorial_progress(user_id,step_id,updated_at) values(v_user_id,'AUTO_FORMATION',now())
  on conflict(user_id) do update set step_id='AUTO_FORMATION',updated_at=excluded.updated_at;
  perform set_config('request.jwt.claim.sub',v_user_id::text,true);

  v_result:=public.complete_current_tutorial_formation();
  v_retry:=public.complete_current_tutorial_formation();
  v_leader:=(v_result->>'leader_user_character_id')::uuid;
  select count(*) into v_skill_count from public.user_skills where user_id=v_user_id and skill_card_id='SKILL_001';
  select * into v_skill from public.user_skills where user_id=v_user_id and skill_card_id='SKILL_001' limit 1;
  select count(*) into v_skill_gacha_after from public.gacha_execution_history
  where user_id=v_user_id and gacha_id like 'SKILL%';

  if v_result->>'skill_id'<>'SKILL_001' or coalesce((v_result->>'starter_skill_granted')::boolean,false) is not true then
    raise exception 'Fresh User starter Skill was not reported: %',v_result;
  end if;
  if v_skill_count<>1 or coalesce(v_skill.plus_val,-1)<>0 or v_skill.equipped_character_id<>v_leader::text or v_skill.slot_index<>0 then
    raise exception 'Starter Skill ownership/loadout is invalid: count=%, row=%',v_skill_count,row_to_json(v_skill);
  end if;
  if v_retry->>'status'<>'already_advanced' or v_skill_gacha_after<>v_skill_gacha_before then
    raise exception 'Retry or Gacha isolation failed: retry=%, before=%, after=%',v_retry,v_skill_gacha_before,v_skill_gacha_after;
  end if;

  update public.tutorial_progress set step_id='TUTORIAL_BATTLE' where user_id=v_user_id;
  v_player:=public.apply_tutorial_player_snapshot(v_user_id,jsonb_build_array(
    jsonb_build_object('id','ally_leader','stats',jsonb_build_object('atk',100),'skills',jsonb_build_array(
      jsonb_build_object('id','SKILL_001','initialCooldown',0),jsonb_build_object('id','SKILL_002','initialCooldown',0)
    )),
    jsonb_build_object('id','ally_two','stats',jsonb_build_object('atk',50),'skills','[]'::jsonb)
  ));
  v_enemy:=public.apply_tutorial_enemy_snapshot(v_user_id,v_player,jsonb_build_array(
    jsonb_build_object('id','enemy_tutorial','stats',jsonb_build_object('hp',100,'atk',1,'def',0,'spd',1,'luk',0),'skills','[]'::jsonb)
  ));
  if v_player#>>'{0,skills,0,initialCooldown}'<>'2' or v_player#>>'{0,skills,1,initialCooldown}'<>'2' then
    raise exception 'Tutorial leader Skills were not delayed until the second action: %',v_player;
  end if;
  if (v_enemy#>>'{0,stats,hp}')::integer<600 then
    raise exception 'Tutorial enemy cannot survive through the Skill lesson: %',v_enemy;
  end if;
  raise notice 'PASS: Fresh User receives one +0 starter Skill, equips it to the guaranteed SSR and gets tutorial-only replay shaping';
end;
$$;

rollback;
