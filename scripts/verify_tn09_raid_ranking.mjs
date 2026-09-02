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

const migration = fs.readFileSync("supabase/migrations/20260902000227_ranking_season_lifecycle.sql", "utf8");
for (const contract of ["pg_advisory_xact_lock", "for update", "on conflict(ranking_type,starts_at)", "date_trunc('week'", "raid_damage_logs_ensure_season", "ensure_current_ranking_season('RAID'", "ensure_current_ranking_season('PVP'"]) assert.ok(migration.toLowerCase().includes(contract.toLowerCase()), contract);
const dialog = fs.readFileSync("src/app/components/ranking/RankingRewardDialog.tsx", "utf8");
assert.ok(dialog.includes("CanonicalDialog"));
assert.ok(dialog.includes("報酬定義なし"));
assert.ok(!dialog.includes("SPECIAL_TICKET_RANDOM\", 2"));
console.log("TN-09 Raid ranking verification passed.");
