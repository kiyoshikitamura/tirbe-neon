const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
};
const userId = "awakening-owner";
localStorage.setItem("tribe_demo_uuid", userId);
const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};

client.setStorage("users", [{ id: userId, cash: 20000 }, { id: "other", cash: 999999 }]);
client.setStorage("user_items", [{ user_id: userId, item_id: "AWAKENING_BOOK", quantity: 2 }]);
client.setStorage("user_characters", [
  { id: "owned-character", user_id: userId, character_id: "char_reiji", awakening_level: 2, awakening_progress: 0 },
  { id: "other-character", user_id: "other", character_id: "char_other", awakening_level: 0, awakening_progress: 0 },
]);

const first = await executeMockRpc(client, "awaken_character", { p_character_id: "owned-character" });
if (first.error || first.data.outcome !== "awakening_progress" || first.data.awakening_level !== 2 || first.data.awakening_progress !== 1 || first.data.awakening_required !== 2) {
  throw new Error(`First book copy-equivalent mismatch: ${JSON.stringify(first)}`);
}
if (client.getStorage("user_items")[0].quantity !== 1 || client.getStorage("users")[0].cash !== 20000) throw new Error("Book use charged CASH or failed to consume one book.");

const second = await executeMockRpc(client, "awaken_character", { p_character_id: "owned-character" });
if (second.error || second.data.outcome !== "awakening" || second.data.awakening_level !== 3 || second.data.awakening_progress !== 0 || second.data.awakening_required !== 3) {
  throw new Error(`Second book did not advance awakening: ${JSON.stringify(second)}`);
}
if (client.getStorage("user_items")[0].quantity !== 0 || client.getStorage("users")[0].cash !== 20000) throw new Error("Awakening Book mutation was not cash-free and atomic.");

const other = await executeMockRpc(client, "awaken_character", { p_character_id: "other-character" });
if (other.error?.code !== "P0002" || client.getStorage("users")[1].cash !== 999999) throw new Error("Cross-user awakening was not rejected.");

const insufficient = await executeMockRpc(client, "awaken_character", { p_character_id: "owned-character" });
if (insufficient.error?.code !== "23514" || client.getStorage("user_characters")[0].awakening_level !== 3) throw new Error("Insufficient Awakening Book did not roll back awakening.");

client.setStorage("gacha_masters", [{ id: "CHAR_NORMAL", gacha_type: "CHARACTER", cost_cash: 1, cost_diamond: 1 }]);
client.setStorage("gacha_items_master", [{ gacha_id: "CHAR_NORMAL", item_id: "char_reiji", rarity: "N" }]);
const originalRandom = Math.random;
Math.random = () => 0;
const duplicateCharacterRows = client.getStorage("user_characters");
duplicateCharacterRows[0].awakening_level = 2;
duplicateCharacterRows[0].awakening_progress = 0;
client.setStorage("user_characters", duplicateCharacterRows);
const duplicateOne = await executeMockRpc(client, "execute_character_gacha", { p_user_id: userId, p_gacha_id: "CHAR_NORMAL", p_pull_count: 1, p_currency_type: "cash", p_request_id: "request-one" });
if (duplicateOne.error || duplicateOne.data.results[0].outcome !== "awakening_progress" || duplicateOne.data.results[0].awakening_progress !== 1) throw new Error(`Mock duplicate did not add target-specific progress: ${JSON.stringify(duplicateOne)}`);
const duplicateTwo = await executeMockRpc(client, "execute_character_gacha", { p_user_id: userId, p_gacha_id: "CHAR_NORMAL", p_pull_count: 1, p_currency_type: "cash", p_request_id: "request-two" });
if (duplicateTwo.error || duplicateTwo.data.results[0].outcome !== "awakening" || duplicateTwo.data.results[0].awakening_level !== 3) throw new Error(`Mock duplicate threshold did not advance Awakening: ${JSON.stringify(duplicateTwo)}`);

const maxRows = client.getStorage("user_characters");
maxRows[0].awakening_level = 5;
maxRows[0].awakening_progress = 0;
client.setStorage("user_characters", maxRows);
const beforeOverflow = Number(client.getStorage("user_items").find((item) => item.item_id === "AWAKENING_BOOK")?.quantity || 0);
const overflow = await executeMockRpc(client, "execute_character_gacha", { p_user_id: userId, p_gacha_id: "CHAR_NORMAL", p_pull_count: 1, p_currency_type: "cash", p_request_id: "request-overflow" });
if (overflow.error || overflow.data.results[0].outcome !== "converted" || overflow.data.results[0].converted_quantity !== 1) throw new Error(`Mock max duplicate conversion mismatch: ${JSON.stringify(overflow)}`);
const retry = await executeMockRpc(client, "execute_character_gacha", { p_user_id: userId, p_gacha_id: "CHAR_NORMAL", p_pull_count: 1, p_currency_type: "cash", p_request_id: "request-overflow" });
const afterOverflow = Number(client.getStorage("user_items").find((item) => item.item_id === "AWAKENING_BOOK")?.quantity || 0);
if (retry.error || afterOverflow !== beforeOverflow + 1) throw new Error("Mock max duplicate retry was not idempotent.");
Math.random = originalRandom;

console.log("Mock secure copy-equivalent awakening verification passed.");
