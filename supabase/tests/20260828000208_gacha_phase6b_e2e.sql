begin;

do $$
declare
  v_user_id uuid;
  v_category text;
  v_gacha_id text;
  v_result jsonb;
  v_retry jsonb;
  v_request_id uuid;
  v_cash_before bigint;
  v_cash_after bigint;
  v_ticket_before integer;
  v_ticket_after integer;
  v_definition text;
begin
  select id into v_user_id from public.users order by created_at limit 1;
  if v_user_id is null then raise exception 'Preview Gacha test requires one profile'; end if;
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  foreach v_category in array array['CHARACTER','SKILL','EQUIPMENT'] loop
    v_gacha_id := case v_category when 'CHARACTER' then 'CHAR_NORMAL' when 'SKILL' then 'SKILL_NORMAL' else 'EQUIP_NORMAL' end;
    delete from public.user_daily_gacha_claims where user_id = v_user_id and gacha_type = v_category;
    v_request_id := gen_random_uuid();
    v_result := case when v_category = 'CHARACTER'
      then public.execute_character_gacha(v_user_id, v_gacha_id, 10, 'free', v_request_id)
      else public.execute_asset_gacha(v_user_id, v_gacha_id, 10, 'free', v_request_id) end;
    v_retry := case when v_category = 'CHARACTER'
      then public.execute_character_gacha(v_user_id, v_gacha_id, 10, 'free', v_request_id)
      else public.execute_asset_gacha(v_user_id, v_gacha_id, 10, 'free', v_request_id) end;
    if v_retry is distinct from v_result then raise exception '% free retry was not idempotent', v_category; end if;
    if jsonb_array_length(v_result->'results') <> 10 then raise exception '% free draw did not return 10 results', v_category; end if;
    if not exists (select 1 from public.user_daily_gacha_claims where user_id=v_user_id and gacha_type=v_category and last_claimed_date=(now() at time zone 'Asia/Tokyo')::date) then
      raise exception '% entitlement was not consumed', v_category;
    end if;
  end loop;

  delete from public.user_daily_gacha_claims where user_id=v_user_id and gacha_type='SKILL';
  update public.users set cash=greatest(cash,100000) where id=v_user_id returning cash into v_cash_before;
  perform public.execute_asset_gacha(v_user_id,'SKILL_NORMAL',1,'cash',gen_random_uuid());
  select cash into v_cash_after from public.users where id=v_user_id;
  if v_cash_after <> v_cash_before-(select cost_cash from public.gacha_masters where id='SKILL_NORMAL') then raise exception 'CASH cost mismatch'; end if;
  if exists(select 1 from public.user_daily_gacha_claims where user_id=v_user_id and gacha_type='SKILL') then raise exception 'CASH draw consumed free entitlement'; end if;

  delete from public.user_daily_gacha_claims where user_id=v_user_id and gacha_type='EQUIPMENT';
  insert into public.user_items(user_id,item_id,quantity) values(v_user_id,'NORMAL_GACHA_TICKET_EQUIPMENT',20)
  on conflict(user_id,item_id) do update set quantity=greatest(public.user_items.quantity,20),updated_at=now();
  select quantity into v_ticket_before from public.user_items where user_id=v_user_id and item_id='NORMAL_GACHA_TICKET_EQUIPMENT';
  perform public.execute_asset_gacha(v_user_id,'EQUIP_NORMAL',10,'ticket',gen_random_uuid());
  select quantity into v_ticket_after from public.user_items where user_id=v_user_id and item_id='NORMAL_GACHA_TICKET_EQUIPMENT';
  if v_ticket_after <> v_ticket_before-10 then raise exception 'Equipment ticket cost mismatch'; end if;
  if exists(select 1 from public.user_daily_gacha_claims where user_id=v_user_id and gacha_type='EQUIPMENT') then raise exception 'Ticket draw consumed free entitlement'; end if;

  v_definition := pg_get_functiondef('public.execute_asset_gacha(uuid,text,integer,text,uuid)'::regprocedure);
  if position('TRAINING_MANUAL' in v_definition)>0 or position('conversion_item_id' in v_definition)=0 then
    raise exception 'Skill conversion projection parity failed';
  end if;
  raise notice 'PASS: three free entitlements, idempotency, CASH/ticket separation, canonical conversion projection';
end;
$$;

rollback;
