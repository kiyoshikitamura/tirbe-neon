-- Phase 2C: exclusive-skill runtime validation requires the canonical Character ID.
begin;

alter function public.canonical_equipment_runtime_projection(uuid,uuid)
  rename to canonical_equipment_runtime_projection_00170;

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
