import { strict as assert } from "node:assert";
import { MockSupabaseClient } from "../src/utils/mock/MockSupabaseClient.ts";
import { canonicalMissionUiStatus } from "../src/domain/gameplay/canonical/missions.ts";
import { jstCycleDate } from "../src/domain/gameplay/canonical/mission_runtime.ts";

const storage = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

const userId = "00000000-0000-4000-8000-000000000777";
localStorage.setItem("tribe_demo_uuid", userId);
const client = new MockSupabaseClient();

assert.equal(client.getStorage("missions").length, 37);
const sync = await client.rpc("sync_current_missions", {});
assert.equal(sync.error, null);
assert.equal(sync.data.cycle_date, jstCycleDate());
let rows = client.getStorage("user_missions");
assert.equal(rows.length, 21, "4 DAILY + 17 root NORMAL Missions must be projected.");
assert.equal(rows.find((row) => row.mission_id === "ob_daily_login_01").status, "CLEAR");

await client.rpc("evaluate_mission_progress", { p_user_id: userId, p_trigger_type: "CHAR_LEVEL_UP", p_progress_increment: 1 });
rows = client.getStorage("user_missions");
assert.equal(rows.find((row) => row.mission_id === "ob_daily_char_level_01").status, "CLEAR");
assert.equal(rows.find((row) => row.mission_id === "ob_normal_char_level_01").current_progress, 1);

const claimAll = await client.rpc("claim_all_mission_rewards", { p_mission_ids: ["ob_daily_char_level_01", "ob_daily_char_level_01"] });
assert.equal(claimAll.data.claimed_count, 1);
assert.equal(client.getStorage("presents").find((present) => present.id.includes("ob_daily_char_level_01")).quantity, 3);

const claim = await client.rpc("claim_mission_reward", { p_mission_id: "ob_daily_login_01" });
assert.deepEqual(claim.data, { status: "success", claimed: true, item_id: "CHAR_EXP_S", quantity: 5 });
assert.equal(client.getStorage("presents").find((present) => present.id.includes("ob_daily_login_01")).quantity, 5);

assert.equal(canonicalMissionUiStatus(undefined, false), "LOCKED");
assert.equal(canonicalMissionUiStatus("PROGRESS", true), "IN_PROGRESS");
assert.equal(canonicalMissionUiStatus("CLEAR", true), "CLEAR");

client.setStorage("user_funnel_milestones", [{ user_id: userId, milestone: "first_growth", occurrence_count: 1 }]);
rows = client.getStorage("user_missions");
const firstGacha = rows.find((row) => row.mission_id === "ob_funnel_gacha_01");
firstGacha.current_progress = 1;
firstGacha.status = "CLEAR";
client.setStorage("user_missions", rows);
await client.rpc("claim_mission_reward", { p_mission_id: "ob_funnel_gacha_01" });
rows = client.getStorage("user_missions");
assert.equal(rows.find((row) => row.mission_id === "ob_funnel_growth_01").status, "CLEAR", "Pre-recorded milestone must clear immediately after prerequisite claim.");

await client.rpc("evaluate_mission_progress", { p_user_id: userId, p_trigger_type: "USER_INVITE", p_progress_increment: 10 });
rows = client.getStorage("user_missions");
assert.equal(rows.filter((row) => row.mission_id.startsWith("ob_invite_") && row.status === "CLEAR").length, 10);

client.setStorage("users", [{ id: userId, cash: 100000 }]);
client.setStorage("user_equipments", [{ id: "owned_equipment", user_id: userId, equipment_id: "WEAPON_001", level: 50, plus_val: 0, equipped_character_id: null }]);
client.setStorage("user_items", [{ id: "lb_part", user_id: userId, item_id: "EQUIP_LB_PART", quantity: 2 }]);
client.setStorage("equipment_limit_break_master", [{ plus_val: 1, cost_cash: 1000, required_hammer: 1 }]);
const equipmentLb = await client.rpc("limit_break_equipment", { p_equipment_id: "owned_equipment", p_use_wildcard: true });
assert.equal(equipmentLb.error, null);
rows = client.getStorage("user_missions");
assert.equal(rows.find((row) => row.mission_id === "ob_normal_gear_lb_01").status, "CLEAR");

const staleDaily = rows.find((row) => row.mission_id === "ob_daily_patrol_01");
staleDaily.status = "CLEAR";
staleDaily.current_progress = 1;
staleDaily.cycle_date = "2000-01-01";
client.setStorage("user_missions", rows);
const reset = await client.rpc("sync_current_missions", {});
assert.equal(reset.data.rescued_count, 1);
rows = client.getStorage("user_missions");
assert.equal(rows.find((row) => row.mission_id === "ob_daily_patrol_01").status, "PROGRESS");
assert.equal(client.getStorage("presents").some((present) => present.id.includes("ob_daily_patrol_01") && present.item_id === "CASH" && present.quantity === 1000), true);
assert.equal(rows.some((row) => row.status === "IN_PROGRESS" || row.status === "COMPLETED"), false);

const masters = client.getStorage("missions");
assert.equal(masters.find((row) => row.id === "ob_normal_guild_join_01").reward_item_id, "NORMAL_GACHA_TICKET_CHARACTER");
assert.equal(masters.filter((row) => ["NORMAL_CHARACTER_GACHA_TICKET", "NORMAL_GACHA_TICKET", "EQUIP_LB_HAMMER", "SKILL_LB_BOOK"].includes(row.reward_item_id)).length, 0);

console.log("Mock canonical Mission runtime verification PASS (37 Master, JST sync/rescue, progress, claim/claim-all, Equipment LB, Invite, funnel prerequisite, exact rewards/state).");
