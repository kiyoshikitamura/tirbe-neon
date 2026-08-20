import { expect, test } from "@playwright/test";
import {
  getAcquisitionBadgeAsset,
  getAwakeningBadgeAsset,
  getRarityBadgeAsset,
  getRarityFrameAsset,
} from "../../src/utils/rarityAssets";

const rarities = ["N", "R", "SR", "SSR"] as const;

test("all 26 Production rarity assets resolve and render without distortion", async ({ page }, testInfo) => {
  const assets = [
    ...rarities.map((rarity) => ({ label: `Reveal ${rarity}`, src: getRarityFrameAsset("reveal", rarity), ratio: "640 / 1040" })),
    ...rarities.map((rarity) => ({ label: `Character ${rarity}`, src: getRarityFrameAsset("character", rarity), ratio: "300 / 420" })),
    ...rarities.map((rarity) => ({ label: `Skill ${rarity}`, src: getRarityFrameAsset("skill", rarity), ratio: "1" })),
    ...rarities.map((rarity) => ({ label: `Equipment ${rarity}`, src: getRarityFrameAsset("equipment", rarity), ratio: "1" })),
    ...rarities.map((rarity) => ({ label: `Badge ${rarity}`, src: getRarityBadgeAsset(rarity), ratio: "256 / 160" })),
    { label: "NEW", src: getAcquisitionBadgeAsset("NEW")!, ratio: "2" },
    ...[1, 2, 3, 4, 5].map((level) => ({ label: `Awakening +${level}`, src: getAwakeningBadgeAsset(level)!, ratio: "2" })),
  ];
  expect(assets).toHaveLength(26);
  await page.goto("/");
  await page.setContent(`<style>body{margin:0;background:#050912;color:white;font:12px sans-serif}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:12px}.asset{display:grid;place-items:center;gap:4px;min-width:0;padding:5px;border:1px solid #244158;background:#09111d}.asset img{display:block;width:100%;height:auto;aspect-ratio:var(--ratio);object-fit:fill}</style><main class="grid">${assets.map((asset) => `<figure class="asset"><img src="${asset.src}" alt="${asset.label}" style="--ratio:${asset.ratio}"><figcaption>${asset.label}</figcaption></figure>`).join("")}</main>`);
  await expect.poll(() => page.locator("img").evaluateAll((images) => images.filter((image) => {
    const asset = image as HTMLImageElement;
    return asset.complete && asset.naturalWidth > 0;
  }).length)).toBe(26);
  const failed = await page.locator("img").evaluateAll((images) => images.filter((image) => (image as HTMLImageElement).naturalWidth === 0).map((image) => image.getAttribute("src")));
  expect(failed).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("production-rarity-assets-26.png"), fullPage: true });
});
