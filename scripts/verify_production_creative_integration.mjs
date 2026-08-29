import assert from "node:assert/strict";
import {
  PRODUCTION_CREATIVES,
  PRODUCTION_CREATIVE_BY_GACHA_ID,
  resolveAvailableGachaCreative,
  resolveAvailableMyPageCreatives
} from "../src/domain/presentation/production_creatives.ts";

const expectedGachaPaths = {
  CHAR_SPECIAL: "/promotion/gacha_sp_character.png",
  SKILL_SPECIAL: "/promotion/gacha_sp_skill.jpg",
  EQUIP_SPECIAL: "/promotion/gacha_sp_equipment.jpg",
  CHAR_NORMAL: "/promotion/gacha_normal_character.png",
  SKILL_NORMAL: "/promotion/gacha_normal_skill.jpg",
  EQUIP_NORMAL: "/promotion/gacha_normal_equipment.jpg"
};
const expectedMyPagePaths = [1, 2, 3].map((order) => `/promotion/mypage_banner_0${order}.png`);

assert.equal(PRODUCTION_CREATIVES.length, 9, "Production Creative slot count must be 9");
assert.equal(new Set(PRODUCTION_CREATIVES.map((creative) => creative.id)).size, 9, "Creative IDs must be unique");
assert.equal(new Set(PRODUCTION_CREATIVES.map((creative) => creative.assetPath)).size, 9, "Creative paths must be unique");
assert.ok(PRODUCTION_CREATIVES.every((creative) => creative.enabled), "All frozen slots must be enabled");
assert.ok(PRODUCTION_CREATIVES.filter((creative) => creative.slot.startsWith("GACHA_")).every((creative) => creative.available), "All six delivered Gacha banners must be available");

for (const [gachaId, expectedPath] of Object.entries(expectedGachaPaths)) {
  const slot = PRODUCTION_CREATIVE_BY_GACHA_ID[gachaId];
  const creative = PRODUCTION_CREATIVES.find((candidate) => candidate.slot === slot);
  assert.equal(creative?.assetPath, expectedPath, `${gachaId} path mismatch`);
  assert.deepEqual([creative?.width, creative?.height], [1280, 640], `${gachaId} dimensions mismatch`);
  assert.equal(resolveAvailableGachaCreative(gachaId)?.assetPath, expectedPath, `${gachaId} must resolve its approved banner`);
}

const productionMyPage = resolveAvailableMyPageCreatives();
assert.deepEqual(productionMyPage?.map((creative) => creative.assetPath), expectedMyPagePaths);
assert.deepEqual(productionMyPage?.map((creative) => creative.destination), ["guild", "raid", null]);
assert.ok(productionMyPage?.every((creative) => creative.width === 1200 && creative.height === 200));

const deliveredFixture = PRODUCTION_CREATIVES.map((creative) => ({ ...creative, available: true }));
for (const [gachaId, expectedPath] of Object.entries(expectedGachaPaths)) {
  assert.equal(resolveAvailableGachaCreative(gachaId, deliveredFixture)?.assetPath, expectedPath);
}

const deliveredMyPage = resolveAvailableMyPageCreatives(deliveredFixture);
assert.deepEqual(deliveredMyPage?.map((creative) => creative.assetPath), expectedMyPagePaths);
assert.deepEqual(deliveredMyPage?.map((creative) => creative.order), [1, 2, 3]);
assert.deepEqual(deliveredMyPage?.map((creative) => creative.destination), ["guild", "raid", null]);
assert.ok(deliveredMyPage?.every((creative) => creative.width === 1200 && creative.height === 200));

const partialFixture = deliveredFixture.map((creative) => creative.id === "mypage_banner_03" ? { ...creative, available: false } : creative);
assert.equal(resolveAvailableMyPageCreatives(partialFixture), null, "Partial My Page delivery must not replace fallback");

console.log("Production Creative x9 integration verification PASS");
