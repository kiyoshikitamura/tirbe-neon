-- Phase 2C: exclusive-skill runtime validation requires the canonical Character ID.
begin;

do $converge_projection$
declare
  v_current text;
  v_backup text;
begin
  if to_regprocedure('public.canonical_equipment_runtime_projection_00170(uuid,uuid)') is null then
    if to_regprocedure('public.canonical_equipment_runtime_projection(uuid,uuid)') is null then
      raise exception 'canonical_equipment_runtime_projection(uuid,uuid) is required' using errcode='P0002';
    end if;
    alter function public.canonical_equipment_runtime_projection(uuid,uuid)
      rename to canonical_equipment_runtime_projection_00170;
    return;
  end if;

  select pg_get_functiondef(to_regprocedure('public.canonical_equipment_runtime_projection(uuid,uuid)')),
         pg_get_functiondef(to_regprocedure('public.canonical_equipment_runtime_projection_00170(uuid,uuid)'))
  into v_current,v_backup;
  if v_current is not null
     and position('canonical_equipment_runtime_projection_00170' in v_current)>0
     and position('characterId' in v_current)>0 then
    return;
  end if;
  if v_current is not null and v_backup is not null
     and position('statusModifiers' in v_current)>0
     and position('equipmentEffects' in v_current)>0
     and position('statusModifiers' in v_backup)>0
     and position('equipmentEffects' in v_backup)>0 then
    return;
  end if;
  raise exception 'equipment runtime projections do not match a known 00171 canonical state';
end;
$converge_projection$;

create or replace function public.canonical_equipment_runtime_projection(
  p_user_id uuid,
  p_user_character_id uuid
) returns jsonb
language sql stable security definer set search_path=public as $$
  select public.canonical_equipment_runtime_projection_00170(p_user_id,p_user_character_id)
    || jsonb_build_object('characterId',character_id)
  from public.user_characters
  where id=p_user_character_id and user_id=p_user_id
$$;

revoke all on function public.canonical_equipment_runtime_projection_00170(uuid,uuid),public.canonical_equipment_runtime_projection(uuid,uuid) from public,anon;

commit;
notify pgrst,'reload schema';
