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
  const tapToStart = page.getByRole("button", { name: "TAP TO START" });
  const continueButton = page.getByRole("button", { name: "続きから" });
  const header = page.locator(".header-mobile");
  await expect(tapToStart.or(continueButton).or(header)).toBeVisible();
  if (await tapToStart.isVisible()) await tapToStart.click();
  if (await continueButton.isVisible()) await continueButton.click();
  await expect(header).toBeVisible();
}

function seedActivationState(options: { member: boolean; completed?: boolean; pendingRequest?: boolean; rewardAvailable?: boolean }) {
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
    "tutorial_complete", "first_free_skill_ten_pull", "first_free_equipment_ten_pull", "first_main_loadout",
    "first_pvp", "ranking_viewed", "first_raid", "guild_joined", "guild_activation",
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
  if (options.rewardAvailable) {
    const mission = {
      id: "phase5-reward",
      title: "受取可能な報酬",
      description: "Homeではbadgeだけを表示します。",
      category: "NORMAL",
      trigger_type: "LOGIN",
      target_value: 1,
      reward_item_id: "CASH",
      reward_quantity: 100,
      display_order: 1,
      is_enabled: true,
    };
    localStorage.setItem("mock_db_missions", JSON.stringify([mission]));
    localStorage.setItem("mock_db_user_missions", JSON.stringify([{
      id: "phase5-user-reward",
      user_id: userId,
      mission_id: mission.id,
      cycle_date: now.slice(0, 10),
      current_progress: 1,
      status: "CLEAR",
      claimed_at: null,
      missions: mission,
    }]));
  }
}

test.describe("Phase 5 activation finalization", () => {
  test.setTimeout(60_000);
  test("Guild Chat completion hands off to Mission once and persists across reload", async ({ page }) => {
    await page.addInitScript(seedActivationState, { member: true });
    await enterGame(page);

    const finalGuide = page.getByText("ミッションを進めよう", { exact: true });
    await expect(finalGuide).toBeVisible();
    await expect(page.getByText("あとはミッションをこなしながらゲームを進めていこう", { exact: true })).toHaveCount(0);
    const cta = page.locator(".mypage-primary-cta");
    await expect(cta).toHaveText(/ミッションを進めよう/);
    await cta.click();

    await expect(page.getByRole("dialog", { name: "ミッション" })).toBeVisible();
    const milestoneCount = await page.evaluate(() => {
      const rows = JSON.parse(localStorage.getItem("mock_db_user_funnel_milestones") || "[]");
      return rows.filter((row: { milestone: string }) => row.milestone === "activation_mission_handoff").length;
    });
    expect(milestoneCount).toBe(1);

    await page.getByRole("button", { name: "閉じる" }).last().click();
    await expect(cta).toHaveCount(0);
    await page.reload();
    await resumeAfterReload(page);
    await expect(cta).toHaveCount(0);
  });

  test("unaffiliated and pending users receive the canonical Guild CTA", async ({ page }) => {
    await page.addInitScript(seedActivationState, { member: false, completed: true });
    await enterGame(page);
    await expect(page.locator(".mypage-primary-cta")).toHaveText(/ギルドに加入しよう/);

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
    await expect(homeCta).toHaveText(/ギルドに加入しよう/);
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
    await expect(homeCta).toHaveCount(0);

    await page.getByRole("button", { name: /ギルド/ }).click();
    await page.getByRole("button", { name: /ギルドを?脱退/, exact: true }).click();
    await page.getByRole("button", { name: "脱退する", exact: true }).click();
    const successOk = page.getByRole("button", { name: "OK", exact: true });
    if (await successOk.isVisible()) await successOk.click();
    await page.getByRole("button", { name: "マイページ" }).click();
    await expect(homeCta).toHaveText(/ギルドに加入しよう/);
  });

  test("completed joined Home never rotates rewards or route returns into the large CTA", async ({ page }) => {
    await page.addInitScript(seedActivationState, { member: true, completed: true, rewardAvailable: true });
    await enterGame(page);

    const cta = page.locator(".mypage-primary-cta");
    await expect(cta).toHaveCount(0);
    const missionButton = page.locator(".sub-icon-unit").filter({ hasText: "ミッション" });
    await expect(missionButton.locator(".small-badge-alert")).toHaveText("1");
    await expect(page.locator(".mypage-event-banner-area")).toBeVisible();

    await missionButton.evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByRole("dialog", { name: "ミッション" })).toBeVisible();
    await page.getByRole("button", { name: "閉じる" }).last().click();
    await expect(cta).toHaveCount(0);

    await page.getByRole("button", { name: /ギルド/ }).click();
    await page.getByRole("button", { name: "マイページ" }).click();
    await expect(cta).toHaveCount(0);

    await page.locator(".circle-menu-btn.fight").click();
    await page.getByRole("button", { name: "マイページ" }).click();
    await expect(cta).toHaveCount(0);

    await page.waitForTimeout(4_500);
    await expect(cta).toHaveCount(0);
    await expect(page.getByText("達成報酬を受け取る", { exact: true })).toHaveCount(0);
    await expect(page.getByText("レイドへ参加", { exact: true })).toHaveCount(0);
    await expect(page.getByText("クエストへ派遣", { exact: true })).toHaveCount(0);

    await page.reload();
    await resumeAfterReload(page);
    await expect(cta).toHaveCount(0);
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
        whiteSpace: getComputedStyle(node.querySelector("strong")!).whiteSpace,
      }));
      expect(geometry.width).toBeLessThanOrEqual(viewport.width);
      expect(geometry.height).toBeLessThanOrEqual(60);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.whiteSpace).toBe("nowrap");

      await page.evaluate(() => {
        const rows = JSON.parse(localStorage.getItem("mock_db_user_funnel_milestones") || "[]");
        rows.push({ user_id: localStorage.getItem("tribe_demo_uuid"), milestone: "activation_mission_handoff", occurrence_count: 1 });
        localStorage.setItem("mock_db_user_funnel_milestones", JSON.stringify(rows));
      });
      await page.reload();
      await resumeAfterReload(page);
      await expect(cta).toHaveCount(0);
      await expect(page.locator(".mypage-event-banner-area")).toBeVisible();
    });
  }
});
