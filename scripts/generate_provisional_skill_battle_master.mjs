import { writeFileSync } from "node:fs";
import { SKILLS_MASTER_DATA } from "../src/utils/skills_master_data.ts";

const cooldownByRarity = { N: 2, R: 3, SR: 4, SSR: 5 };
const allTargetIds = new Set(["SKILL_012", "SKILL_022", "SKILL_023", "SKILL_024", "SKILL_025", "SKILL_026", "SKILL_034", "SKILL_037", "SKILL_039", "SKILL_040", "SKILL_041", "SKILL_043", "SKILL_045", "SKILL_046", "SKILL_047", "SKILL_049"]);
const statusById = new Map([
  ["SKILL_005", ["POISON", 80]], ["SKILL_010", ["BLIND", 75]],
  ["SKILL_018", ["STUN", 50]], ["SKILL_030", ["SILENCE", 65]],
  ["SKILL_032", ["POISON", 80]], ["SKILL_034", ["BLIND", 75]],
  ["SKILL_040", ["POISON", 80]], ["SKILL_043", ["STUN", 30]],
  ["SKILL_046", ["POISON", 80]], ["SKILL_049", ["BLIND", 75]],
]);
const modifierById = new Map([
  ["SKILL_004", ["BUFF", "SPD", 15, 2]], ["SKILL_006", ["BUFF", "DEF", 20, 2]],
  ["SKILL_007", ["DEBUFF", "ATK", 20, 2]], ["SKILL_009", ["BUFF", "ATK", 20, 2]],
  ["SKILL_014", ["BUFF", "DEF", 15, 2]], ["SKILL_015", ["DEBUFF", "DEF", 20, 2]],
  ["SKILL_016", ["BUFF", "DEF", 25, 2]], ["SKILL_017", ["BUFF", "ATK", 20, 2]],
  ["SKILL_020", ["BUFF", "SPD", 15, 2]], ["SKILL_024", ["BUFF", "DEF", 20, 2]],
  ["SKILL_025", ["DEBUFF", "ATK", 20, 2]], ["SKILL_026", ["BUFF", "ATK", 20, 2]],
  ["SKILL_031", ["BUFF", "DEF", 20, 2]], ["SKILL_033", ["BUFF", "SPD", 20, 2]],
  ["SKILL_035", ["BUFF", "ATK", 25, 2]], ["SKILL_038", ["BUFF", "DEF", 25, 2]],
  ["SKILL_041", ["BUFF", "ATK", 25, 2]], ["SKILL_045", ["BUFF", "ATK", 25, 2]],
  ["SKILL_047", ["BUFF", "DEF", 25, 2]],
]);

const rows = SKILLS_MASTER_DATA.map((skill) => {
  const enabled = Number(skill.id.slice(-3)) <= 50;
  let kind = skill.effect_type;
  let modifier = null;
  if (statusById.has(skill.id)) {
    kind = "ATTACK";
  } else if (modifierById.has(skill.id)) {
    const [mappedKind, stat, percent, duration] = modifierById.get(skill.id);
    kind = mappedKind;
    modifier = { stat, percent, duration };
  } else if (kind === "DEFENSE") {
    kind = "BUFF";
    modifier = { stat: "DEF", percent: Math.min(25, Math.max(15, Math.round(skill.power / 10))), duration: 2 };
  } else if (kind === "SUPPORT") {
    kind = "BUFF";
    modifier = { stat: "ATK", percent: Math.min(25, Math.max(15, skill.power)), duration: 2 };
  } else if (kind === "JAMMER" && !statusById.has(skill.id)) {
    kind = "DEBUFF";
    modifier = { stat: "ATK", percent: Math.min(25, Math.max(15, skill.power)), duration: 2 };
  }
  const ally = kind === "HEAL" || kind === "BUFF";
  const target = `${ally ? "ALLY" : "ENEMY"}_${allTargetIds.has(skill.id) ? "ALL" : "SINGLE"}`;
  // The finalized rules prohibit area-wide stun/silence. SKILL_043 keeps its
  // area damage but drops the legacy area stun in the provisional revision.
  const status = skill.id === "SKILL_043" ? null : statusById.get(skill.id);
  const rawPower = kind === "ATTACK" || kind === "HEAL" ? skill.power : 0;
  const powerPercent = kind === "HEAL" ? Math.min(allTargetIds.has(skill.id) ? 18 : 30, rawPower) : rawPower;
  return {
    skillId: skill.id, displayName: skill.name, enabled,
    kind, target, powerPercent,
    cooldown: cooldownByRarity[skill.rarity], initialCooldown: 0,
    status: status?.[0] || null, statusChance: status?.[1] || null,
    modifier, sourceRevision: "OPEN_BETA_PROVISIONAL_V1",
  };
});

const columns = ["skill_id", "display_name", "enabled", "kind", "target", "power_percent", "cooldown", "initial_cooldown", "status", "status_chance", "modifier_stat", "modifier_percent", "modifier_duration", "source_revision"];
const quote = (value) => value == null ? "null" : typeof value === "boolean" || typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const valueRows = rows.map((row) => [
  row.skillId, row.displayName, row.enabled, row.kind, row.target, row.powerPercent,
  row.cooldown, row.initialCooldown, row.status, row.statusChance,
  row.modifier?.stat, row.modifier?.percent, row.modifier?.duration, row.sourceRevision,
]);
const values = valueRows.map((row) => `  (${row.map(quote).join(", ")})`).join(",\n");
const migrationValues = valueRows.map((row) => `  (${[...row, null].map(quote).join(", ")})`).join(",\n");
const sql = `-- REVIEW DRAFT ONLY. Do not apply before approval.\ninsert into public.skill_battle_master (${columns.join(", ")}) values\n${values};\n`;
writeFileSync(new URL("../supabase/manual/review_open_beta_provisional_skill_battle_master.sql", import.meta.url), sql, "utf8");
writeFileSync(new URL("../specs/open_beta_provisional_skill_battle_master.json", import.meta.url), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
const migration = `-- Open Beta M3-3b: replaceable, server-authoritative executable skill master.\n\ncreate table if not exists public.skill_battle_master (\n  skill_id text primary key,\n  display_name text not null,\n  enabled boolean not null default false,\n  kind text not null check (kind in ('ATTACK','HEAL','BUFF','DEBUFF')),\n  target text not null check (target in ('ENEMY_SINGLE','ENEMY_ALL','ALLY_SINGLE','ALLY_ALL')),\n  power_percent integer not null default 0 check (power_percent >= 0),\n  cooldown integer not null check (cooldown between 0 and 10),\n  initial_cooldown integer not null default 0 check (initial_cooldown between 0 and 10),\n  status text check (status in ('POISON','BLIND','SILENCE','STUN')),\n  status_chance integer check (status_chance between 5 and 95),\n  modifier_stat text check (modifier_stat in ('ATK','DEF','SPD')),\n  modifier_percent integer check (modifier_percent between 0 and 25),\n  modifier_duration integer check (modifier_duration between 1 and 5),\n  exclusive_character_id text,\n  source_revision text not null,\n  updated_at timestamptz not null default now(),\n  check ((kind in ('ATTACK','HEAL') and power_percent > 0) or (kind in ('BUFF','DEBUFF') and modifier_stat is not null)),\n  check (not (target = 'ENEMY_ALL' and status in ('SILENCE','STUN')))\n);\n\n${sql.replace("-- REVIEW DRAFT ONLY. Do not apply before approval.\n", "").replace(") values", ", exclusive_character_id) values").replaceAll(")\n", ", null)\n").replaceAll("),\n", ", null),\n")}\n\ndo $migration$\ndeclare\n  v_definition text;\n  v_updated text;\n  v_old_lateral text := $old$    left join lateral (\n      select jsonb_agg(jsonb_build_object(\n        'skillId', owned.skill_card_id,\n        'slotIndex', owned.slot_index,\n        'plusValue', greatest(least(coalesce(owned.plus_val, 0), 10), 0),\n        'effectScale', case\n          when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 3\n            then 1 + greatest(least(coalesce(owned.plus_val, 0), 10), 0) * 0.05\n          when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 6\n            then 1.15 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 3) * 0.04\n          when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 9\n            then 1.27 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 6) * 0.03\n          else 1.41\n        end\n      ) order by owned.slot_index, owned.skill_card_id) as loadout\n      from public.user_skills owned\n      where owned.user_id = v_user_id\n        and owned.equipped_character_id = base.id::text\n    ) skills on true$old$;\n  v_new_lateral text := $new$    left join lateral (\n      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(\n        'id', master.skill_id,\n        'name', master.display_name,\n        'kind', master.kind,\n        'target', master.target,\n        'powerPercent', round(master.power_percent * scaled.effect_scale)::integer,\n        'cooldown', master.cooldown,\n        'initialCooldown', master.initial_cooldown,\n        'status', master.status,\n        'statusChance', case when master.status_chance is null then null else least(95, round(master.status_chance * scaled.effect_scale)::integer) end,\n        'modifier', case when master.modifier_stat is null then null else jsonb_build_object(\n          'stat', master.modifier_stat,\n          'percent', least(25, round(master.modifier_percent * scaled.effect_scale)::integer),\n          'duration', master.modifier_duration\n        ) end,\n        'skillId', master.skill_id,\n        'slotIndex', owned.slot_index,\n        'plusValue', scaled.plus_value,\n        'effectScale', scaled.effect_scale\n      )) order by owned.slot_index, master.skill_id) as loadout\n      from public.user_skills owned\n      join public.skill_battle_master master on master.skill_id = owned.skill_card_id and master.enabled\n      cross join lateral (\n        select greatest(least(coalesce(owned.plus_val, 0), 10), 0) as plus_value,\n          case\n            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 3 then 1 + greatest(least(coalesce(owned.plus_val, 0), 10), 0) * 0.05\n            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 6 then 1.15 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 3) * 0.04\n            when greatest(least(coalesce(owned.plus_val, 0), 10), 0) <= 9 then 1.27 + (greatest(least(coalesce(owned.plus_val, 0), 10), 0) - 6) * 0.03\n            else 1.41\n          end as effect_scale\n      ) scaled\n      where owned.user_id = v_user_id\n        and owned.equipped_character_id = base.id::text\n        and owned.slot_index between 0 and least(5, 2 + greatest(coalesce(base.awakening_level, 0), 0))\n        and (master.exclusive_character_id is null or master.exclusive_character_id = base.character_id)\n    ) skills on true$new$;\n  v_old_output text := $old$    'equippedSkillRefs', canonical.equipped_skill_refs,\n    'skills', jsonb_build_array(jsonb_build_object(\n      'id', 'basic_attack_' || canonical.id::text, 'name', 'Attack',\n      'kind', 'ATTACK', 'target', 'ENEMY_SINGLE', 'powerPercent', 100, 'cooldown', 0\n    ))$old$;\n  v_new_output text := $new$    'equippedSkillRefs', canonical.equipped_skill_refs,\n    'skills', jsonb_build_array(jsonb_build_object(\n      'id', 'basic_attack_' || canonical.id::text, 'name', 'Attack',\n      'kind', 'ATTACK', 'target', 'ENEMY_SINGLE', 'powerPercent', 100, 'cooldown', 0\n    )) || canonical.equipped_skill_refs$new$;\nbegin\n  select pg_get_functiondef(to_regprocedure('public.create_patrol_battle_replay(uuid,text)')) into v_definition;\n  if v_definition is null then raise exception 'create_patrol_battle_replay(uuid,text) is required' using errcode = 'P0002'; end if;\n  v_updated := replace(replace(v_definition, v_old_lateral, v_new_lateral), v_old_output, v_new_output);\n  if v_updated = v_definition or position(v_old_lateral in v_updated) > 0 or position(v_old_output in v_updated) > 0 then\n    raise exception 'existing patrol skill snapshot did not match the expected M2-4a definition';\n  end if;\n  execute v_updated;\nend;\n$migration$;\n\nrevoke all on table public.skill_battle_master from public, anon, authenticated;\nrevoke all on function public.create_patrol_battle_replay(uuid,text) from public, anon;\ngrant execute on function public.create_patrol_battle_replay(uuid,text) to authenticated;\nnotify pgrst, 'reload schema';\n`;
writeFileSync(new URL("../supabase/manual/review_generated_skill_battle_migration.sql", import.meta.url), migration, "utf8");
console.log(`Generated ${rows.length} review rows (${rows.filter((row) => row.enabled).length} enabled, ${rows.filter((row) => !row.enabled).length} disabled).`);
