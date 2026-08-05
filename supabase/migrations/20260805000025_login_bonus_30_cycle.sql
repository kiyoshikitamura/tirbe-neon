-- Development migration: align login bonus with the 30-cell repeating sheet.
insert into public.login_bonus_master (day_number, item_id, quantity, item_name)
values
  (1, 'CASH', 5000, 'Cash 5,000'),
  (2, 'DIAMOND', 50, 'Diamond 50'),
  (3, 'ITEM_STAMINA_01', 2, 'Stamina Drink x2'),
  (4, 'CASH', 10000, 'Cash 10,000'),
  (5, 'GACHA_TICKET', 1, 'Gacha Ticket x1'),
  (6, 'DIAMOND', 100, 'Diamond 100'),
  (7, 'ITEM_EXP_DRINK', 3, 'EXP Drink x3'),
  (8, 'CASH', 15000, 'Cash 15,000'),
  (9, 'DIAMOND', 100, 'Diamond 100'),
  (10, 'GACHA_TICKET', 2, 'Gacha Ticket x2'),
  (11, 'CASH', 20000, 'Cash 20,000'),
  (12, 'ITEM_STAMINA_01', 3, 'Stamina Drink x3'),
  (13, 'DIAMOND', 150, 'Diamond 150'),
  (14, 'CASH', 25000, 'Cash 25,000'),
  (15, 'GACHA_TICKET', 3, 'Gacha Ticket x3'),
  (16, 'ITEM_EXP_DRINK', 5, 'EXP Drink x5'),
  (17, 'CASH', 30000, 'Cash 30,000'),
  (18, 'DIAMOND', 200, 'Diamond 200'),
  (19, 'ITEM_STAMINA_01', 5, 'Stamina Drink x5'),
  (20, 'GACHA_TICKET', 5, 'Gacha Ticket x5'),
  (21, 'CASH', 40000, 'Cash 40,000'),
  (22, 'DIAMOND', 250, 'Diamond 250'),
  (23, 'ITEM_EXP_DRINK', 10, 'EXP Drink x10'),
  (24, 'CASH', 50000, 'Cash 50,000'),
  (25, 'GACHA_TICKET', 5, 'Gacha Ticket x5'),
  (26, 'DIAMOND', 300, 'Diamond 300'),
  (27, 'CASH', 60000, 'Cash 60,000'),
  (28, 'ITEM_STAMINA_01', 10, 'Stamina Drink x10'),
  (29, 'DIAMOND', 500, 'Diamond 500'),
  (30, 'GACHA_TICKET', 10, 'Premium Gacha Ticket x10')
on conflict (day_number) do update
set item_id = excluded.item_id, quantity = excluded.quantity, item_name = excluded.item_name;

create or replace function public.process_login_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_day integer := 1;
  v_last_claimed timestamptz;
  v_now timestamptz := now();
  v_item_id text;
  v_qty integer;
  v_item_name text;
begin
  if v_user_id is null then
    raise exception 'not authorized';
  end if;

  select current_day, last_claimed_at into v_current_day, v_last_claimed
  from public.user_login_bonuses
  where user_id = v_user_id
  for update;

  if not found then
    insert into public.user_login_bonuses (user_id, current_day, last_claimed_at)
    values (v_user_id, 1, v_now);
  else
    if (v_last_claimed at time zone 'Asia/Tokyo')::date = (v_now at time zone 'Asia/Tokyo')::date then
      return jsonb_build_object('already_claimed', true, 'day_number', v_current_day);
    end if;
    v_current_day := (v_current_day % 30) + 1;
    update public.user_login_bonuses
    set current_day = v_current_day, last_claimed_at = v_now
    where user_id = v_user_id;
  end if;

  select item_id, quantity, item_name into v_item_id, v_qty, v_item_name
  from public.login_bonus_master
  where day_number = v_current_day;

  if v_item_id is not null then
    insert into public.presents (user_id, item_id, quantity, message, expire_at)
    values (v_user_id, v_item_id, v_qty, 'Login Bonus (' || v_item_name || ')', v_now + interval '30 days');
  end if;

  return jsonb_build_object('already_claimed', false, 'day_number', v_current_day, 'item_id', v_item_id, 'quantity', v_qty, 'item_name', v_item_name);
end;
$$;
