import { expect, test, type Page } from "@playwright/test";

async function enterGame(page: Page) {
  await page.goto("/");
  const tapToStart = page.getByRole("button", { name: "TAP TO START" });
  const continueButton = page.getByRole("button", { name: "続きから" });
  const header = page.locator(".header-mobile");
  await expect(tapToStart.or(continueButton).or(header)).toBeVisible();
  if (await tapToStart.isVisible()) await tapToStart.click();
  await expect(continueButton.or(header)).toBeVisible();
  if (await continueButton.isVisible()) await continueButton.click();
  await expect(header).toBeVisible();
}

async function resumeAfterReload(page: Page) {
  const continueButton = page.getByRole("button", { name: "続きから" });
  const header = page.locator(".header-mobile");
  await expect(continueButton.or(header)).toBeVisible();
  if (await continueButton.isVisible()) await continueButton.click();
  await expect(header).toBeVisible();
}

function seedActivationState(options: { member: boolean; completed?: boolean; pendingRequest?: boolean }) {
  if (localStorage.getItem("phase5_activation_seeded") === "true") return;
  localStorage.setItem("phase5_activation_seeded", "true");
  const userId = "00000000-0000-4000-8000-000000000951";
  const guildId = "30000000-0000-4000-8000-000000000951";
  const now = new Date().toISOString();
  localStorage.setItem("tribe_demo_uuid", userId);
  localStorage.setItem("mock_auth_mode", "EMAIL");
  localStorage.setItem("mock_db_users", JSON.stringify([{
    id: userId,
    username: "Phase5User",
    level: 5,
    cash: 10_000,
    pvp_points: 5,
    current_base_id: "shinjuku",
    guild_id: options.member ? guildId : null,
    last_active_at: now,
  }, {
    id: "00000000-0000-4000-8000-000000000952",
    username: "GuildMaster",
    level: 8,
    cash: 10_000,
    current_base_id: "shinjuku",
    last_active_at: now,
  }]));
  localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: userId, step_id: "AUTHENTICATION" }]));
  localStorage.setItem("mock_db_user_account_auth_methods", JSON.stringify([{ user_id: userId, auth_method: "EMAIL" }]));
  localStorage.setItem("mock_db_user_funnel_milestones", JSON.stringify([
    "tutorial_complete", "first_pvp", "ranking_viewed", "first_raid", "guild_joined", "guild_activation",
    ...(options.completed ? ["activation_mission_handoff"] : []),
  ].map((milestone) => ({ user_id: userId, milestone, occurrence_count: 1 }))));
  localStorage.setItem("mock_db_guilds", JSON.stringify([{
    id: guildId,
    name: "PHASE 5 TRIBE",
    leader_id: "00000000-0000-4000-8000-000000000952",
    level: 5,
    xp: 0,
    member_count: options.member ? 2 : 1,
    member_limit: 20,
    approval_required: false,
    recruitment_mode: "OPEN_JOIN",
    description: "Activation acceptance",
  }]));
  localStorage.setItem("mock_db_guild_members", JSON.stringify(options.member
    ? [
      { id: "phase5-master", guild_id: guildId, user_id: "00000000-0000-4000-8000-000000000952", role: "MASTER" },
      { id: "phase5-member", guild_id: guildId, user_id: userId, role: "MEMBER" },
    ]
    : [{ id: "phase5-master", guild_id: guildId, user_id: "00000000-0000-4000-8000-000000000952", role: "MASTER" }]));
  localStorage.setItem("mock_db_guild_join_requests", JSON.stringify(options.pendingRequest
    ? [{ id: "phase5-request", guild_id: guildId, user_id: userId, status: "PENDING", requested_at: now }]
    : []));
}

test.describe("Phase 5 activation finalization", () => {
  test.setTimeout(60_000);
  test("Guild Chat completion hands off to Mission once and persists across reload", async ({ page }) => {
    await page.addInitScript(seedActivationState, { member: true });
    await enterGame(page);

    const finalGuide = page.getByText("あとはミッションをこなしながらゲームを進めていこう", { exact: true });
    await expect(finalGuide).toBeVisible();
    const cta = page.locator(".mypage-primary-cta");
    await expect(cta).toContainText("ミッションへ");
    await cta.click();

    await expect(page.getByRole("dialog", { name: "ミッション" })).toBeVisible();
    const milestoneCount = await page.evaluate(() => {
      const rows = JSON.parse(localStorage.getItem("mock_db_user_funnel_milestones") || "[]");
      return rows.filter((row: { milestone: string }) => row.milestone === "activation_mission_handoff").length;
    });
    expect(milestoneCount).toBe(1);

    await page.getByRole("button", { name: "閉じる" }).last().click();
    await expect(finalGuide).toHaveCount(0);
    await page.reload();
    await resumeAfterReload(page);
    await expect(finalGuide).toHaveCount(0);
  });

  test("unaffiliated and pending users receive the canonical Guild CTA", async ({ page }) => {
    await page.addInitScript(seedActivationState, { member: false, completed: true });
    await enterGame(page);
    await expect(page.locator(".mypage-primary-cta")).toContainText("ギルドに参加");

    await page.evaluate(() => {
      const me = localStorage.getItem("tribe_demo_uuid");
      localStorage.setItem("mock_db_guild_join_requests", JSON.stringify([{
        id: "phase5-request",
        guild_id: "30000000-0000-4000-8000-000000000951",
        user_id: me,
        status: "PENDING",
        requested_at: new Date().toISOString(),
      }]));
    });
    await page.reload();
    await resumeAfterReload(page);
    await expect(page.locator(".mypage-primary-cta")).toContainText("ギルド申請を確認");
  });

  test("join hides the discovery CTA and leave restores it without a reload", async ({ page }) => {
    await page.addInitScript(seedActivationState, { member: false, completed: true });
    await enterGame(page);
    const homeCta = page.locator(".mypage-primary-cta");
    await expect(homeCta).toContainText("ギルドに参加");
    await homeCta.click();
    await expect(page.locator(".guild-lobby-view")).toBeVisible();
    await page.getByRole("button", { name: "加入する", exact: true }).first().click();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const dialog = page.locator(".outlaw-confirm-overlay");
      if (!await dialog.isVisible()) break;
      await dialog.getByRole("button").last().click();
      await page.waitForTimeout(100);
    }
    const closeChat = page.getByRole("button", { name: "閉じる" }).last();
    if (await closeChat.isVisible()) await closeChat.click();
    await page.getByRole("button", { name: "マイページ" }).click();
    await expect(homeCta).not.toContainText("ギルドに参加");

    await page.getByRole("button", { name: /ギルド/ }).click();
    await page.getByRole("button", { name: /ギルドを?脱退/, exact: true }).click();
    await page.getByRole("button", { name: "脱退する", exact: true }).click();
    const successOk = page.getByRole("button", { name: "OK", exact: true });
    if (await successOk.isVisible()) await successOk.click();
    await page.getByRole("button", { name: "マイページ" }).click();
    await expect(homeCta).toContainText("ギルドに参加");
  });

  for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
    test(`final guidance stays compact at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(seedActivationState, { member: true });
      await enterGame(page);
      const cta = page.locator(".mypage-primary-cta");
      await expect(cta).toBeVisible();
      const geometry = await cta.evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(geometry.width).toBeLessThanOrEqual(viewport.width);
      expect(geometry.height).toBeLessThanOrEqual(150);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    });
  }
});
