import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { executeMockRpc } from "../src/utils/mock/mockRpc.ts";

const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const userId = "26000000-0000-4000-8000-000000000011";
localStorage.setItem("tribe_demo_uuid", userId);
const tables = new Map([["users", [{ id: userId, current_base_id: "shinjuku" }]]]);
const client = {
  getStorage: (name) => tables.get(name) ?? [],
  setStorage: (name, value) => tables.set(name, value),
};

let result = await executeMockRpc(client, "move_current_user_base", { p_base_id: "yokohama" });
assert.equal(result.error, null);
assert.equal(result.data.previous_base_id, "shinjuku");
assert.equal(result.data.current_base_id, "yokohama");
assert.equal(client.getStorage("users")[0].current_base_id, "yokohama");

result = await executeMockRpc(client, "move_current_user_base", { p_base_id: "osaka" });
assert.equal(result.error?.code, "22023");
assert.equal(client.getStorage("users")[0].current_base_id, "yokohama");

const [migration, context, patrolHook, presentation, mockRpc, dbTest] = await Promise.all([
  readFile(new URL("../supabase/migrations/20260902000226_location_movement_authority.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/app/context/GameContext.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/context/hooks/usePatrol.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/components/quest/QuestPresentationV2.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/utils/mock/mockRpc.ts", import.meta.url), "utf8"),
  readFile(new URL("../tests/db/location-movement-authority.sql", import.meta.url), "utf8"),
]);

for (const contract of ["security definer", "auth.uid()", "for update", "update public.users", "Invalid base id"]) {
  assert(migration.toLowerCase().includes(contract.toLowerCase()), `location migration contract missing: ${contract}`);
}
assert(!/from\("users"\)\s*\.update\(\{\s*current_base_id/.test(context), "client must not update current_base_id directly");
assert(context.includes('supabase.rpc("move_current_user_base"'));
assert(dbTest.includes("another user location was changed"));

// TN-11B contracts are asserted after its independent commit is applied.
if (patrolHook.includes("encounterSnapshot")) {
  assert(context.includes("encounterSnapshot: p.encounter_snapshot"));
  assert(presentation.includes("patrol.encounterSnapshot?.members"));
  assert(mockRpc.includes("enemy_members: []"), "mock progression must match Production dynamic encounter projection");
}

console.log("TN-11 location and Quest synchronization verification: PASS");
