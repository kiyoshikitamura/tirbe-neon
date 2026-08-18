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

client.setStorage("character_awakening_master", [
  { awakening_level: 1, required_cash: 5000 },
  { awakening_level: 2, required_cash: 15000 },
]);
client.setStorage("users", [{ id: userId, cash: 20000 }, { id: "other", cash: 999999 }]);
client.setStorage("user_items", [{ user_id: userId, item_id: "LAW_OF_STRIFE", quantity: 2 }]);
client.setStorage("user_characters", [
  { id: "owned-character", user_id: userId, character_id: "char_reiji", awakening_level: 0 },
  { id: "other-character", user_id: "other", character_id: "char_other", awakening_level: 0 },
]);

const first = await executeMockRpc(client, "awaken_character", { p_character_id: "owned-character" });
if (first.error || first.data.cash_spent !== 5000 || first.data.remaining_cash !== 15000) throw new Error("Master-authoritative awakening cost was not charged");
if (client.getStorage("user_items")[0].quantity !== 1 || client.getStorage("user_characters")[0].awakening_level !== 1) throw new Error("Awakening mutation was not atomic");

const other = await executeMockRpc(client, "awaken_character", { p_character_id: "other-character" });
if (other.error?.code !== "P0002" || client.getStorage("users")[1].cash !== 999999) throw new Error("Cross-user awakening was not rejected");

const ownerAfterFirst = client.getStorage("users");
ownerAfterFirst[0].cash = 14999;
client.setStorage("users", ownerAfterFirst);
const insufficient = await executeMockRpc(client, "awaken_character", { p_character_id: "owned-character" });
if (insufficient.error?.code !== "23514" || client.getStorage("user_characters")[0].awakening_level !== 1) throw new Error("Insufficient cash did not roll back awakening");

console.log("Mock secure awakening verification passed.");
