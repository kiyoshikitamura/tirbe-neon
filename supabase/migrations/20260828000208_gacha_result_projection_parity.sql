-- Phase 6-B: preserve the frozen Gacha formula while converging the Skill
-- overflow reward ID and result projection on the Canonical Item authority.
do $$
declare
  v_definition text;
  v_converted_before text := '''type'', ''SKILL'', ''item_id'', v_item_id, ''rarity'', v_rarity, ''outcome'', ''converted''';
  v_converted_after text := '''type'', ''SKILL'', ''item_id'', v_item_id, ''rarity'', v_rarity, ''outcome'', ''converted'', ''conversion_item_id'', ''SKILL_MANUAL'', ''conversion_quantity'', 2';
  v_progress_before text := '''type'', ''SKILL'', ''item_id'', v_item_id, ''rarity'', v_rarity, ''outcome'', ''limit_break''';
  v_progress_after text := '''type'', ''SKILL'', ''item_id'', v_item_id, ''rarity'', v_rarity, ''outcome'', ''limit_break'', ''plus_val'', coalesce(v_existing.plus_val, 0) + 1';
begin
  select pg_get_functiondef('public.execute_asset_gacha(uuid,text,integer,text,uuid)'::regprocedure)
  into v_definition;

  if position('TRAINING_MANUAL' in v_definition) = 0 then
    raise exception 'execute_asset_gacha legacy Skill overflow reward was not found';
  end if;
  if position(v_converted_before in v_definition) = 0 then
    raise exception 'execute_asset_gacha converted result projection was not found';
  end if;
  if position(v_progress_before in v_definition) = 0 then
    raise exception 'execute_asset_gacha Skill progression projection was not found';
  end if;

  v_definition := replace(v_definition, '''TRAINING_MANUAL''', '''SKILL_MANUAL''');
  v_definition := replace(v_definition, v_converted_before, v_converted_after);
  v_definition := replace(v_definition, v_progress_before, v_progress_after);
  execute v_definition;
end;
$$;

do $$
declare
  v_definition text := pg_get_functiondef('public.execute_asset_gacha(uuid,text,integer,text,uuid)'::regprocedure);
begin
  if position('TRAINING_MANUAL' in v_definition) > 0 then
    raise exception 'Legacy Skill overflow reward remains in execute_asset_gacha';
  end if;
  if position('conversion_item_id' in v_definition) = 0
     or position('conversion_quantity' in v_definition) = 0
     or position('plus_val' in v_definition) = 0 then
    raise exception 'Canonical Gacha result projection is incomplete';
  end if;
end;
$$;
