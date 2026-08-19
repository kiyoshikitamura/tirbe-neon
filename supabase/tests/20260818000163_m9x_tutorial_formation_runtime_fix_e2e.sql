begin;

do $$
declare
  v_user_id uuid;
  v_result jsonb;
  v_retry jsonb;
  v_expected_count integer;
  v_formation_count integer;
begin
  select owned.user_id into v_user_id
  from public.user_characters owned
  join public.character_release_master release
    on release.character_id=owned.character_id and release.is_enabled
  order by owned.created_at desc
  limit 1;
  if v_user_id is null then raise exception 'Tutorial formation E2E requires one released owned character'; end if;

  insert into public.tutorial_progress(user_id,step_id,updated_at)
  values(v_user_id,'AUTO_FORMATION',now())
  on conflict(user_id) do update set step_id='AUTO_FORMATION',updated_at=excluded.updated_at;
  delete from public.user_main_formations where user_id=v_user_id;
  perform set_config('request.jwt.claim.sub',v_user_id::text,true);

  select least(count(*),5)::integer into v_expected_count
  from public.user_characters owned
  join public.character_release_master release
    on release.character_id=owned.character_id and release.is_enabled
  where owned.user_id=v_user_id;

  v_result:=public.complete_current_tutorial_formation();
  select count(*)::integer into v_formation_count
  from public.user_main_formations where user_id=v_user_id;
  if v_result->>'tutorial_step'<>'DISPATCH'
    or (select step_id from public.tutorial_progress where user_id=v_user_id)<>'DISPATCH'
    or v_formation_count<>v_expected_count then
    raise exception 'Tutorial formation did not atomically persist party and DISPATCH step: %',v_result;
  end if;

  v_retry:=public.complete_current_tutorial_formation();
  if v_retry->>'status'<>'already_advanced' or v_retry->>'tutorial_step'<>'DISPATCH' then
    raise exception 'Tutorial formation retry was not idempotent: %',v_retry;
  end if;
  raise notice 'PASS: canonical release lookup, atomic formation/DISPATCH, idempotent retry';
end;
$$;

rollback;
