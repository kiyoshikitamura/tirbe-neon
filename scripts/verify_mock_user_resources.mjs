const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
const userId = "mock-user-resource";
localStorage.setItem("tribe_demo_uuid", userId);
const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};
const now = Date.now();
client.setStorage("users", [{
  id: userId, level: 1, xp: 0, vitality: 99, pvp_points: 4, raid_points: 4,
  vitality_last_recovered_at: new Date(now - 360_000).toISOString(),
  pvp_points_last_recovered_at: new Date(now - 7_200_000).toISOString(),
  raid_points_last_recovered_at: new Date(now - 7_200_000).toISOString(),
  raid_free_entry_consumed: false,
}]);
client.setStorage("user_items", [
  { user_id: userId, item_id: "ENERGY_DRINK", quantity: 2 },
  { user_id: userId, item_id: "PVP_POINT_TICKET", quantity: 2 },
  { user_id: userId, item_id: "RAID_POINT_TICKET", quantity: 2 },
]);

const sync = await executeMockRpc(client, "sync_and_recover_vitality_and_pvp_points", { p_user_id: userId });
if (sync.error || sync.data.out_vitality !== 100 || sync.data.out_pvp_points !== 5 || sync.data.out_raid_points !== 5) throw new Error("Mock natural recovery parity failed");
const xp = await executeMockRpc(client, "add_user_xp", { p_user_id: userId, p_xp_amount: 1750 });
if (xp.error || xp.data.level !== 8 || xp.data.xp !== 0) throw new Error("Mock Lv1-8 curve parity failed");
let updatedUsers = client.getStorage("users");
updatedUsers[0].level = 99;
updatedUsers[0].xp = 0;
client.setStorage("users", updatedUsers);
const cap = await executeMockRpc(client, "add_user_xp", { p_user_id: userId, p_xp_amount: 216700 });
if (cap.error || cap.data.level !== 100 || cap.data.xp !== 0) throw new Error("Mock Lv99-100 parity failed");
const extra = await executeMockRpc(client, "add_user_xp", { p_user_id: userId, p_xp_amount: 999999 });
if (extra.error || extra.data.level !== 100 || extra.data.xp !== 0) throw new Error("Mock Lv100 cap failed");
updatedUsers = client.getStorage("users");
updatedUsers[0].pvp_points = 4;
updatedUsers[0].raid_points = 4;
updatedUsers[0].pvp_points_last_recovered_at = new Date().toISOString();
updatedUsers[0].raid_points_last_recovered_at = new Date().toISOString();
client.setStorage("users", updatedUsers);
for (const itemId of ["PVP_POINT_TICKET", "RAID_POINT_TICKET"]) {
  const used = await executeMockRpc(client, "use_action_resource_ticket", { p_item_id: itemId });
  if (used.error || used.data.points !== 5 || used.data.quantity !== 1) throw new Error(`Mock ticket +1 failed: ${itemId}`);
  const rejectedAtMax = await executeMockRpc(client, "use_action_resource_ticket", { p_item_id: itemId });
  const held = client.getStorage("user_items").find((item) => item.item_id === itemId);
  if (!rejectedAtMax.error || held.quantity !== 1) throw new Error(`Mock ticket max rejection consumed inventory: ${itemId}`);
}
const drink = await executeMockRpc(client, "use_energy_drink", {});
if (drink.error || drink.data.vitality !== 150 || drink.data.quantity !== 1) throw new Error("Mock Energy Drink +50 failed");
const users = client.getStorage("users");
users[0].vitality = 451;
client.setStorage("users", users);
const beforeQuantity = client.getStorage("user_items")[0].quantity;
const rejected = await executeMockRpc(client, "use_energy_drink", {});
if (!rejected.error || client.getStorage("user_items")[0].quantity !== beforeQuantity) throw new Error("Mock over-cap rejection consumed an item");
const raid = await executeMockRpc(client, "get_current_raid_attempt_state", {});
if (raid.error || raid.data.raidPoints !== 5 || raid.data.firstEntryFree !== true) throw new Error("Mock Raid Point state failed");
console.log("Mock User Level / Action Resource runtime: PASS");
