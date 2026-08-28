import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("src/app/components/GachaTab.tsx");
const footer = read("src/app/components/Footer.tsx");
const context = read("src/app/context/GameContext.tsx");
const modal = read("src/app/components/CommonModals.tsx");
const migration = read("supabase/migrations/20260828000208_gacha_result_projection_parity.sql");

for (const id of ["CHAR_NORMAL", "CHAR_SPECIAL", "SKILL_NORMAL", "SKILL_SPECIAL", "EQUIP_NORMAL", "EQUIP_SPECIAL"]) {
  assert.match(read("src/domain/presentation/production_creatives.ts"), new RegExp(id.replace("_", "_")));
}
assert.match(page, /activeSurface/);
assert.match(page, /本日10連無料/);
assert.doesNotMatch(page, /本日の無料10連は使用済みです/);
assert.match(page, /COMING SOON/);
assert.doesNotMatch(page, /runScout\([^\n]+"DIAMOND"/);
assert.match(footer, /dailyFreeGachaReady/);
assert.match(footer, /無料ガチャあり/);
assert.match(context, /conversion_item_id/);
assert.match(context, /canonicalItemName\(conversionItemId\)/);
assert.match(modal, /is-character-results/);
assert.match(modal, /is-asset-results/);
assert.match(modal, /getRarityFrameAsset/);
assert.match(modal, /gacha-result-rarity-frame/);
assert.match(modal, /getAcquisitionBadgeAsset\("NEW"\)/);
assert.match(modal, /gacha-result-asset-badge is-progression/);
assert.match(migration, /SKILL_MANUAL/);
assert.match(migration, /conversion_quantity/);
assert.doesNotMatch(migration.replaceAll("'TRAINING_MANUAL'", ""), /TRAINING_MANUAL/);

console.log("Phase 6-B Gacha presentation/runtime contract PASS");
