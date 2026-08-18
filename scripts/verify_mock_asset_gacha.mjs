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

client.setStorage("users", [{ id: "mock-gacha-user", cash: 50_000, neon_diamonds: 0 }]);
client.setStorage("feature_operating_states", [
  { feature_key: "SPECIAL_GACHA", state: "CLOSED" },
  { feature_key: "GVG", state: "CLOSED" },
  { feature_key: "PAYMENT", state: "CLOSED" },
]);
client.setStorage("gacha_masters", [
  { id: "SKILL_SPECIAL", gacha_type: "SKILL", cost_cash: 3_000, cost_diamond: 300 },
  { id: "EQUIP_NORMAL", gacha_type: "EQUIPMENT", cost_cash: 1_000, cost_diamond: 100 },
]);
client.setStorage("gacha_items_master", [
  { gacha_id: "SKILL_SPECIAL", item_id: "skill-r", rarity: "R", weight: 1 },
  { gacha_id: "SKILL_SPECIAL", item_id: "skill-sr", rarity: "SR", weight: 1 },
  { gacha_id: "SKILL_SPECIAL", item_id: "skill-ssr", rarity: "SSR", weight: 1 },
  { gacha_id: "EQUIP_NORMAL", item_id: "equipment-n", rarity: "N", weight: 1 },
  { gacha_id: "EQUIP_NORMAL", item_id: "equipment-r", rarity: "R", weight: 1 },
  { gacha_id: "EQUIP_NORMAL", item_id: "equipment-sr", rarity: "SR", weight: 1 },
]);

const invalid = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "SKILL_SPECIAL", p_pull_count: 0, p_currency_type: "cash", p_request_id: crypto.randomUUID(),
});
if (!invalid.error) throw new Error("Invalid pull count was accepted");

const closedCash = client.getStorage("users")[0].cash;
const closed = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "SKILL_SPECIAL", p_pull_count: 1, p_currency_type: "cash", p_request_id: crypto.randomUUID(),
});
if (!closed.error || !/closed/i.test(closed.error.message)) throw new Error("Closed special gacha was accepted");
if (client.getStorage("users")[0].cash !== closedCash) throw new Error("Closed special gacha changed currency");
client.setStorage("feature_operating_states", [
  { feature_key: "SPECIAL_GACHA", state: "OPEN" },
  { feature_key: "GVG", state: "CLOSED" },
  { feature_key: "PAYMENT", state: "CLOSED" },
]);
const specialRequestId = crypto.randomUUID();
const special = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "SKILL_SPECIAL", p_pull_count: 1, p_currency_type: "cash", p_request_id: specialRequestId,
});
if (special.error || special.data.results.length !== 1) throw new Error("Paid special draw failed");
if (special.data.cash !== 47_000) throw new Error(`Canonical special price was not charged: ${special.data.cash}`);
const pity = client.getStorage("user_gacha_pity_points")[0];
if (pity?.current_points !== 1) throw new Error("Special gacha pity was not incremented");
const retry = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "SKILL_SPECIAL", p_pull_count: 1, p_currency_type: "cash", p_request_id: specialRequestId,
});
if (retry.error || JSON.stringify(retry.data) !== JSON.stringify(special.data)) throw new Error("Idempotent retry did not return the original response");
if (client.getStorage("users")[0].cash !== 47_000) throw new Error("Idempotent retry charged twice");

const invalidSpecialFree = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "SKILL_SPECIAL", p_pull_count: 10, p_currency_type: "free", p_request_id: crypto.randomUUID(),
});
if (!invalidSpecialFree.error) throw new Error("Daily free payment was accepted for special gacha");

const free = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "EQUIP_NORMAL", p_pull_count: 10, p_currency_type: "free", p_request_id: crypto.randomUUID(),
});
if (free.error || free.data.results.length !== 10) throw new Error("Free ten-pull failed");
const duplicateFree = await executeMockRpc(client, "execute_asset_gacha", {
  p_user_id: "mock-gacha-user", p_gacha_id: "EQUIP_NORMAL", p_pull_count: 10, p_currency_type: "free", p_request_id: crypto.randomUUID(),
});
if (!duplicateFree.error) throw new Error("Daily free gacha was accepted twice");

console.log("Mock asset gacha verification passed.");
