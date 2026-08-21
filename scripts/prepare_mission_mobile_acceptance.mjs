import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = JSON.parse(readFileSync(resolve(root, "src/domain/gameplay/canonical/data/missions_20260821.json"), "utf8"));
const missions = source.missions;
if (missions.length !== 37) throw new Error("Mission acceptance fixture requires the frozen 37-Mission Master.");

const selectedStates = {
  ob_daily_login_01: [1, "CLAIMED"],
  ob_daily_patrol_01: [1, "CLEAR"],
  ob_daily_char_level_01: [1, "CLEAR"],
  ob_daily_gear_level_01: [0, "PROGRESS"],
  ob_normal_patrol_01: [1, "CLAIMED"],
  ob_normal_patrol_02: [7, "PROGRESS"],
  ob_normal_char_level_01: [3, "PROGRESS"],
  ob_normal_gear_level_01: [5, "CLEAR"],
  ob_normal_gear_lb_01: [1, "CLEAR"],
  ob_normal_skill_lb_01: [1, "CLEAR"],
  ob_normal_guild_join_01: [0, "PROGRESS"],
  ob_funnel_gacha_01: [1, "CLEAR"],
  ob_invite_01: [1, "CLAIMED"],
  ob_invite_02: [2, "CLEAR"],
  ob_invite_03: [2, "PROGRESS"],
};

for (const [missionId, [progress, status]] of Object.entries(selectedStates)) {
  const mission = missions.find((entry) => entry.id === missionId);
  if (!mission || progress > mission.targetValue || !["PROGRESS", "CLEAR", "CLAIMED"].includes(status)) {
    throw new Error(`Invalid acceptance fixture state: ${missionId}`);
  }
}

const outputDirectory = join(tmpdir(), "tribe-neon-mission-acceptance");
mkdirSync(outputDirectory, { recursive: true });
const applyPath = join(outputDirectory, "apply-mission-acceptance-fixture.js");
const restorePath = join(outputDirectory, "restore-mission-acceptance-fixture.js");
const fixtureLiteral = JSON.stringify(selectedStates);

writeFileSync(applyPath, `(function () {
  const userId = localStorage.getItem("tribe_demo_uuid");
  if (!userId) throw new Error("Create or sign in to a Local Mock player before applying the Mission fixture.");
  const keys = ["mock_db_user_missions", "mock_db_user_funnel_milestones", "mock_db_presents"];
  const backup = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  localStorage.setItem("mission_mobile_acceptance_backup", JSON.stringify(backup));
  const cycleDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const states = ${fixtureLiteral};
  const rows = Object.entries(states).map(([missionId, state]) => ({
    id: "acceptance_" + missionId,
    user_id: userId,
    mission_id: missionId,
    current_progress: state[0],
    progress_val: state[0],
    status: state[1],
    cycle_date: missionId.startsWith("ob_daily_") ? cycleDate : null,
    claimed_at: state[1] === "CLAIMED" ? new Date().toISOString() : null,
  }));
  localStorage.setItem("mock_db_user_missions", JSON.stringify(rows));
  localStorage.setItem("mock_db_user_funnel_milestones", JSON.stringify([{
    user_id: userId,
    milestone: "first_growth",
    occurrence_count: 1,
    first_occurred_at: new Date().toISOString(),
    last_occurred_at: new Date().toISOString(),
    metadata: { source: "mission_mobile_human_acceptance" },
  }]));
  localStorage.setItem("mock_db_presents", "[]");
  location.reload();
})();
`);

writeFileSync(restorePath, `(function () {
  const backup = JSON.parse(localStorage.getItem("mission_mobile_acceptance_backup") || "null");
  if (!backup) throw new Error("Mission acceptance backup was not found.");
  for (const [key, value] of Object.entries(backup)) value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
  localStorage.removeItem("mission_mobile_acceptance_backup");
  location.reload();
})();
`);

console.log(JSON.stringify({
  status: "MISSION MOBILE HUMAN ACCEPTANCE READY",
  missionCount: missions.length,
  applyScript: applyPath,
  restoreScript: restorePath,
  funnelScenario: "ob_funnel_gacha_01 CLEAR + first_growth milestone recorded; growth remains LOCKED until Gacha Mission claim, then becomes CLEAR",
}, null, 2));
