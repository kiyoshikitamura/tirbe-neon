const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const userId = "mock-quest-production-user";
localStorage.setItem("tribe_demo_uuid", userId);
const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};
client.setStorage("users", [{ id: userId, vitality: 100, level: 1, xp: 0 }]);
client.setStorage("quests", [{ id: "q_shinjuku_1", name: "歌舞伎町 夜間見回り", duration_seconds: 60, cost_vitality: 5, cash_reward: 1, exp_reward: 1 }]);
client.setStorage("user_missions", []);
client.setStorage("user_characters", [{ id: "owned-reiji", user_id: userId, character_id: "char_reiji_01", level: 5, awakening_level: 0 }]);
client.setStorage("user_patrols", [
  { id: "first", user_id: userId, course_id: "q_shinjuku_1", status: "CLAIMABLE", expires_at: new Date(0).toISOString(), has_battle_event: false },
  { id: "battle", user_id: userId, course_id: "q_shinjuku_1", character_id: "char_reiji_01", status: "CLAIMABLE", expires_at: new Date(0).toISOString(), has_battle_event: true, battle_resolved: false },
]);

const originalRandom = Math.random;
Math.random = () => 0;
try {
  const replay = await executeMockRpc(client, "create_patrol_battle_replay", { p_patrol_id: "battle", p_tactic_id: "ATTACK_PRIORITY" });
  if (replay.error || replay.data.enemy_snapshot.length !== 5) throw new Error("Canonical Quest NPC party snapshot mismatch");
  for (const enemy of replay.data.enemy_snapshot) {
    if (enemy.level !== 5 || enemy.awakeningLevel !== 0 || enemy.equipment.length !== 0 || enemy.equippedSkillRefs.length !== 0) throw new Error("Canonical Quest NPC progression mismatch");
    if (enemy.skills[0]?.effects?.[0] !== "DAMAGE 80% ATK") throw new Error("Canonical Quest normal attack is not 80% ATK");
  }

  const first = await executeMockRpc(client, "claim_patrol_rewards", { p_patrol_id: "first" });
  if (first.error || first.data.xp !== 200 || first.data.cash !== 300 || first.data.first_clear !== true) throw new Error("Canonical first-clear reward mismatch");
  const firstItems = first.data.items.map((item) => `${item.item_id}:${item.quantity}`);
  for (const expected of ["CHAR_EXP_S:5", "CHAR_EXP_S:3", "EQUIP_EXP_S:6", "EQUIP_EXP_S:4", "CHAR_EXP_M:1", "EQUIP_EXP_M:1"]) {
    if (!firstItems.includes(expected)) throw new Error(`Missing first-clear item ${expected}`);
  }

  const patrols = client.getStorage("user_patrols");
  patrols.push({ id: "repeat", user_id: userId, course_id: "q_shinjuku_1", status: "CLAIMABLE", expires_at: new Date(0).toISOString(), has_battle_event: false });
  client.setStorage("user_patrols", patrols);
  const repeat = await executeMockRpc(client, "claim_patrol_rewards", { p_patrol_id: "repeat" });
  if (repeat.error || repeat.data.xp !== 100 || repeat.data.first_clear !== false) throw new Error("Repeat clear incorrectly reissued first-clear reward");
  if (client.getStorage("user_quest_first_clears").length !== 1) throw new Error("First-clear ledger is not exactly-once");
} finally {
  Math.random = originalRandom;
}
console.log("Mock Canonical Quest reward and first-clear verification passed.");
