begin;

do $$
declare
  v_user_id uuid;
  v_result jsonb;
  v_master_id text;
  v_request_id uuid:=gen_random_uuid();
  v_leader uuid;
  v_main_leader uuid;
  v_replay_leader text;
begin
  select owned.user_id,owned.character_id into v_user_id,v_master_id
  from public.user_characters owned
  join public.character_release_master release on release.character_id=owned.character_id and release.is_enabled and release.rarity='SSR'
  order by owned.created_at desc limit 1;
  if v_user_id is null then raise exception 'Tutorial continuity E2E requires one owned released SSR'; end if;

  insert into public.gacha_execution_history(user_id,request_id,gacha_id,payment_source,pull_count,status,result_payload,completed_at)
  values(v_user_id,v_request_id,'CHAR_NORMAL','free',10,'COMPLETED',jsonb_build_object(
    'tutorial',true,'results',jsonb_build_array(jsonb_build_object('tutorial_slot',10,'character_id',v_master_id,'rarity','SSR'))
  ),now());

  insert into public.tutorial_progress(user_id,step_id,updated_at) values(v_user_id,'AUTO_FORMATION',now())
  on conflict(user_id) do update set step_id='AUTO_FORMATION',updated_at=excluded.updated_at;
  perform set_config('request.jwt.claim.sub',v_user_id::text,true);
  v_result:=public.complete_current_tutorial_formation();
  v_leader:=(v_result->>'leader_user_character_id')::uuid;
  select user_character_id into v_main_leader from public.user_main_formations where user_id=v_user_id and slot=1;
  select character_1_id into v_replay_leader from public.pvp_defense_decks where user_id=v_user_id;
  if v_leader is null or v_main_leader is distinct from v_leader or v_replay_leader is distinct from v_leader::text then
    raise exception 'Tutorial character continuity failed: result=%, main=%, replay=%',v_leader,v_main_leader,v_replay_leader;
  end if;
  raise notice 'PASS: the exact owned tutorial leader feeds formation and quest replay';
end;
$$;

rollback;
