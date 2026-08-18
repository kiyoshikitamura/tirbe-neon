begin;

do $$
declare
  v_user_id uuid;
  v_other_user_id uuid := gen_random_uuid();
  v_closed_request_id uuid := gen_random_uuid();
  v_normal_request_id uuid := gen_random_uuid();
  v_before_cash bigint;
  v_after_cash bigint;
  v_before_history integer;
  v_after_history integer;
  v_first jsonb;
  v_retry jsonb;
  v_inventory_after_first jsonb;
  v_inventory_after_retry jsonb;
  v_normal_ticket_before integer;
  v_special_ticket_before integer;
  v_normal_ticket_after integer;
  v_special_ticket_after integer;
  v_special_ticket_request_id uuid := gen_random_uuid();
  v_special_cash_before bigint;
  v_special_cash_after bigint;
begin
  select id into v_user_id from public.users order by created_at limit 1;
  if v_user_id is null then raise exception 'Development QA requires one existing game profile'; end if;
  if exists (select 1 from public.feature_operating_states where state <> 'CLOSED') then
    raise exception 'Launch control E2E requires initial CLOSED state';
  end if;
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  select cash into v_before_cash from public.users where id = v_user_id;
  select count(*) into v_before_history from public.gacha_execution_history where user_id = v_user_id;
  begin
    perform public.execute_character_gacha(v_user_id, 'CHAR_SPECIAL', 1, 'cash', v_closed_request_id);
    raise exception 'Closed special gacha unexpectedly succeeded';
  exception when others then
    if sqlerrm not like '%special gacha is closed%' then raise; end if;
  end;
  select cash into v_after_cash from public.users where id = v_user_id;
  select count(*) into v_after_history from public.gacha_execution_history where user_id = v_user_id;
  if v_after_cash is distinct from v_before_cash or v_after_history <> v_before_history then
    raise exception 'Closed special gacha changed resources or history';
  end if;

  delete from public.user_daily_gacha_claims where user_id = v_user_id and gacha_type = 'CHARACTER';
  v_first := public.execute_character_gacha(v_user_id, 'CHAR_NORMAL', 10, 'free', v_normal_request_id);
  select coalesce(jsonb_agg(jsonb_build_object('character_id', character_id, 'awakening_level', awakening_level) order by character_id), '[]'::jsonb)
    into v_inventory_after_first from public.user_characters where user_id = v_user_id;
  v_retry := public.execute_character_gacha(v_user_id, 'CHAR_NORMAL', 10, 'free', v_normal_request_id);
  select coalesce(jsonb_agg(jsonb_build_object('character_id', character_id, 'awakening_level', awakening_level) order by character_id), '[]'::jsonb)
    into v_inventory_after_retry from public.user_characters where user_id = v_user_id;
  if v_retry is distinct from v_first or v_inventory_after_retry is distinct from v_inventory_after_first then
    raise exception 'Idempotent retry changed result or inventory';
  end if;

  update public.feature_operating_states set state = 'OPEN', updated_at = now() where feature_key = 'SPECIAL_GACHA';
  insert into public.user_items (user_id, item_id, quantity) values
    (v_user_id, 'NORMAL_GACHA_TICKET', 20),
    (v_user_id, 'SPECIAL_GACHA_TICKET', 20)
  on conflict (user_id, item_id) do update set quantity = excluded.quantity, updated_at = now();
  select quantity into v_normal_ticket_before from public.user_items where user_id = v_user_id and item_id = 'NORMAL_GACHA_TICKET';
  select quantity into v_special_ticket_before from public.user_items where user_id = v_user_id and item_id = 'SPECIAL_GACHA_TICKET';
  v_first := public.execute_asset_gacha(v_user_id, 'SKILL_SPECIAL', 1, 'ticket', v_special_ticket_request_id);
  v_retry := public.execute_asset_gacha(v_user_id, 'SKILL_SPECIAL', 1, 'ticket', v_special_ticket_request_id);
  select quantity into v_normal_ticket_after from public.user_items where user_id = v_user_id and item_id = 'NORMAL_GACHA_TICKET';
  select quantity into v_special_ticket_after from public.user_items where user_id = v_user_id and item_id = 'SPECIAL_GACHA_TICKET';
  if v_retry is distinct from v_first or v_normal_ticket_after <> v_normal_ticket_before or v_special_ticket_after <> v_special_ticket_before - 1 then
    raise exception 'Special ticket split or idempotent retry failed';
  end if;
  update public.users set cash = greatest(cash, 100000) where id = v_user_id;
  select cash into v_special_cash_before from public.users where id = v_user_id;
  perform public.execute_character_gacha(v_user_id, 'CHAR_SPECIAL', 1, 'cash', gen_random_uuid());
  select cash into v_special_cash_after from public.users where id = v_user_id;
  if v_special_cash_after <> v_special_cash_before - (select cost_cash from public.gacha_masters where id = 'CHAR_SPECIAL') then
    raise exception 'Open special cash cost was not charged canonically';
  end if;

  begin
    perform public.begin_gvg_attack(gen_random_uuid());
    raise exception 'Closed GvG unexpectedly succeeded';
  exception when others then
    if sqlerrm not like '%GvG is closed%' then raise; end if;
  end;

  begin
    perform public.execute_character_gacha(v_other_user_id, 'CHAR_NORMAL', 1, 'cash', gen_random_uuid());
    raise exception 'Cross-user gacha unexpectedly succeeded';
  exception when others then
    if sqlerrm not like '%not authorized%' then raise; end if;
  end;

  raise notice 'PASS: closed non-mutation, normal retry, special OPEN cash/ticket, ticket split, closed GvG, cross-user rejection';
end;
$$;

rollback;
