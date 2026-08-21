import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "specs/production/gameplay_foundation/equipment_gameplay_master_20260821.md");
const destination = resolve(root, "src/domain/gameplay/canonical/data/equipment_20260821.json");
const canonicalDataDirectory = dirname(destination);

const primaryStatByCategory = { WEAPON: "atk", HEAD: "hp", BODY: "hp", LEGS: "def", ACCESSORY: null };
const exclusiveCharacterByEquipmentId = {
  WEAPON_047: "char_go_01", WEAPON_048: "char_leo_01", WEAPON_049: "char_kengo_01", WEAPON_050: "char_koharu_01",
  HEAD_020: "char_miyabi_01", BODY_029: "char_mio_01", BODY_030: "char_reiji_01", LEGS_020: "char_ageha_01",
  ACCESSORY_049: "char_karen_01", ACCESSORY_050: "char_kaede_01",
};
const nameOverrides = { ACCESSORY_049: "フェイト・チャーム", ACCESSORY_050: "クイーンズ・シグネット" };

function statsFromText(text) {
  const stats = { hp: 0, atk: 0, def: 0, spd: 0, luk: 0 };
  for (const match of text.matchAll(/\b(HP|ATK|DEF|SPD|LUK)\s*([+-])\s*(\d+)(?!\s*%)/gi)) {
    const key = match[1].toLowerCase();
    stats[key] += (match[2] === "-" ? -1 : 1) * Number(match[3]);
  }
  return stats;
}

function parseEquipment(line) {
  const cells = line.split("|").slice(1).map((cell) => cell.trim());
  const id = cells[0];
  const category = id.split("_")[0];
  const rarity = cells[1].match(/^(SSR|SR|R|N)/)?.[1];
  if (!rarity || !primaryStatByCategory.hasOwnProperty(category)) return null;

  const primaryIndex = category === "BODY" ? 3 : category === "ACCESSORY" ? -1 : 3;
  const name = nameOverrides[id] ?? cells[2].replace(/(HP|ATK|DEF|SPD|LUK)\s*[+-]\s*\d+.*$/i, "").trim();
  const rawDetails = cells.slice(3).join(" | ");
  const baseStats = statsFromText(rawDetails);
  if (primaryIndex >= 0) baseStats[primaryStatByCategory[category]] = Number(cells[primaryIndex]) || 0;
  if (category === "BODY") baseStats.def = Number(cells[4]) || 0;

  return {
    equipment_id: id,
    display_name: name,
    rarity,
    category,
    base_stats: baseStats,
    fixed_effects: cells.slice(category === "BODY" ? 5 : 4).filter(Boolean),
    exclusive_character_id: exclusiveCharacterByEquipmentId[id] ?? null,
    random_options: false,
  };
}

const seen = new Set();
const equipments = readFileSync(source, "utf8").split(/\r?\n/)
  .filter((line) => /^\|(WEAPON|HEAD|BODY|LEGS|ACCESSORY)_\d{3}\|/.test(line))
  .map(parseEquipment)
  .filter(Boolean)
  .filter((equipment) => !seen.has(equipment.equipment_id) && seen.add(equipment.equipment_id));

if (equipments.length !== 170) throw new Error(`Expected 170 equipment records, received ${equipments.length}`);
mkdirSync(canonicalDataDirectory, { recursive: true });
writeFileSync(destination, `${JSON.stringify({ version: "2026-08-21", status: "PRODUCTION_FROZEN", equipments }, null, 2)}\n`);
for (const filename of ["characters_20260821.json", "skills_20260821.json", "equipment_limit_break_20260821.json"]) {
  const snapshot = resolve(root, "specs/production/gameplay_foundation/freeze_snapshot", filename);
  writeFileSync(resolve(canonicalDataDirectory, filename), readFileSync(snapshot, "utf8"));
}
console.log(`Generated ${destination} with ${equipments.length} equipment records.`);
