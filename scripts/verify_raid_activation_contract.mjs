import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const raid = read("src/app/components/RaidTab.tsx");
const raidCss = read("src/app/components/RaidTab.css");
const battle = read("src/hooks/useBattle.ts");
const battleView = read("src/app/components/CardBattleView.tsx");
const result = read("src/app/components/battle/BattleResultSummary.tsx");
const migration = read("supabase/migrations/20260827000202_raid_battle_reward_projection.sql");

assert(raid.includes('hideVisualHeader'), "Raid Top must not spend first view on a duplicate page title.");
assert(raid.includes('get_active_raids') && raid.includes('get_current_raid_attempt_state'), "Raid Top must read server Raid and attempt projections.");
assert(raid.includes('get_raid_rankings') && raid.includes('<RankPresentation'), "Raid rank must use the server projection and shared presentation.");
assert(raid.includes('CanonicalDialog title="RPが不足しています"'), "RP shortage must use CanonicalDialog.");
assert(raid.includes('use_action_resource_ticket') && raid.includes('p_item_id: "RAID_POINT_TICKET"'), "Raid recovery must use the existing ticket authority.");
assert(!raid.includes('setConfirmDialogConfig'), "Raid Top must not commit a battle through a legacy confirmation dialog.");
assert(battle.includes('pendingRaidStartRef') && battle.includes('confirmPreparedRaidBattle'), "Raid must prepare before the server start commit.");
assert(battle.includes('battleStartInFlightRef.current') && battleView.includes('battleLaunchRef.current'), "Raid start must reject duplicate UI submission.");
assert(battle.includes('mode === "PVP" || mode === "RAID"'), "Raid must use the canonical Main Formation authority.");
assert(battleView.includes('className="raid-battle-setup scroll-container"'), "Raid must expose the dedicated compact pre-battle hierarchy.");
assert(battleView.includes('RAID POINT') && battleView.includes('討伐開始'), "Raid pre-battle must show resource and primary CTA.");
assert(battle.includes('continueLabel: "レイドへ戻る"') && battle.includes('destination: "raid"'), "Raid Result must return to Raid Top.");
assert(migration.includes('requester_user_id = v_user_id') && migration.includes("finalization_status = 'FINALIZED'"), "Reward projection must be owner-scoped and finalized-only.");
assert(migration.includes('grant_row.granted_at = v_replay.finalized_at'), "Reward projection must expose only grants from this finalization.");
assert(result.includes('CanonicalItemIcon') && result.includes('battle-result-canonical-rewards'), "Raid Result must render canonical reward icon/name/quantity.");
assert(!battle.includes('destination: userGuildMember ? "raid" : "guild"'), "Unguilded users must not be diverted away from Raid Top.");
assert(/min-height:\s*0/.test(raidCss), "Raid hero must be compact for mobile first view.");

console.log(JSON.stringify({
  status: "PASS",
  checks: [
    "server Raid/attempt/rank projections",
    "compact Raid Top",
    "canonical RP shortage/recovery",
    "prepare then commit",
    "Main Formation authority",
    "Raid pre-battle hierarchy",
    "server-finalization reward projection",
    "canonical reward presentation",
    "Raid Top return",
  ],
}, null, 2));
