const storage = new Map();

globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

localStorage.setItem("tribe_demo_uuid", "mock-gvg-user");

const { executeMockRpc } = await import("../src/utils/mock/mockRpc.ts");
const client = {
  getStorage: (key) => storage.has(key) ? JSON.parse(storage.get(key)) : [],
  setStorage: (key, value) => storage.set(key, JSON.stringify(value)),
};

client.setStorage("gvg_attack_logs", [{ id: "attack-pending", attacker_user_id: "mock-gvg-user", battle_result: "PENDING" }]);
client.setStorage("battle_replay_sessions", [{
  id: "replay-pending", requester_user_id: "mock-gvg-user", battle_mode: "GVG", source_reference_id: "attack-pending", status: "PENDING",
}]);

const cancelled = await executeMockRpc(client, "cancel_unresolved_gvg_attack", { p_attack_id: "attack-pending" });
if (cancelled.error || client.getStorage("gvg_attack_logs").length !== 0 || client.getStorage("battle_replay_sessions").length !== 0) {
  throw new Error("Pending GvG attack and replay were not cancelled together");
}

client.setStorage("gvg_attack_logs", [{ id: "attack-resolved", attacker_user_id: "mock-gvg-user", battle_result: "PENDING" }]);
client.setStorage("battle_replay_sessions", [{
  id: "replay-resolved", requester_user_id: "mock-gvg-user", battle_mode: "GVG", source_reference_id: "attack-resolved", status: "RESOLVED",
}]);

const protectedReplay = await executeMockRpc(client, "cancel_unresolved_gvg_attack", { p_attack_id: "attack-resolved" });
if (!protectedReplay.error || client.getStorage("gvg_attack_logs").length !== 1) {
  throw new Error("Resolved GvG replay was incorrectly cancelled");
}

console.log("Mock GvG cancellation verification passed.");
