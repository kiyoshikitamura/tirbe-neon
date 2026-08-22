begin;

drop policy if exists canonical_quest_master_read on public.canonical_quest_master;
create policy canonical_quest_master_read on public.canonical_quest_master
  for select to authenticated using (is_production_enabled);

drop policy if exists canonical_quest_reward_pool_items_read on public.canonical_quest_reward_pool_items;
create policy canonical_quest_reward_pool_items_read on public.canonical_quest_reward_pool_items
  for select to authenticated using (true);

drop policy if exists canonical_quest_encounter_master_read on public.canonical_quest_encounter_master;
create policy canonical_quest_encounter_master_read on public.canonical_quest_encounter_master
  for select to authenticated using (is_production_enabled);

commit;
notify pgrst,'reload schema';
