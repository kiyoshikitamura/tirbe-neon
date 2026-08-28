import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`Gacha six-surface mobile presentation ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/qa/presentation?scenario=gacha-production");
    const fixture = page.locator("[data-gacha-production-fixture]");
    await expect(fixture).toBeVisible();
    await expect(page.getByLabel("無料ガチャあり")).toBeVisible();
    await expect(page.locator(".gacha-product-banner img")).toHaveAttribute("src", /gacha_normal_character/);
    await expect(page.getByRole("button", { name: "本日10連無料" })).toBeVisible();
    await expect(page.locator(".gacha-category-tabs .free-badge-dot")).toHaveCount(3);
    const freeCta = page.getByRole("button", { name: "本日10連無料" });
    const offer = page.locator(".gacha-normal-offer");
    const freeGeometry = await Promise.all([freeCta.boundingBox(), offer.boundingBox()]);
    expect(freeGeometry[0]!.width).toBeGreaterThan(freeGeometry[1]!.width - 28);

    await page.getByRole("button", { name: "スペシャル" }).click();
    await expect(page.locator(".gacha-product-banner img")).toHaveAttribute("src", /gacha_sp_character/);
    await expect(page.getByText("COMING SOON")).toBeVisible();
    await expect(page.getByRole("button", { name: /回/ })).toHaveCount(0);
    await page.getByRole("button", { name: "ノーマル" }).click();

    const geometry = await fixture.evaluate((node) => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      bannerRatio: (() => { const rect = node.querySelector(".gacha-product-banner")!.getBoundingClientRect(); return rect.width / rect.height; })(),
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.bannerRatio).toBeGreaterThan(3.9);
    expect(geometry.bannerRatio).toBeLessThan(4.1);
  });
}

test("Daily free entitlement badges are category-isolated and CASH does not consume them", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/qa/presentation?scenario=gacha-production");

  await page.getByRole("button", { name: "本日10連無料" }).click();
  await expect(page.getByRole("button", { name: "本日10連無料" })).toHaveCount(0);
  await expect(page.getByText("本日の無料10連は使用済みです")).toHaveCount(0);
  await expect(page.locator(".gacha-category-tabs .free-badge-dot")).toHaveCount(2);
  await expect(page.getByLabel("無料ガチャあり")).toBeVisible();

  await page.getByRole("button", { name: /スキル/ }).first().click();
  await page.getByRole("button", { name: "1回 1,000キャッシュ" }).click();
  await expect(page.getByRole("button", { name: "本日10連無料" })).toBeVisible();
  await expect(page.locator(".gacha-category-tabs .free-badge-dot")).toHaveCount(2);

  await page.getByRole("button", { name: "本日10連無料" }).click();
  await page.getByRole("button", { name: /装備/ }).first().click();
  await page.getByRole("button", { name: "本日10連無料" }).click();
  await expect(page.locator(".gacha-category-tabs .free-badge-dot")).toHaveCount(0);
  await expect(page.getByLabel("無料ガチャあり")).toHaveCount(0);
});

test("Canonical server rates are presented without client hardcoded ordering", async ({ page }) => {
  await page.goto("/qa/presentation?scenario=gacha-production");
  await page.getByRole("button", { name: "提供割合" }).click();
  const dialog = page.getByRole("dialog", { name: "提供割合" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("SSR");
  await expect(dialog).toContainText("2.00%");
});

for (const resultType of ["skill", "equipment"] as const) {
  test(`${resultType} ten-pull uses the compact result grammar`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/qa/presentation?scenario=gacha-${resultType}-result`);
    const result = page.locator(`[data-gacha-result-type="${resultType.toUpperCase()}"]`);
    await expect(result.locator(".gacha-result-card")).toHaveCount(10);
    await expect(result.locator(".gacha-result-name")).toHaveCount(10);
    await expect(result.locator(".gacha-result-rarity-frame")).toHaveCount(10);
    await expect(result.locator(`.gacha-result-rarity-frame[src*="${resultType}-frame-n.png"]`)).toHaveCount(2);
    await expect(result.locator(`.gacha-result-rarity-frame[src*="${resultType}-frame-r.png"]`)).toHaveCount(3);
    await expect(result.locator(`.gacha-result-rarity-frame[src*="${resultType}-frame-sr.png"]`)).toHaveCount(3);
    await expect(result.locator(`.gacha-result-rarity-frame[src*="${resultType}-frame-ssr.png"]`)).toHaveCount(2);
    await expect(result.locator('.gacha-result-asset-badge.is-new[src*="badge-new.png"]')).toHaveCount(3);
    await expect(result.locator('.gacha-result-asset-badge.is-progression[aria-label="限界突破 +3"]')).toBeVisible();
    await expect(result.locator('.gacha-result-asset-badge.is-progression img[src*="badge-awakening-plus-3.png"]')).toBeVisible();
    await expect(result.locator('.gacha-result-card.rarity-ssr[data-ssr-glint="enabled"]')).toHaveCount(2);
    const geometry = await result.locator(".gacha-result-panel").evaluate((node) => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      columns: getComputedStyle(node.querySelector(".gacha-result-grid")!).gridTemplateColumns.split(" ").length,
      frameAnimation: getComputedStyle(node.querySelector(".gacha-result-rarity-frame")!).animationName,
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.columns).toBe(5);
    expect(geometry.frameAnimation).toBe("none");
  });

  test(`${resultType} one-pull keeps canonical frame and badge parity`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/qa/presentation?scenario=gacha-${resultType}-result-one`);
    const result = page.locator(`[data-gacha-result-type="${resultType.toUpperCase()}"]`);
    await expect(result.locator(".gacha-result-card")).toHaveCount(1);
    await expect(result.locator(`.gacha-result-rarity-frame[src*="${resultType}-frame-n.png"]`)).toBeVisible();
    await expect(result.locator('.gacha-result-asset-badge.is-new[src*="badge-new.png"]')).toBeVisible();
    await expect(result.locator(".gacha-result-name")).toHaveCount(1);
  });
}
