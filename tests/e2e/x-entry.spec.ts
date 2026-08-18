import { expect, test } from "@playwright/test";

test("a normal browser passes through /open and retains known and campaign parameters", async ({ page }) => {
  await page.goto("/open?invite=ENTRY-FRIEND&utm_source=x&utm_campaign=beta");
  await expect(page).toHaveURL(/\/\?invite=ENTRY-FRIEND&utm_source=x&utm_campaign=beta$/);
  await expect(page.getByText("TAP TO START")).toBeVisible();
});

test.describe("X iOS entry", () => {
  test.use({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Twitter for iPhone/10.50",
  });

  test("tries one external open and keeps a usable fallback without losing invite", async ({ page }) => {
    await page.addInitScript(() => {
      const originalOpen = window.open;
      Object.defineProperty(window, "open", {
        configurable: true,
        value: (url?: string | URL) => {
          const calls = JSON.parse(sessionStorage.getItem("x_entry_open_calls") || "[]");
          calls.push(String(url || ""));
          sessionStorage.setItem("x_entry_open_calls", JSON.stringify(calls));
          return null;
        },
      });
      void originalOpen;
    });

    await page.goto("/open?invite=ENTRY-X-IOS&utm_source=x");
    await expect(page.getByText("外部ブラウザでゲームを開始")).toBeVisible();
    await expect(page.getByRole("link", { name: "ブラウザで開く" })).toHaveAttribute("href", /\?invite=ENTRY-X-IOS&utm_source=x$/);
    await expect.poll(async () => page.evaluate(() => JSON.parse(sessionStorage.getItem("x_entry_open_calls") || "[]").length)).toBe(1);

    await page.reload();
    await expect(page.getByText("外部ブラウザでゲームを開始")).toBeVisible();
    await expect.poll(async () => page.evaluate(() => JSON.parse(sessionStorage.getItem("x_entry_open_calls") || "[]").length)).toBe(1);
  });
});
