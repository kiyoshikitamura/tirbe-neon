import { expect, test } from "@playwright/test";

test("title screen opens the authentication menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("TAP TO START")).toBeVisible();

  await page.getByText("TAP TO START").click();

  await expect(page.getByText("TRIBE: NEON REIGN")).toBeVisible();
  await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
});

test("authentication menu opens the email login form", async ({ page }) => {
  await page.goto("/");
  const tapToStart = page.getByText("TAP TO START");
  await expect(tapToStart).toBeVisible();
  await tapToStart.click();

  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
