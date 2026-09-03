import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  rankingRewardSections,
  rankingRewardSectionsFromPayload,
} from "../src/domain/ranking/rankingRewardPresentation.ts";
import {
  aggregateRankingRewardItems,
  parsePendingRankingRewardNotification,
} from "../src/domain/ranking/rankingRewardNotification.ts";

assert.equal(rankingRewardSections("pvp", "season")[0]?.cadence, "MONTHLY");
assert.deepEqual(rankingRewardSections("raid", "season").map((section) => section.title), ["個人ランキング", "ギルドランキング"]);
assert.equal(rankingRewardSections("power", "daily").length, 0);
assert.equal(rankingRewardSections("guild_power", "season").length, 0);

const serverMaster = {
  periods: { POWER: "MONTHLY" },
  progressionByPeriod: { DAILY: { POWER: [[1, 3, "CASH", 100]] } },
};
assert.deepEqual(rankingRewardSectionsFromPayload(serverMaster, "power", "daily"), [{
  title: "個人ランキング",
  cadence: "DAILY",
  tiers: [{ from: 1, to: 3, itemId: "CASH", quantity: 100 }],
}]);
assert.equal(rankingRewardSectionsFromPayload({ progression: { PVP: [[0, 1, "CASH", 100]] } }, "pvp", "season").length, 0);

const pending = parsePendingRankingRewardNotification({
  notification_ids: ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"],
  grants: [
    { period_kind: "DAILY", period_key: "2026-09-03", ranking_category: "POWER", rank_position: 1, item_id: "CASH", quantity: 100, granted_at: "2026-09-02T15:00:00Z" },
    { period_kind: "SEASON", period_key: "2026-09", ranking_category: "PVP", rank_position: 2, item_id: "CASH", quantity: 50, granted_at: "2026-09-30T15:00:00Z" },
  ],
});
assert.ok(pending);
assert.deepEqual(aggregateRankingRewardItems(pending.grants), [{ id: "CASH", quantity: 150 }]);
assert.equal(parsePendingRankingRewardNotification({ notification_ids: [], grants: [] }), null);

const controller = readFileSync("src/app/components/ranking/RankingRewardNotificationController.tsx", "utf8");
assert.match(controller, /get_my_pending_ranking_reward_notification/);
assert.match(controller, /acknowledge_ranking_reward_notifications/);
assert.match(controller, /onConfirm: acknowledge/);
assert.match(controller, /onCancel: acknowledge/);
assert.match(controller, /setPending\(null\);\s*setConfirmDialogConfig\(null\);/);

console.log("Ranking reward UI contract: PASS");
