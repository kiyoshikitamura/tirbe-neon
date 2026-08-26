import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CANONICAL_PVP_MATCHMAKING, CANONICAL_PVP_PRODUCTION, CANONICAL_PVP_RANKING_REWARDS,
  CANONICAL_RAID_BOSSES, CANONICAL_RAID_PRODUCTION, CANONICAL_RAID_REWARDS,
  canonicalCompetitionRanks, canonicalPvpRatingAfter, canonicalPvpRatingDelta, canonicalPvpSoftReset, canonicalRaidPair,
} from "../src/domain/gameplay/canonical/combat_production.ts";

assert.equal(CANONICAL_PVP_PRODUCTION.modes.PRACTICE.cost, 0);
assert.equal(CANONICAL_PVP_PRODUCTION.modes.OFFICIAL.cost, 1);
assert.equal(CANONICAL_PVP_PRODUCTION.modes.OFFICIAL.winCash, 500);
assert.equal(CANONICAL_PVP_PRODUCTION.modes.OFFICIAL.lossCash, 250);
assert.equal(canonicalPvpRatingDelta(1000, 1000, "WIN"), 16);
assert.equal(canonicalPvpRatingDelta(1000, 1000, "LOSS"), -8);
assert(canonicalPvpRatingDelta(1000, 1400, "WIN") > canonicalPvpRatingDelta(1000, 800, "WIN"));
assert.equal(canonicalPvpRatingAfter(0, 2000, "LOSS"), 0);
assert.deepEqual([1600, 1400, 1200, 1000, 800].map(canonicalPvpSoftReset), [1300, 1200, 1100, 1000, 900]);
assert.deepEqual(CANONICAL_PVP_MATCHMAKING.tiers.map((tier) => tier.ratingRange), [300, 500, null]);
assert.equal(CANONICAL_PVP_MATCHMAKING.candidateLimit, 5);
assert.deepEqual(CANONICAL_PVP_RANKING_REWARDS.tiers.map((tier) => [tier.rankMin, tier.rankMax]), [[1,1],[2,3],[4,10],[11,50]]);
assert.equal(CANONICAL_RAID_PRODUCTION.raidTowns.length, 5);
const tenPairs = new Set(Array.from({ length: 10 }, (_, index) => canonicalRaidPair(new Date(Date.UTC(2026, 7, 22 + index)).toISOString().slice(0, 10)).join("/")));
assert.equal(tenPairs.size, 10);
assert.equal(CANONICAL_RAID_BOSSES.bosses.length, 5);
for (const boss of CANONICAL_RAID_BOSSES.bosses) {
  assert(boss.skillLoadout.length >= 2);
  assert.equal(boss.maxHp, Math.round(boss.averageReferenceBattleDamage * 40 / 100000) * 100000);
  assert.equal(boss.tuningStatus, "P0_TUNABLE");
}
assert.deepEqual(canonicalCompetitionRanks([100, 90, 90, 80]), [1, 2, 2, 4]);
assert.deepEqual(CANONICAL_RAID_REWARDS.progressRewards.map((reward) => reward.rewardId), ["PARTICIPATION_1", "ACTIVE_3", "FULL_POINTS_5"]);
const migration = fs.readFileSync("supabase/migrations/20260822000184_pvp_raid_ranking_production.sql", "utf8");
for (const token of ["canonical_pvp_rating_delta", "canonical_raid_rotation_pair", "rank() over(order by contribution desc)", "NORMAL_GACHA_TICKET_CHARACTER", "PRESENT_EXACTLY_ONCE", "DAMAGE 80% ATK"]) assert(migration.includes(token), token);
for (const legacy of ["order by random()", "9999999", "3 free attempts", "rank_gap / 50", "plus_val * 0.10"]) assert(!migration.toLowerCase().includes(legacy.toLowerCase()), legacy);
const pvpUi = fs.readFileSync("src/app/components/PvpTab.tsx", "utf8");
for (const token of ["公式戦", "模擬戦", "WIN +", "勝利 CASH 500", "敗北 CASH 250"]) assert(pvpUi.includes(token), token);
const raidUi = fs.readFileSync("src/app/components/RaidTab.tsx", "utf8");
for (const token of ["profileType", "参加1回: CASH 300", "討伐参加者", "個人1位", "Guild 1位"]) assert(raidUi.includes(token), token);
const freeze = fs.readFileSync("specs/production/gameplay_foundation/pvp_raid_ranking_production_freeze_20260822.md", "utf8");
assert(freeze.includes("Authority Gap: **0**"));
console.log("PvP / Raid / Ranking production master verification PASS");
