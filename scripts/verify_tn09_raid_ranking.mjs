import assert from "node:assert/strict";
import fs from "node:fs";
import { rankingSeasonWindow, isInsideRankingSeason } from "../src/domain/ranking/rankingSeason.ts";
import { rankingRewardSections } from "../src/domain/ranking/rankingRewardPresentation.ts";

const before = rankingSeasonWindow("RAID", new Date("2026-09-06T14:59:59.000Z"));
assert.deepEqual(before, { startsAt: "2026-08-30T15:00:00.000Z", endsAt: "2026-09-06T15:00:00.000Z" });
assert.deepEqual(rankingSeasonWindow("RAID", new Date("2026-09-06T15:00:00.000Z")), { startsAt: "2026-09-06T15:00:00.000Z", endsAt: "2026-09-13T15:00:00.000Z" });
assert.deepEqual(rankingSeasonWindow("PVP", new Date("2026-09-02T00:00:00.000Z")), { startsAt: "2026-08-31T15:00:00.000Z", endsAt: "2026-09-30T15:00:00.000Z" });
assert.equal(isInsideRankingSeason("2026-09-06T14:59:59Z", before), true);
assert.equal(isInsideRankingSeason("2026-09-06T15:00:00Z", before), false);
const currentWeekDamage = [
  { createdAt: "2026-09-06T14:59:59Z", damage: 1200 },
  { createdAt: "2026-08-29T14:59:59Z", damage: 9900 },
].filter((entry) => isInsideRankingSeason(entry.createdAt, before)).reduce((sum, entry) => sum + entry.damage, 0);
assert.equal(currentWeekDamage, 1200);
assert.deepEqual(rankingSeasonWindow("RAID", new Date("2026-09-02T00:00:00.000Z")), rankingSeasonWindow("RAID", new Date("2026-09-02T00:00:00.000Z")));

assert.equal(rankingRewardSections("pvp", "season")[0].cadence, "MONTHLY");
assert.deepEqual(rankingRewardSections("raid", "season").map((entry) => entry.cadence), ["WEEKLY", "WEEKLY"]);
assert.equal(rankingRewardSections("raid", "daily").length, 0);
assert.equal(rankingRewardSections("power", "season").length, 0);
assert.equal(rankingRewardSections("guild_power", "season").length, 0);

const migration = fs.readFileSync("supabase/migrations/20260902000229_ranking_season_lifecycle_authority.sql", "utf8");
for (const contract of [
  "canonical_ranking_reward_payload",
  "canonical_master_freeze_versions",
  "ranking_pvp_season_snapshots",
  "ranking_raid_personal_season_snapshots",
  "ranking_raid_guild_season_snapshots",
  "ranking_season_reward_grants",
  "finalize_pvp_season_rewards",
  "finalize_raid_season_rewards",
  "soft_reset_pvp_ratings",
  "pg_advisory_xact_lock",
  "advance_ranking_season('PVP'",
  "advance_ranking_season('RAID'",
  "ranking-pvp-monthly-jst",
  "ranking-raid-weekly-jst",
  "from public,anon,authenticated",
]) assert.ok(migration.toLowerCase().includes(contract.toLowerCase()), contract);
assert.ok(!migration.includes("create trigger raid_damage_logs_ensure_season"));
assert.ok(!migration.includes("ensure_current_ranking_season"));
const revert = fs.readFileSync("supabase/migrations/20260902000228_ranking_season_lifecycle_revert.sql", "utf8");
assert.ok(revert.includes("20260902000227"));
assert.ok(revert.includes("drop function if exists public.ensure_current_ranking_season"));
const dialog = fs.readFileSync("src/app/components/ranking/RankingRewardDialog.tsx", "utf8");
assert.ok(dialog.includes("CanonicalDialog"));
assert.ok(dialog.includes("報酬定義なし"));
assert.ok(!dialog.includes("SPECIAL_TICKET_RANDOM\", 2"));
console.log("TN-09 Raid ranking verification passed.");
