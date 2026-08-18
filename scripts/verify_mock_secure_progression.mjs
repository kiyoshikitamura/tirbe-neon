const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
};

const userId = "progression-owner";
localStorage.setItem("tribe_demo_uuid", userId);
const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};

client.setStorage("users", [{ id: userId, cash: 100000 }, { id: "other", cash: 100000 }]);
client.setStorage("user_items", [
  { user_id: userId, item_id: "CHAR_EXP_S", quantity: 10 },
  { user_id: userId, item_id: "EQUIP_EXP_S", quantity: 10 },
  { user_id: userId, item_id: "EQUIP_LB_HAMMER", quantity: 2 },
  { user_id: userId, item_id: "EXCLUSIVE_CONTRACT", quantity: 2 },
]);
client.setStorage("user_characters", [
  { id: "owned-char", user_id: userId, character_id: "CHAR_001", level: 49, awakening_level: 0 },
  { id: "other-char", user_id: "other", character_id: "CHAR_002", level: 1, awakening_level: 5 },
]);
client.setStorage("user_equipments", [
  { id: "owned-gear", user_id: userId, equipment_id: "GEAR_001", level: 50, plus_val: 1, equipped_character_id: null },
  { id: "dupe-gear", user_id: userId, equipment_id: "GEAR_001", level: 1, plus_val: 0, equipped_character_id: null },
]);
client.setStorage("user_skills", [
  { id: "owned-skill", user_id: userId, skill_card_id: "SKILL_051", plus_val: 0, equipped_character_id: null },
  { id: "dupe-skill", user_id: userId, skill_card_id: "SKILL_051", plus_val: 0, equipped_character_id: null },
]);

const charResult = await executeMockRpc(client, "level_up_character", { p_character_id: "owned-char", p_exp_item_id: "CHAR_EXP_S", p_count: 5 });
if (charResult.error || charResult.data.level !== 50 || charResult.data.cash_spent !== 100) throw new Error("Character level cap or authoritative cost failed");
const crossUser = await executeMockRpc(client, "level_up_character", { p_character_id: "other-char", p_exp_item_id: "CHAR_EXP_S", p_count: 1 });
if (crossUser.error?.code !== "P0002") throw new Error("Cross-user character progression was not rejected");

const gearLevel = await executeMockRpc(client, "level_up_equipment", { p_equipment_id: "owned-gear", p_exp_item_id: "EQUIP_EXP_S", p_count: 3 });
if (gearLevel.error || gearLevel.data.level !== 53 || gearLevel.data.level_cap !== 60 || gearLevel.data.cash_spent !== 150) throw new Error("Equipment unlocked level cap failed");
const gearBreak = await executeMockRpc(client, "limit_break_equipment", { p_equipment_id: "owned-gear", p_use_wildcard: false, p_dupe_id: "dupe-gear" });
if (gearBreak.error || gearBreak.data.plus_val !== 2 || gearBreak.data.cash_spent !== 2000 || client.getStorage("user_equipments").some((entry) => entry.id === "dupe-gear")) throw new Error("Equipment duplicate limit break failed");

const skillBreak = await executeMockRpc(client, "limit_break_skill", { p_skill_id: "owned-skill", p_use_wildcard: true, p_dupe_id: null });
const contract = client.getStorage("user_items").find((entry) => entry.item_id === "EXCLUSIVE_CONTRACT");
if (skillBreak.error || skillBreak.data.plus_val !== 1 || skillBreak.data.cash_spent !== 1000 || contract.quantity !== 1) throw new Error("Exclusive skill wildcard limit break failed");

console.log("Mock secure provisional progression verification passed.");
