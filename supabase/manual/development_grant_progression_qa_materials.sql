-- Development QA only. Never run against Production.
-- Grants a small, repeatable progression test bundle to the specified account.

do $$
declare
  v_email text := 'izasama39@gmail.com';
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(v_email) limit 1;
  if v_user_id is null then
    raise exception 'Development auth user not found for %', v_email using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.users where id = v_user_id) then
    raise exception 'Game profile not found for %', v_email using errcode = 'P0002';
  end if;

  insert into public.user_items(user_id, item_id, quantity)
  values
    (v_user_id, 'CHAR_EXP_S', 30),
    (v_user_id, 'EQUIP_EXP_S', 30),
    (v_user_id, 'LAW_OF_STRIFE', 3),
    (v_user_id, 'EQUIP_LB_HAMMER', 3),
    (v_user_id, 'SKILL_LB_BOOK', 3),
    (v_user_id, 'EXCLUSIVE_CONTRACT', 3)
  on conflict (user_id, item_id) do update
    set quantity = public.user_items.quantity + excluded.quantity,
        updated_at = now();
end;
$$;
