-- Phase 2C: expose Canonical equipment/status runtime inputs without rewriting 00168.
begin;

do $converge_snapshot$
declare
  v_current text;
  v_backup text;
begin
  if to_regprocedure('public.build_server_battle_snapshot_00168(uuid,text[],text)') is null then
    if to_regprocedure('public.build_server_battle_snapshot(uuid,text[],text)') is null then
      raise exception 'build_server_battle_snapshot(uuid,text[],text) is required' using errcode='P0002';
    end if;
    alter function public.build_server_battle_snapshot(uuid,text[],text)
      rename to build_server_battle_snapshot_00168;
    return;
  end if;

  -- Preview may already contain the exact 00170 wrapper from an earlier
  -- targeted apply while migration history is behind. Only that known wrapper
  -- is accepted; any other duplicate backup/current pair remains fail-closed.
  select pg_get_functiondef(to_regprocedure('public.build_server_battle_snapshot(uuid,text[],text)'))
  into v_current;
  select pg_get_functiondef(to_regprocedure('public.build_server_battle_snapshot_00168(uuid,text[],text)'))
  into v_backup;
  if v_current is not null
     and position('build_server_battle_snapshot_00168' in v_current)>0
     and position('canonical_equipment_runtime_projection' in v_current)>0 then
    return;
  end if;

  -- Applying 00168 normally to a Preview whose objects were previously
  -- hot-applied replaces the public wrapper with the canonical 00168 base,
  -- while the earlier backup remains. The statements below will recreate the
  -- wrapper; accept only when both functions have the audited base markers.
  if v_current is not null and v_backup is not null
     and position('canonical_character_stats' in v_current)>0
     and position('equipment_level_battle_scale' in v_current)>0
     and position('canonical_character_stats' in v_backup)>0
     and position('equipment_level_battle_scale' in v_backup)>0 then
    return;
  end if;
  raise exception 'battle snapshot functions do not match a known 00170 canonical state';
end;
$converge_snapshot$;

create or replace function public.canonical_equipment_runtime_projection(
  p_user_id uuid,
  p_user_character_id uuid
) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare
  v_status_chance integer := 0;
  v_status_resist integer := 0;
  v_blind_resist integer := 0;
  v_silence_resist integer := 0;
  v_crit_rate integer := 0;
  v_crit_damage integer := 0;
  v_damage_dealt integer := 0;
  v_damage_reduction integer := 0;
  v_effects jsonb := '[]'::jsonb;
  v_match text[];
  v_record record;
  v_raw text;
begin
  for v_record in
    select master.category, master.fixed_effects, greatest(least(coalesce(owned.plus_val,0),10),0) plus_val
    from public.user_equipments owned
    join public.canonical_equipment_master master
      on master.version='2026-08-21'
     and master.equipment_id=coalesce(nullif(owned.equipment_id,''),owned.equipment_master_id)
    join public.user_characters character
      on character.id=p_user_character_id and character.user_id=p_user_id
    where owned.user_id=p_user_id
      and owned.equipped_character_id=p_user_character_id::text
      and (master.exclusive_character_id is null or master.exclusive_character_id=character.character_id)
  loop
    v_effects := v_effects || v_record.fixed_effects || public.canonical_equipment_lb_options(v_record.category,v_record.plus_val);
    for v_raw in select jsonb_array_elements_text(v_record.fixed_effects)
    loop
      if v_raw !~* 'First Skill' then
        v_match := regexp_match(v_raw,'Status Chance([0-9]+)%','i');
        if v_match is not null then v_status_chance := greatest(v_status_chance,v_match[1]::integer*100); end if;
      end if;
      if v_raw !~* 'First Status' then
        v_match := regexp_match(v_raw,'Status Resist([0-9]+)%','i');
        if v_match is not null then v_status_resist := greatest(v_status_resist,v_match[1]::integer*100); end if;
      end if;
      v_match := regexp_match(v_raw,'Blind Resist([0-9]+)%','i');
      if v_match is not null then v_blind_resist := greatest(v_blind_resist,v_match[1]::integer*100); end if;
      v_match := regexp_match(v_raw,'Silence Resist([0-9]+)%','i');
      if v_match is not null then v_silence_resist := greatest(v_silence_resist,v_match[1]::integer*100); end if;
      v_match := regexp_match(v_raw,'Crit Rate([0-9]+)%','i');
      if v_match is not null then v_crit_rate := greatest(v_crit_rate,v_match[1]::integer*100); end if;
      v_match := regexp_match(v_raw,'Crit Damage([0-9]+)%','i');
      if v_match is not null then v_crit_damage := greatest(v_crit_damage,v_match[1]::integer*100); end if;
      v_match := regexp_match(v_raw,'DR([0-9]+)%','i');
      if v_match is not null then v_damage_reduction := greatest(v_damage_reduction,v_match[1]::integer*100); end if;
    end loop;

    if v_record.category='HEAD' and v_record.plus_val>=5 then v_status_resist:=greatest(v_status_resist,800); end if;
    if v_record.category='HEAD' and v_record.plus_val>=10 then v_damage_reduction:=greatest(v_damage_reduction,600); end if;
    if v_record.category='BODY' and v_record.plus_val>=10 then v_damage_reduction:=greatest(v_damage_reduction,800); end if;
    if v_record.category='ACCESSORY' and v_record.plus_val>=5 then v_crit_rate:=greatest(v_crit_rate,500); end if;
    if v_record.category='ACCESSORY' and v_record.plus_val>=10 then v_crit_damage:=greatest(v_crit_damage,1000); end if;
    if v_record.category='WEAPON' and v_record.plus_val>=5 then v_crit_damage:=greatest(v_crit_damage,800); end if;
    if v_record.category='WEAPON' and v_record.plus_val>=10 then v_damage_dealt:=greatest(v_damage_dealt,800); end if;
  end loop;

  return jsonb_build_object(
    'statusModifiers',jsonb_build_object(
      'statusChanceGenericBp',v_status_chance,
      'statusChanceIndividualBp',jsonb_build_object('STUN',0,'SILENCE',0,'BLIND',0,'POISON',0,'BLEED',0,'TAUNT',0),
      'statusResistanceGenericBp',least(v_status_resist,4000),
      'statusResistanceIndividualBp',jsonb_build_object('STUN',0,'SILENCE',least(v_silence_resist,5000),'BLIND',least(v_blind_resist,5000),'POISON',0,'BLEED',0,'TAUNT',0)
    ),
    'combatModifiers',jsonb_build_object(
      'criticalRatePositiveBp',v_crit_rate,
      'criticalRateNegativeBp',0,
      'criticalDamageBp',v_crit_damage,
      'damageDealtPositiveBp',v_damage_dealt,
      'damageDealtNegativeBp',0,
      'damageReductionBp',least(v_damage_reduction,6000)
    ),
    'equipmentEffects',v_effects
  );
end $$;

create or replace function public.build_server_battle_snapshot(
  p_user_id uuid,
  p_character_ids text[],
  p_team text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_base jsonb;
  v_result jsonb;
begin
  v_base := public.build_server_battle_snapshot_00168(p_user_id,p_character_ids,p_team);
  select jsonb_agg(unit.value || public.canonical_equipment_runtime_projection(
    p_user_id,
    regexp_replace(unit.value->>'id','^[^_]+_','')::uuid
  ) order by unit.ordinality)
  into v_result
  from jsonb_array_elements(v_base) with ordinality unit(value,ordinality);
  return coalesce(v_result,'[]'::jsonb);
end $$;

revoke all on function public.build_server_battle_snapshot_00168(uuid,text[],text),public.canonical_equipment_runtime_projection(uuid,uuid),public.build_server_battle_snapshot(uuid,text[],text) from public,anon;
grant execute on function public.build_server_battle_snapshot(uuid,text[],text) to service_role;

commit;
notify pgrst,'reload schema';
