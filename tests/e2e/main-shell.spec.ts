import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tribe_demo_uuid", "00000000-0000-4000-8000-000000000001");
  });
});

async function enterGame(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await expect(page.locator(".header-mobile")).toBeVisible();
  const welcomeAction = page.getByRole("button", { name: "抗争に参入する" });
  await welcomeAction.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
  if (await welcomeAction.isVisible()) await welcomeAction.click();
}

test("authenticated game shell keeps the header and footer inside its safe frame", async ({ page }) => {
  await enterGame(page);

  const header = page.locator(".header-mobile");
  const footer = page.locator(".footer-mobile");
  await expect(header).toBeVisible();
  await expect(footer).toBeVisible();

  const headerBox = await header.boundingBox();
  const footerBox = await footer.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(headerBox!.y).toBeGreaterThanOrEqual(36);
  expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(844);
});

test("shared shell preserves footer navigation", async ({ page }) => {
  await enterGame(page);
  await page.getByRole("button", { name: /キャラ/ }).click();
  await expect(page.locator(".footer-item.active")).toContainText("キャラ");
});
