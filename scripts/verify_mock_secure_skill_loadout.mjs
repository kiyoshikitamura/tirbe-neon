const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
};
const userId = "skill-loadout-owner";
localStorage.setItem("tribe_demo_uuid", userId);
const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};
client.setStorage("user_characters", [
  { id: "char-owned", user_id: userId, character_id: "character-1", awakening_level: 0 },
  { id: "char-other", user_id: "other-user", character_id: "character-2", awakening_level: 5 },
]);
client.setStorage("user_skills", [
  { id: "skill-1", user_id: userId, skill_card_id: "SKILL_001", equipped_character_id: null, slot_index: null },
  { id: "skill-2", user_id: userId, skill_card_id: "SKILL_002", equipped_character_id: null, slot_index: null },
  { id: "skill-disabled", user_id: userId, skill_card_id: "SKILL_051", equipped_character_id: null, slot_index: null },
  { id: "skill-other", user_id: "other-user", skill_card_id: "SKILL_003", equipped_character_id: null, slot_index: null },
]);
client.setStorage("skill_battle_master", [
  { skill_id: "SKILL_001", enabled: true, exclusive_character_id: null },
  { skill_id: "SKILL_002", enabled: true, exclusive_character_id: null },
  { skill_id: "SKILL_003", enabled: true, exclusive_character_id: null },
  { skill_id: "SKILL_051", enabled: false, exclusive_character_id: null },
]);

const single = await executeMockRpc(client, "set_character_skill", { p_character_id: "char-owned", p_skill_id: "skill-1", p_slot_index: 0 });
if (single.error) throw single.error;
const locked = await executeMockRpc(client, "set_character_skill", { p_character_id: "char-owned", p_skill_id: "skill-2", p_slot_index: 3 });
if (!locked.error || locked.error.message !== "skill slot is locked") throw new Error("Locked skill slot was accepted");
const otherOwner = await executeMockRpc(client, "set_character_skill", { p_character_id: "char-owned", p_skill_id: "skill-other", p_slot_index: 1 });
if (!otherOwner.error) throw new Error("Another user's skill was accepted");
const disabled = await executeMockRpc(client, "set_character_skill", { p_character_id: "char-owned", p_skill_id: "skill-disabled", p_slot_index: 1 });
if (!disabled.error) throw new Error("Disabled provisional skill was accepted");
const bulk = await executeMockRpc(client, "set_character_skill_loadout", {
  p_character_id: "char-owned", p_skill_ids: ["skill-2", "skill-1"], p_slot_indexes: [0, 1],
});
if (bulk.error) throw bulk.error;
let skills = client.getStorage("user_skills");
if (skills.find((entry) => entry.id === "skill-2").slot_index !== 0 || skills.find((entry) => entry.id === "skill-1").slot_index !== 1) {
  throw new Error("Atomic recommended skill loadout was not stored");
}
const clear = await executeMockRpc(client, "set_character_skill_loadout", { p_character_id: "char-owned", p_skill_ids: [], p_slot_indexes: [] });
if (clear.error || client.getStorage("user_skills").some((entry) => entry.user_id === userId && entry.equipped_character_id)) {
  throw new Error("Skill loadout clear failed");
}
console.log("Mock secure skill loadout verification passed.");
