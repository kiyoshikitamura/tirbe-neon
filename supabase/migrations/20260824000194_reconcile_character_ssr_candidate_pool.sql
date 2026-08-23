-- Phase C2: reconcile the guaranteed/Normal Character SSR candidate set with
-- Canonical Character 60. This does not change rarity rates, price, guarantees,
-- guaranteed-slot count, ownership, history, or duplicate semantics.
do $$
declare
  v_ssr_weight integer;
begin
  if not exists (
    select 1 from public.canonical_character_master
    where version='2026-08-21' and character_id='char_reiji_01' and rarity='SSR'
  ) then
    raise exception 'Canonical SSR authority missing for char_reiji_01' using errcode='23514';
  end if;

  select min(weight)::integer into v_ssr_weight
  from public.gacha_items_master
  where gacha_id='CHAR_SPECIAL' and item_type='CHARACTER' and rarity='SSR';
  if v_ssr_weight is null or exists (
    select 1 from public.gacha_items_master
    where gacha_id='CHAR_SPECIAL' and item_type='CHARACTER' and rarity='SSR' and weight<>v_ssr_weight
  ) then
    raise exception 'CHAR_SPECIAL SSR weight authority is missing or inconsistent' using errcode='23514';
  end if;

  insert into public.gacha_items_master(id,gacha_id,item_type,item_id,rarity,weight,is_pickup)
  values('CHAR_SPECIAL:char_reiji_01','CHAR_SPECIAL','CHARACTER','char_reiji_01','SSR',v_ssr_weight,false)
  on conflict(id) do update set
    item_type=excluded.item_type,item_id=excluded.item_id,rarity=excluded.rarity,weight=excluded.weight,is_pickup=false;

  if (select count(*) from public.canonical_character_master where version='2026-08-21' and rarity='SSR')<>10
     or (select count(*) from public.gacha_items_master pool join public.canonical_character_master master on master.version='2026-08-21' and master.character_id=pool.item_id and master.rarity='SSR' where pool.gacha_id='CHAR_SPECIAL' and pool.item_type='CHARACTER' and pool.rarity='SSR')<>10
     or exists (
       (select character_id from public.canonical_character_master where version='2026-08-21' and rarity='SSR')
       except
       (select item_id from public.gacha_items_master where gacha_id='CHAR_SPECIAL' and item_type='CHARACTER' and rarity='SSR')
     ) then
    raise exception 'Production SSR candidate set parity failed' using errcode='23514';
  end if;
end $$;
