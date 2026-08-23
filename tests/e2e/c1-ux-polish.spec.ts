import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const userId = "00000000-0000-4000-8000-000000000201";
    const now = new Date().toISOString();
    const cycleDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_db_users", JSON.stringify([{ id: userId, username: "C1検証ユーザー", current_base_id: "shinjuku", favorite_character_id: "char_reiji_01", level: 10, cash: 50_000 }]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{ id: "10000000-0000-4000-8000-000000000201", user_id: userId, character_id: "char_reiji_01", level: 10, awakening_level: 1, created_at: now }]));
    localStorage.setItem("mock_db_user_main_formations", JSON.stringify([{ user_id: userId, character_ids: ["10000000-0000-4000-8000-000000000201"] }]));
    const mission = { id: "ob_daily_patrol_01", title: "長いタイトルでも報酬受取導線を確認するミッション", description: "クエストを完了して報酬を受け取り、次の行動へ進みます。", category: "DAILY", trigger_type: "PATROL_CLEAR", target_value: 1, reward_item_id: "CASH", reward_quantity: 1000, condition_params: { cta_tab: "patrol", cta_label: "クエストへ" }, display_order: 20, is_enabled: true, is_provisional: false };
    localStorage.setItem("mock_db_missions", JSON.stringify([mission]));
    localStorage.setItem("mock_db_user_missions", JSON.stringify([{ id: "user-c1-mission", user_id: userId, mission_id: mission.id, cycle_date: cycleDate, current_progress: 1, status: "CLEAR", claimed_at: null, missions: mission }]));
    localStorage.setItem("mock_db_presents", JSON.stringify([{ id: "present-c1", user_id: userId, item_id: "CHAR_EXP_M", quantity: 2, message: "C1検証プレゼント", status: "UNCLAIMED", created_at: now }]));
    localStorage.setItem("mock_db_guilds", JSON.stringify([
      { id: "30000000-0000-4000-8000-000000000201", name: "NEON BEGINNERS", level: 3, member_count: 4, member_limit: 14, recruitment_mode: "OPEN_JOIN", approval_required: false, description: "毎日活動中", active_members_7d: 4, raid_participants_7d: 3 },
      { id: "30000000-0000-4000-8000-000000000202", name: "TOKYO RAIDERS", level: 4, member_count: 8, member_limit: 17, recruitment_mode: "APPLICATION_REQUIRED", approval_required: true, description: "レイド中心", active_members_7d: 7, raid_participants_7d: 5 },
      { id: "30000000-0000-4000-8000-000000000203", name: "CYAN EDGE", level: 2, member_count: 5, member_limit: 12, recruitment_mode: "OPEN_JOIN", approval_required: false, description: "初心者歓迎", active_members_7d: 4, raid_participants_7d: 1 },
    ]));
    localStorage.setItem("mock_db_guild_members", "[]");
    localStorage.setItem("mock_db_user_funnel_milestones", "[]");
  });
});

async function enterGame(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "TAP TO START" }).click();
  await expect(page.locator(".header-mobile")).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page, selector: string) {
  const size = await page.locator(selector).first().evaluate((node) => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth + 1);
}

for (const viewport of [
  { name: "iphone13", width: 390, height: 844 },
  { name: "pixel7", width: 412, height: 915 },
  { name: "desktop", width: 1280, height: 900 },
]) {
  test(`${viewport.name}: Home and Mission reward feedback remain usable`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await enterGame(page);
    await expect(page.locator(".mypage-primary-cta")).toContainText("最初のPvPへ挑戦");
    await expectNoHorizontalOverflow(page, ".mypage-view");

    await page.getByRole("button", { name: /ミッション/ }).click();
    await expect(page.locator(".mission-item.CLEAR")).toBeVisible();
    await expect(page.locator(".mission-reward")).toContainText("CASH");
    await expectNoHorizontalOverflow(page, ".mission-panel-container-inner");
    await page.getByRole("button", { name: "受け取る", exact: true }).click();
    const rewardDialog = page.locator(".outlaw-confirm-dialog.kind-reward");
    await expect(rewardDialog).toBeVisible();
    await expect(rewardDialog).toContainText("CASH");
    await expect(rewardDialog).toContainText("プレゼント");
    await expectNoHorizontalOverflow(page, ".outlaw-confirm-dialog");
  });
}

test("Guild recommendation explains why and keeps join feedback actionable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterGame(page);
  await page.locator(".circle-menu-btn.allies").click();
  await expect(page.locator(".guild-lobby-guild-card").first()).toBeVisible();
  await expect(page.locator(".guild-recommendation-reason").first()).toContainText("おすすめ理由");
  await expectNoHorizontalOverflow(page, ".guild-lobby-view");
});

test("Present claim uses the shared reward result and mobile-safe layout", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await enterGame(page);
  await page.locator(".sub-icon-unit").filter({ hasText: "プレゼント" }).click();
  await expect(page.locator(".inbox-present-item")).toBeVisible();
  await expectNoHorizontalOverflow(page, ".inbox-panel-container-inner");
  await page.getByRole("button", { name: "受け取る", exact: true }).click();
  const dialog = page.locator(".outlaw-confirm-dialog.kind-reward");
  await expect(dialog).toContainText("× 2");
  await expect(dialog).not.toContainText("CHAR_EXP_M");
});
