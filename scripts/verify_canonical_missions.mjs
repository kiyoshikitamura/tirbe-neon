import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = JSON.parse(readFileSync(resolve(root, "src/domain/gameplay/canonical/data/missions_20260821.json"), "utf8"));
const missions = source.missions;
const validTriggers = new Set([
  "DAILY_LOGIN", "PATROL_CLEAR", "CHAR_LEVEL_UP", "GEAR_UPGRADE", "GEAR_LIMIT_BREAK",
  "SKILL_LIMIT_BREAK", "GUILD_JOIN", "USER_INVITE", "FUNNEL_FIRST_GACHA",
  "FUNNEL_FIRST_GROWTH", "FUNNEL_FIRST_BATTLE", "FUNNEL_FIRST_PVP", "FUNNEL_FIRST_RAID",
  "FUNNEL_GUILD_VIEW", "FUNNEL_GUILD_JOIN", "FUNNEL_GUILD_ACTIVATION", "FUNNEL_SECOND_RAID",
]);
const validRewards = new Set([
  "CASH", "DIAMOND", "CHAR_EXP_S", "CHAR_EXP_M", "CHAR_EXP_L", "EQUIP_EXP_S",
  "EQUIP_EXP_M", "EQUIP_EXP_L", "EQUIP_LB_PART", "SKILL_MANUAL",
  "NORMAL_GACHA_TICKET_CHARACTER",
]);
const legacyRewards = new Set([
  "NORMAL_CHARACTER_GACHA_TICKET", "NORMAL_GACHA_TICKET", "EQUIP_LB_HAMMER", "SKILL_LB_BOOK",
]);
const funnelChain = [
  "ob_funnel_gacha_01", "ob_funnel_growth_01", "ob_funnel_battle_01", "ob_funnel_pvp_01",
  "ob_funnel_raid_01", "ob_funnel_guild_view_01", "ob_funnel_guild_join_01",
  "ob_funnel_guild_activation_01", "ob_funnel_second_raid_01",
];

assert.equal(source.version, "2026-08-21");
assert.equal(source.status, "PRODUCTION_FROZEN");
assert.equal(missions.length, 37);
assert.equal(missions.filter((mission) => mission.category === "DAILY").length, 4);
assert.equal(missions.filter((mission) => mission.category === "NORMAL").length, 33);
assert.equal(missions.filter((mission) => mission.category === "WEEKLY").length, 0);
assert.equal(new Set(missions.map((mission) => mission.id)).size, 37);
assert.equal(missions.filter((mission) => mission.isEnabled).length, 37);
assert.equal(missions.filter((mission) => mission.isProvisional).length, 0);

const ids = new Set(missions.map((mission) => mission.id));
for (const mission of missions) {
  assert.ok(validTriggers.has(mission.triggerType), `Invalid trigger: ${mission.id}`);
  assert.ok(validRewards.has(mission.rewardItemId), `Invalid reward: ${mission.id}`);
  assert.ok(!legacyRewards.has(mission.rewardItemId), `Legacy reward: ${mission.id}`);
  assert.ok(Number.isInteger(mission.targetValue) && mission.targetValue > 0, `Invalid target: ${mission.id}`);
  assert.ok(Number.isInteger(mission.rewardQuantity) && mission.rewardQuantity > 0, `Invalid reward quantity: ${mission.id}`);
  assert.ok(Number.isInteger(mission.displayOrder) && mission.displayOrder > 0, `Invalid order: ${mission.id}`);
  if (mission.prerequisiteMissionId) assert.ok(ids.has(mission.prerequisiteMissionId), `Invalid prerequisite: ${mission.id}`);
  assert.deepEqual(mission.conditionParams?.cta_tab ?? null, mission.cta?.tab ?? null, `CTA tab mismatch: ${mission.id}`);
  assert.deepEqual(mission.conditionParams?.cta_action ?? null, mission.cta?.action ?? null, `CTA action mismatch: ${mission.id}`);
}

for (let index = 0; index < funnelChain.length; index += 1) {
  const mission = missions.find((entry) => entry.id === funnelChain[index]);
  assert.ok(mission, `Missing funnel mission: ${funnelChain[index]}`);
  assert.equal(mission.prerequisiteMissionId, index === 0 ? null : funnelChain[index - 1]);
}

const invites = missions.filter((mission) => mission.id.startsWith("ob_invite_"));
assert.equal(invites.length, 10);
assert.equal(invites.reduce((sum, mission) => sum + mission.rewardQuantity, 0), 1000);
assert.ok(invites.every((mission) => mission.rewardItemId === "DIAMOND" && mission.cta === null));
assert.equal(missions.filter((mission) => legacyRewards.has(mission.rewardItemId)).length, 0);
assert.equal(missions.find((mission) => mission.id === "ob_normal_gear_lb_02")?.rewardItemId, "EQUIP_LB_PART");
assert.equal(missions.find((mission) => mission.id === "ob_normal_skill_lb_02")?.rewardItemId, "SKILL_MANUAL");
assert.equal(missions.find((mission) => mission.id === "ob_normal_guild_join_01")?.rewardItemId, "NORMAL_GACHA_TICKET_CHARACTER");

console.log("Canonical Mission Production Master verification passed (37 missions).");
