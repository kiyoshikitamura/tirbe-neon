-- Phase C1-R2 approved Development remediation: remove the three legacy
-- fixture UUIDs from CHAR_SPECIAL only. Canonical Character rows, rates,
-- prices, pity, ownership, history, rewards and user data are untouched.
begin;

delete from public.gacha_items_master
where gacha_id='CHAR_SPECIAL'
  and item_type='CHARACTER'
  and item_id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );

do $$
begin
  if exists(
    select 1
    from public.gacha_items_master pool
    left join public.canonical_character_master master
      on master.version='2026-08-21' and master.character_id=pool.item_id
    where pool.gacha_id in ('CHAR_NORMAL','CHAR_SPECIAL')
      and pool.item_type='CHARACTER'
      and master.character_id is null
  ) then raise exception 'Non-Canonical Character remains in Character Gacha pool'; end if;
end;
$$;

commit;
