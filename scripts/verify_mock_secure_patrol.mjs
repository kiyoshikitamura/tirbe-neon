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

client.setStorage("users", [{ id: userId, vitality: 20, cash: 5000, neon_diamonds: 200, level: 1, xp: 0 }]);
client.setStorage("user_characters", [{ id: "owned-1", user_id: userId, character_id: "character-1" }]);
client.setStorage("quests", [{ id: "quest-1", name: "Mock patrol", duration_seconds: 120, cost_vitality: 7, cash_reward: 250, exp_reward: 40, item_rewards: [] }]);

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

const instant = await executeMockRpc(client, "complete_patrol_instantly", {
  p_user_id: userId,
  p_patrol_id: patrol.id,
  p_use_currency: "CASH",
});
const instantPatrol = client.getStorage("user_patrols")[0];
const chargedUser = client.getStorage("users")[0];
if (instant.error || instantPatrol.status !== "CLAIMABLE" || chargedUser.cash !== 4000) {
  throw new Error("Secure patrol instant completion did not atomically charge and complete the patrol");
}

const repeatedInstant = await executeMockRpc(client, "complete_patrol_instantly", {
  p_user_id: userId,
  p_patrol_id: patrol.id,
  p_use_currency: "CASH",
});
if (!repeatedInstant.error || client.getStorage("users")[0].cash !== 4000) {
  throw new Error("Repeated patrol instant completion was not rejected before charging");
}

const claimed = await executeMockRpc(client, "claim_patrol_rewards", { p_patrol_id: patrol.id });
const claimedPatrol = client.getStorage("user_patrols")[0];
const rewardPresent = client.getStorage("presents")[0];
const rewardedUser = client.getStorage("users")[0];
if (claimed.error || claimedPatrol.status !== "COMPLETED" || rewardPresent.quantity !== 250 || rewardedUser.xp !== 40) {
  throw new Error("Patrol reward claim did not use authoritative quest rewards");
}

const repeatedClaim = await executeMockRpc(client, "claim_patrol_rewards", { p_patrol_id: patrol.id });
if (!repeatedClaim.error || client.getStorage("presents").length !== 1 || client.getStorage("users")[0].xp !== 40) {
  throw new Error("Repeated patrol reward claim was not rejected before granting rewards");
}

console.log("Mock secure patrol verification passed.");
