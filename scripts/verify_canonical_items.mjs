import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const items = JSON.parse(fs.readFileSync(path.join(root, "src/domain/gameplay/canonical/data/items_20260822.json"), "utf8")).items;
const legacyIds = ["LAW_OF_STRIFE", "ITEM_STAMINA_01", "ITEM_EXP_DRINK", "TRAINING_MANUAL", "EXCLUSIVE_CONTRACT", "EQUIP_LB_HAMMER", "SKILL_LB_BOOK", "NORMAL_GACHA_TICKET"];
const requiredIds = [
  "CHAR_EXP_S", "CHAR_EXP_M", "CHAR_EXP_L", "EQUIP_EXP_S", "EQUIP_EXP_M", "EQUIP_EXP_L",
  "AWAKENING_BOOK", "SKILL_MANUAL", "EQUIP_LB_PART", "ENERGY_DRINK", "PVP_POINT_TICKET", "RAID_POINT_TICKET",
  "NORMAL_GACHA_TICKET_CHARACTER", "NORMAL_GACHA_TICKET_SKILL", "NORMAL_GACHA_TICKET_EQUIPMENT",
  "SPECIAL_TICKET_CHARACTER", "SPECIAL_TICKET_SKILL", "SPECIAL_TICKET_EQUIPMENT",
];

assert.equal(items.length, 18);
assert.equal(new Set(items.map((item) => item.id)).size, items.length);
assert.deepEqual([...items.map((item) => item.id)].sort(), [...requiredIds].sort());
assert.equal(items.filter((item) => legacyIds.includes(item.id)).length, 0);
assert.deepEqual(items.filter((item) => item.id.startsWith("CHAR_EXP_")).map((item) => item.runtimeUsage.effectValue), [100, 500, 2000]);
assert.deepEqual(items.filter((item) => item.id.startsWith("EQUIP_EXP_")).map((item) => item.runtimeUsage.effectValue), [100, 500, 2500]);
assert.equal(items.find((item) => item.id === "ENERGY_DRINK").runtimeUsage.effectValue, 50);
assert.deepEqual(items.find((item) => item.id === "AWAKENING_BOOK").runtimeUsage, {
  copyEquivalentValue: 1,
  manualAwakeningCost: 1,
  duplicateOverflowQuantity: 1,
  cashCost: 0,
});
assert.ok(items.every((item) => item.isProductionEnabled && item.assetPath.startsWith("/items/")));

const activeFiles = [
  "src/app/context/GameContext.tsx", "src/app/context/hooks/useInventory.ts", "src/app/context/hooks/useCharacterProgression.ts",
  "src/app/components/BagTab.tsx", "src/utils/items_master_data.ts", "src/utils/login_bonus_master_data.ts",
  "src/utils/game_constants.ts", "src/utils/mock/mockRpc.ts", "src/utils/missions_master_data.ts",
];
for (const relative of activeFiles) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  for (const legacyId of legacyIds) assert.equal(text.includes(`"${legacyId}"`) || text.includes(`'${legacyId}'`), false, `${legacyId} remains active in ${relative}`);
}
console.log("Canonical Item verification PASS: 18 unique Production items, canonical EXP values, active legacy ID references 0.");
