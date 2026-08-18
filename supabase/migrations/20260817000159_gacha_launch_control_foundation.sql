-- M9 Production Master: launch controls, canonical gacha buckets, ticket split,
-- and immutable execution history. Production values that remain provisional
-- are intentionally not introduced here.

begin;

create table public.feature_operating_states (
  feature_key text primary key check (feature_key in ('SPECIAL_GACHA', 'GVG', 'PAYMENT')),
  state text not null check (state in ('CLOSED', 'OPEN')),
  updated_at timestamptz not null default now()
);

insert into public.feature_operating_states (feature_key, state)
values ('SPECIAL_GACHA', 'CLOSED'), ('GVG', 'CLOSED'), ('PAYMENT', 'CLOSED');

alter table public.feature_operating_states enable row level security;
create policy feature_operating_states_authenticated_read
  on public.feature_operating_states for select to authenticated using (true);
revoke all on table public.feature_operating_states from public, anon, authenticated;
grant select on table public.feature_operating_states to authenticated;
grant all on table public.feature_operating_states to service_role;

create table public.gacha_rarity_rates (
  gacha_id text not null references public.gacha_masters(id) on delete cascade,
  rarity text not null check (rarity in ('N', 'R', 'SR', 'SSR')),
  weight integer not null check (weight > 0),
  primary key (gacha_id, rarity)
);

insert into public.gacha_rarity_rates (gacha_id, rarity, weight)
values
  ('CHAR_NORMAL', 'N', 50), ('CHAR_NORMAL', 'R', 40), ('CHAR_NORMAL', 'SR', 10),
  ('SKILL_NORMAL', 'N', 50), ('SKILL_NORMAL', 'R', 40), ('SKILL_NORMAL', 'SR', 10),
  ('EQUIP_NORMAL', 'N', 50), ('EQUIP_NORMAL', 'R', 40), ('EQUIP_NORMAL', 'SR', 10),
  ('CHAR_SPECIAL', 'R', 60), ('CHAR_SPECIAL', 'SR', 35), ('CHAR_SPECIAL', 'SSR', 5),
  ('SKILL_SPECIAL', 'R', 60), ('SKILL_SPECIAL', 'SR', 35), ('SKILL_SPECIAL', 'SSR', 5),
  ('EQUIP_SPECIAL', 'R', 60), ('EQUIP_SPECIAL', 'SR', 35), ('EQUIP_SPECIAL', 'SSR', 5);

alter table public.gacha_rarity_rates enable row level security;
create policy gacha_rarity_rates_authenticated_read
  on public.gacha_rarity_rates for select to authenticated using (true);
revoke all on table public.gacha_rarity_rates from public, anon, authenticated;
grant select on table public.gacha_rarity_rates to authenticated;
grant all on table public.gacha_rarity_rates to service_role;

-- Rarity is selected before an item. Row weights no longer encode bucket odds.
update public.gacha_items_master set weight = 1
where gacha_id in ('CHAR_NORMAL', 'CHAR_SPECIAL');

delete from public.gacha_items_master
where gacha_id in ('SKILL_NORMAL', 'SKILL_SPECIAL', 'EQUIP_NORMAL', 'EQUIP_SPECIAL');

with eligible_skill as (
  select skill_id,
    case
      when substring(skill_id from '[0-9]+$')::integer between 1 and 10 then 'N'
      when substring(skill_id from '[0-9]+$')::integer between 11 and 20 then 'R'
      when substring(skill_id from '[0-9]+$')::integer between 21 and 35 then 'SR'
      else 'SSR'
    end as rarity
  from public.skill_battle_master
  where enabled and exclusive_character_id is null
), skill_pool as (
  select 'SKILL_NORMAL'::text as gacha_id, skill_id, rarity
  from eligible_skill where rarity in ('N', 'R', 'SR')
  union all
  select 'SKILL_SPECIAL', skill_id, rarity
  from eligible_skill where rarity in ('R', 'SR', 'SSR')
)
insert into public.gacha_items_master (id, gacha_id, item_type, item_id, rarity, weight, is_pickup)
select gacha_id || ':' || skill_id, gacha_id, 'SKILL', skill_id, rarity, 1, false
from skill_pool;

-- The battle master is the canonical equipment rarity source. Exclusive
-- candidates remain outside production pools until readiness/binding/effect
-- are separately confirmed.
with eligible_equipment as (
  select equipment_id, rarity
  from public.equipment_battle_master
  where not is_exclusive
), equipment_pool as (
  select 'EQUIP_NORMAL'::text as gacha_id, equipment_id, rarity
  from eligible_equipment where rarity in ('N', 'R', 'SR')
  union all
  select 'EQUIP_SPECIAL', equipment_id, rarity
  from eligible_equipment where rarity in ('R', 'SR', 'SSR')
)
insert into public.gacha_items_master (id, gacha_id, item_type, item_id, rarity, weight, is_pickup)
select gacha_id || ':' || equipment_id, gacha_id, 'EQUIPMENT', equipment_id, rarity, 1, false
from equipment_pool;

-- Legacy tickets retain their quantity but become Normal tickets. They are
-- never upgraded to the scarcer Special ticket.
insert into public.user_items (user_id, item_id, quantity)
select user_id, 'NORMAL_GACHA_TICKET', quantity
from public.user_items
where item_id = 'GACHA_TICKET' and quantity > 0
on conflict (user_id, item_id) do update
set quantity = public.user_items.quantity + excluded.quantity,
    updated_at = now();

delete from public.user_items where item_id = 'GACHA_TICKET';
update public.login_bonus_master
set item_id = 'NORMAL_GACHA_TICKET',
    item_name = replace(item_name, 'Premium Gacha Ticket', 'Normal Gacha Ticket')
where item_id = 'GACHA_TICKET';
update public.missions set reward_item_id = 'NORMAL_GACHA_TICKET'
where reward_item_id = 'GACHA_TICKET';
update public.presents set item_id = 'NORMAL_GACHA_TICKET'
where item_id = 'GACHA_TICKET';

create table public.gacha_execution_history (
  user_id uuid not null references public.users(id) on delete cascade,
  request_id uuid not null,
  gacha_id text not null references public.gacha_masters(id),
  payment_source text not null check (payment_source in ('free', 'cash', 'diamonds', 'ticket')),
  pull_count integer not null check (pull_count between 1 and 10),
  ticket_item_id text,
  cost_amount integer not null default 0 check (cost_amount >= 0),
  pity_before integer not null default 0 check (pity_before >= 0),
  pity_after integer not null default 0 check (pity_after >= 0),
  result_payload jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'COMPLETED')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, request_id)
);

create index gacha_execution_history_user_created_idx
  on public.gacha_execution_history (user_id, created_at desc);
alter table public.gacha_execution_history enable row level security;
create policy gacha_execution_history_owner_read
  on public.gacha_execution_history for select to authenticated
  using (user_id = auth.uid());
revoke all on table public.gacha_execution_history from public, anon, authenticated;
grant select on table public.gacha_execution_history to authenticated;
grant all on table public.gacha_execution_history to service_role;

create function public.draw_gacha_rarity(p_gacha_id text)
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select rarity
  from public.gacha_rarity_rates
  where gacha_id = p_gacha_id
  order by -ln(greatest(random(), 0.000000000001)) / weight
  limit 1
$$;

create function public.draw_gacha_item(p_gacha_id text, p_rarity text)
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select item_id
  from public.gacha_items_master
  where gacha_id = p_gacha_id and rarity = p_rarity
  order by random()
  limit 1
$$;

revoke all on function public.draw_gacha_rarity(text), public.draw_gacha_item(text, text)
  from public, anon, authenticated;
grant execute on function public.draw_gacha_rarity(text), public.draw_gacha_item(text, text)
  to service_role;

commit;
notify pgrst, 'reload schema';
