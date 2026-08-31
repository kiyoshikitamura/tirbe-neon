begin;

-- Keep the canonical pool, rarity template, stats, skills, and random selection
-- unchanged. The previous integer FOR target restored its outer value after
-- each rarity group, which produced duplicate enemy runtime ids. Maintain one
-- explicit member counter across all groups so Battle Presentation can address
-- every authoritative snapshot member independently.
create or replace function public.generate_canonical_quest_encounter_snapshot(
  p_user_id uuid,
  p_quest_id text,
  p_allow_repeat_reroll boolean default true
) returns jsonb
language plpgsql volatile security definer set search_path=public as $$
declare
  v_q record; v_payload jsonb; v_base jsonb; v_area jsonb; v_growth jsonb;
  v_entry record; v_members jsonb:='[]'; v_used text[]:='{}'; v_rarity text;
  v_count integer; v_slot integer:=0; v_iteration integer; v_sr integer;
  v_stats jsonb; v_skills jsonb; v_signature text; v_previous text;
begin
 select * into v_q from public.canonical_quest_master where version='2026-08-30' and quest_id=p_quest_id and is_production_enabled;
 if not found then raise exception 'Canonical Quest is unavailable' using errcode='P0002'; end if;
 select payload into v_payload from public.canonical_master_freeze_versions where domain='QUEST_ENEMY_POOL' and version='2026-08-30' and is_production_enabled;
 v_base:=v_payload#>array['contract','baseStats',v_q.difficulty]; v_area:=v_payload#>array['areaModifiers',upper(v_q.town_id)];
 select encounter_party_signature into v_previous from public.user_patrols where user_id=p_user_id and course_id=p_quest_id and encounter_party_signature is not null order by started_at desc limit 1;
 v_sr:=case when v_q.difficulty='NORMAL' then 1+floor(random()*2)::integer when v_q.difficulty='HARD' then 2+floor(random()*2)::integer else 0 end;
 foreach v_rarity in array array['N','R','SR'] loop
  v_count:=case when v_q.difficulty='EASY' and v_rarity='N' then 2 when v_q.difficulty='EASY' and v_rarity='R' then 1 when v_q.difficulty='NORMAL' and v_rarity='N' then 2 when v_q.difficulty='NORMAL' and v_rarity='R' then 5-2-v_sr when v_q.difficulty='NORMAL' and v_rarity='SR' then v_sr when v_q.difficulty='HARD' and v_rarity='R' then 5-v_sr when v_q.difficulty='HARD' and v_rarity='SR' then v_sr else 0 end;
  for v_iteration in 1..v_count loop
   v_slot:=v_slot+1;
   select * into v_entry from public.canonical_quest_enemy_pool_entries e where e.version='2026-08-30' and e.pool_key=v_q.enemy_pool_key and e.rarity=v_rarity and e.character_id<>all(v_used) order by -ln(greatest(random(),0.000000000001))/e.weight limit 1;
   if not found then raise exception 'Canonical enemy pool cannot satisfy unique party'; end if;
   v_used:=array_append(v_used,v_entry.character_id); v_growth:=v_payload#>array['growthModifiers',v_entry.growth_pattern];
   v_stats:=jsonb_build_object('hp',round((v_base->>'hp')::numeric*(v_area->>'hp')::numeric*(v_growth->>'hp')::numeric),'atk',round((v_base->>'atk')::numeric*(v_area->>'atk')::numeric*(v_growth->>'atk')::numeric),'def',round((v_base->>'def')::numeric*(v_area->>'def')::numeric*(v_growth->>'def')::numeric),'spd',round(((v_base->>'spdMin')::numeric+random()*((v_base->>'spdMax')::numeric-(v_base->>'spdMin')::numeric))*(v_area->>'spd')::numeric*(v_growth->>'spd')::numeric),'luk',0);
   select coalesce(jsonb_agg(jsonb_build_object('id',s.skill_id,'name',s.display_name,'activationType',s.activation_type,'cooldown',s.cooldown,'availableFromRound',s.available_from_round,'target',s.target,'effects',s.effects,'exclusiveCharacterId',s.exclusive_character_id) order by x.ordinality),'[]') into v_skills from jsonb_array_elements_text(v_entry.skill_loadout) with ordinality x(skill_id,ordinality) join public.canonical_skill_master s on s.version='2026-08-21' and s.skill_id=x.skill_id;
   v_members:=v_members||jsonb_build_array(jsonb_build_object('id','enemy_'||p_quest_id||'_'||v_slot,'characterId',v_entry.character_id,'name',coalesce((select display_name from public.canonical_character_master where version='2026-08-21' and character_id=v_entry.character_id),v_entry.character_id),'team','ENEMY','alignment',coalesce((select attribute from public.canonical_character_master where version='2026-08-21' and character_id=v_entry.character_id),'NEUTRAL'),'level',case v_q.difficulty when 'EASY' then 5 when 'NORMAL' then 12 else 20 end,'awakeningLevel',0,'rarity',v_entry.rarity,'stats',v_stats,'equipment','[]'::jsonb,'equippedSkillRefs',v_entry.skill_loadout,'skills',v_skills));
  end loop;
 end loop;
 select string_agg(value->>'characterId','|' order by value->>'characterId') into v_signature from jsonb_array_elements(v_members);
 if p_allow_repeat_reroll and v_previous is not null and v_signature=v_previous then return public.generate_canonical_quest_encounter_snapshot(p_user_id,p_quest_id,false); end if;
 return jsonb_build_object('members',v_members,'partySignature',v_signature,'enemyTactic','BALANCED');
end $$;

commit;
