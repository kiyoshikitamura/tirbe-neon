const storage = new Map();

globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

localStorage.setItem("tribe_demo_uuid", "mock-gacha-user");

const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};

client.setStorage("users", [{ id: "mock-gacha-user", cash: 2_000, neon_diamonds: 0 }]);
client.setStorage("gacha_masters", [
  { id: "SKILL_SPECIAL", gacha_type: "SKILL", cost_cash: 100, cost_diamond: 10 },
  { id: "EQUIP_NORMAL", gacha_type: "EQUIPMENT", cost_cash: 100, cost_diamond: 10 },
]);
client.setStorage("gacha_items_master", [
  { gacha_id: "SKILL_SPECIAL", item_id: "skill-1", weight: 1 },
  { gacha_id: "EQUIP_NORMAL", item_id: "equipment-1", weight: 1 },
]);

const invalid = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "SKILL_SPECIAL", p_pull_count: 0, p_currency_type: "cash",
});
if (!invalid.error) throw new Error("Invalid pull count was accepted");

const special = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "SKILL_SPECIAL", p_pull_count: 1, p_currency_type: "cash",
});
if (special.error || special.data.results.length !== 1) throw new Error("Paid special draw failed");
const pity = client.getStorage("user_gacha_pity_points")[0];
if (pity?.current_points !== 1) throw new Error("Special gacha pity was not incremented");

const free = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "EQUIP_NORMAL", p_pull_count: 10, p_currency_type: "free",
});
if (free.error || free.data.results.length !== 10) throw new Error("Free ten-pull failed");
const duplicateFree = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "EQUIP_NORMAL", p_pull_count: 10, p_currency_type: "free",
});
if (!duplicateFree.error) throw new Error("Daily free gacha was accepted twice");

console.log("Mock asset gacha verification passed.");
