-- GAME03 Phase 2B.5: preserve canonical stat rounding while avoiding int4 intermediate overflow.
begin;

create or replace function public.canonical_character_stats(p_character_id text, p_level integer, p_awakening integer)
returns table(hp integer, atk integer, def integer, spd integer, luk integer)
language sql stable set search_path=public as $$
  with source as (
    select *,
      greatest(least(p_level, 100), 1)::bigint as character_level,
      greatest(least(p_awakening, 5), 0)::integer as awakening
    from public.canonical_character_master
    where version = '2026-08-21' and character_id = p_character_id
  ), level_stats as (
    select
      lv1_hp::bigint + ((lv100_hp::bigint - lv1_hp::bigint) * (character_level - 1) / 99) as hp,
      lv1_atk::bigint + ((lv100_atk::bigint - lv1_atk::bigint) * (character_level - 1) / 99) as atk,
      lv1_def::bigint + ((lv100_def::bigint - lv1_def::bigint) * (character_level - 1) / 99) as def,
      lv1_spd::bigint + ((lv100_spd::bigint - lv1_spd::bigint) * (character_level - 1) / 99) as spd,
      lv1_luk::bigint + ((lv100_luk::bigint - lv1_luk::bigint) * (character_level - 1) / 99) as luk,
      awakening
    from source
  )
  select
    (hp * (array[10000,10800,11500,13200,15000,17500]::bigint[])[awakening + 1] / 10000)::integer,
    (atk * (array[10000,10800,11500,13200,15000,17500]::bigint[])[awakening + 1] / 10000)::integer,
    (def * (array[10000,10800,11500,13200,15000,17500]::bigint[])[awakening + 1] / 10000)::integer,
    (spd * (array[10000,10300,10600,11000,11500,12000]::bigint[])[awakening + 1] / 10000)::integer,
    (luk * (array[10000,10300,10600,11000,11500,12000]::bigint[])[awakening + 1] / 10000)::integer
  from level_stats
$$;

commit;
notify pgrst, 'reload schema';
