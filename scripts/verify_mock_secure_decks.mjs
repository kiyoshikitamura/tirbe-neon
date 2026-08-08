const storage = new Map();

globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const userId = "mock-secure-deck-user";
localStorage.setItem("tribe_demo_uuid", userId);

const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};

client.setStorage("user_characters", [
  { id: "owned-instance-1", user_id: userId, character_id: "character-master-1" },
  { id: "owned-instance-2", user_id: userId, character_id: "character-master-2" },
]);
client.setStorage("guild_members", [{ user_id: userId, guild_id: "guild-1" }]);

const pvpSave = await executeMockRpc(client, "save_pvp_defense_deck", {
  p_character_ids: ["character-master-1", "owned-instance-2"],
  p_tactic: "BALANCED",
});
const pvpDeck = client.getStorage("pvp_defense_decks")[0];
if (pvpSave.error || pvpDeck.character_1_id !== "owned-instance-1" || pvpDeck.character_2_id !== "owned-instance-2") {
  throw new Error("PvP defense RPC did not canonicalize owned characters");
}

const rejected = await executeMockRpc(client, "save_pvp_defense_deck", {
  p_character_ids: ["not-owned"],
  p_tactic: "BALANCED",
});
if (rejected.error?.code !== "23503") throw new Error("Unowned PvP character was not rejected");

const gvgSave = await executeMockRpc(client, "save_gvg_defense_deck", {
  p_character_ids: ["owned-instance-2"],
});
const gvgDeck = client.getStorage("gvg_defense_decks")[0];
if (gvgSave.error || gvgDeck.guild_id !== "guild-1" || gvgDeck.character_1_id !== "owned-instance-2") {
  throw new Error("GvG defense RPC did not validate membership and ownership");
}

console.log("Mock secure deck verification passed.");
