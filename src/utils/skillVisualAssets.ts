const SKILL_ICON_SLUGS = [
  "street_punch","quick_shield","noise_heal","step_dash","poison_needle","iron_guard","toxic_slang","smart_snipe","drug_injection","light_flash",
  "meditate","lucky_shoot","charge_slash","blunt_sweep","recovery_program","smoke_screen","acid_spray","jamming_wave","impulse_barrier","indomitable_will",
  "high_voltage","tactical_reload","double_drive","inspiring_roar","protect_shield","venom_blade","synapse_burst","nanomachine_storm","toxic_gas","force_field",
  "hyper_accel","stun_grenade","atomic_cannon","life_steal","hologram_decoy","power_of_unity","crimson_end_bullet","barrier_shatter","timeline_rush","execution_strike",
  "quick_search","linked_strike","gouge_wound","cycle_off","preparation","life_extension","chain_shield","provocation_trigger","toxic_propagation","combo_heal",
  "draw_smash","in_sync_breathing","coordinated_care","trump_card","reserve_draw","ap_accelerator","tactical_charge","toxic_stimulation","venom_catalyst","tactical_draw",
  "adrenaline_rush","cycle_advance","limiter_release","search_destroy","absolute_discipline","discard_storm","blessing_of_neon","underhand_deal","disruption","jamming_barrier",
] as const;

export function getCanonicalSkillIcon(skillId: unknown): string | undefined {
  const match = /^SKILL_(\d{3})$/.exec(String(skillId || ""));
  if (!match) return undefined;
  const index = Number(match[1]) - 1;
  const slug = SKILL_ICON_SLUGS[index];
  return slug ? `/skills/skill_${match[1]}_${slug}.png` : undefined;
}
