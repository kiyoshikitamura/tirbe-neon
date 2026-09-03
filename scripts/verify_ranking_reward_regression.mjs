import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  rankingRewardSectionsFromPayload,
} from "../src/domain/ranking/rankingRewardPresentation.ts";
import {
  aggregateRankingRewardItems,
  parsePendingRankingRewardNotification,
} from "../src/domain/ranking/rankingRewardNotification.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const canonical = JSON.parse(read("src/domain/gameplay/canonical/data/ranking_season_rewards_20260830.json"));
const migration = read("supabase/migrations/20260903000233_ranking_reward_notification_contract.sql");
const rankingTab = read("src/app/components/RankingTab.tsx");
const dialog = read("src/app/components/ranking/RankingRewardDialog.tsx");
const controller = read("src/app/components/ranking/RankingRewardNotificationController.tsx");
const page = read("src/app/page.tsx");

// The canonical payload is the only reward authority. An absent DAILY branch
// must stay empty rather than borrowing or fabricating season values.
assert.equal(rankingRewardSectionsFromPayload(canonical, "pvp", "daily").length, 0);
assert.equal(rankingRewardSectionsFromPayload(canonical, "raid", "daily").length, 0);
assert.equal(rankingRewardSectionsFromPayload(canonical, "pvp", "season")[0]?.cadence, "MONTHLY");
assert.deepEqual(
  rankingRewardSectionsFromPayload(canonical, "raid", "season").map((section) => section.cadence),
  ["WEEKLY", "WEEKLY"],
);

const payloadWithDaily = {
  progressionByPeriod: {
    DAILY: { PVP: [[1, 1, "NORMAL_GACHA_TICKET_RANDOM", 1]] },
    SEASON: canonical.progression,
  },
  periods: canonical.periods,
};
assert.deepEqual(rankingRewardSectionsFromPayload(payloadWithDaily, "pvp", "daily"), [{
  title: "個人ランキング",
  cadence: "DAILY",
  tiers: [{ from: 1, to: 1, itemId: "NORMAL_GACHA_TICKET_RANDOM", quantity: 1 }],
}]);

const rawPending = {
  notification_ids: ["10000000-0000-4000-8000-000000000001"],
  grants: [
    { period_kind: "SEASON", period_key: "season-1", ranking_category: "PVP", rank_position: 1, item_id: "SPECIAL_TICKET_RANDOM", quantity: 2, granted_at: "2026-09-01T15:00:00Z" },
    { period_kind: "SEASON", period_key: "season-1", ranking_category: "RAID_PERSONAL", rank_position: 2, item_id: "SPECIAL_TICKET_RANDOM", quantity: 1, granted_at: "2026-09-01T15:00:00Z" },
  ],
};
const pending = parsePendingRankingRewardNotification(rawPending);
assert(pending);
assert.deepEqual(pending.notificationIds, rawPending.notification_ids);
assert.deepEqual(aggregateRankingRewardItems(pending.grants), [{ id: "SPECIAL_TICKET_RANDOM", quantity: 3 }]);
assert.equal(parsePendingRankingRewardNotification(null), null);
assert.equal(parsePendingRankingRewardNotification({ notification_ids: [], grants: [] }), null);

for (const contract of [
  "ranking_reward_notifications",
  "unique (recipient_user_id,period_kind,period_key)",
  "get_public_ranking_reward_master",
  "canonical_ranking_reward_payload",
  "get_my_pending_ranking_reward_notification",
  "acknowledge_ranking_reward_notifications",
  "notification.recipient_user_id=v_uid",
  "notification.acknowledged_at is null",
  "if found then",
  "on conflict do nothing",
  "period_kind in ('DAILY','SEASON')",
  "at time zone 'Asia/Tokyo'",
]) {
  const source = `${migration}\n${read("supabase/migrations/20260902000229_ranking_season_lifecycle_authority.sql")}`.toLowerCase();
  assert(source.includes(contract.toLowerCase()), `migration contract missing: ${contract}`);
}
assert.doesNotMatch(migration, /progressionByPeriod[\s\S]*DAILY[\s\S]*\[\s*\[/i, "migration must not fabricate DAILY reward tiers");

assert.match(rankingTab, /rpc\("get_public_ranking_reward_master"\)/);
assert.match(rankingTab, /<RankingRewardDialog[\s\S]*master=\{rewardMaster\}[\s\S]*loading=\{rewardMasterLoading\}/);
assert.match(dialog, /rankingRewardSectionsFromPayload\(master, category, period\)/);
assert.match(dialog, /報酬定義なし/);

assert.match(page, /<RankingRewardNotificationController \/>/);
assert.match(controller, /activeTab !== "home"/);
assert.match(controller, /rpc\("get_my_pending_ranking_reward_notification"\)/);
const acknowledgeBody = controller.slice(controller.indexOf("const acknowledge = async"));
assert.match(acknowledgeBody, /rpc\("acknowledge_ranking_reward_notifications"/);
assert.match(acknowledgeBody, /onConfirm: acknowledge/);
assert.match(acknowledgeBody, /onCancel: acknowledge/);
assert.match(acknowledgeBody, /if \(error\) throw error;[\s\S]*setPending\(null\)[\s\S]*setConfirmDialogConfig\(null\)/);
const beforeAcknowledge = controller.slice(0, controller.indexOf("const acknowledge = async"));
assert.doesNotMatch(beforeAcknowledge, /acknowledge_ranking_reward_notifications/,
  "loading or presenting a notification must not acknowledge it");

console.log("Ranking reward notification contract verifier: PASS");
console.log("- canonical master getter and daily-safe presentation");
console.log("- season grant notification and same-period idempotency guards");
console.log("- Home-only pending lookup and dismiss-only acknowledgement");
