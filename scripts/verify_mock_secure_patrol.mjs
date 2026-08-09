const storage = new Map();

globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const userId = "mock-secure-patrol-user";
localStorage.setItem("tribe_demo_uuid", userId);

const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};

client.setStorage("users", [{ id: userId, vitality: 20 }]);
client.setStorage("user_characters", [{ id: "owned-1", user_id: userId, character_id: "character-1" }]);
client.setStorage("quests", [{ id: "quest-1", duration_seconds: 120, cost_vitality: 7 }]);

const unowned = await executeMockRpc(client, "start_patrol", { p_course_id: "quest-1", p_character_id: "not-owned" });
if (unowned.error?.code !== "23503") throw new Error("Unowned patrol character was not rejected");

const started = await executeMockRpc(client, "start_patrol", { p_course_id: "quest-1", p_character_id: "owned-1" });
const patrol = client.getStorage("user_patrols")[0];
const user = client.getStorage("users")[0];
if (started.error || !patrol || patrol.character_id !== "character-1" || started.data.duration_seconds !== 120 || user.vitality !== 13) {
  throw new Error("Secure patrol start did not use authoritative quest and ownership data");
}

const duplicate = await executeMockRpc(client, "start_patrol", { p_course_id: "quest-1", p_character_id: "owned-1" });
if (duplicate.error?.code !== "23505") throw new Error("Duplicate active patrol was not rejected");

console.log("Mock secure patrol verification passed.");
