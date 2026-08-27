import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(90_000);

const me = "00000000-0000-4000-8000-000000004001";
const openLeader = "00000000-0000-4000-8000-000000004011";
const approvalLeader = "00000000-0000-4000-8000-000000004012";
const openGuild = "30000000-0000-4000-8000-000000004001";
const approvalGuild = "30000000-0000-4000-8000-000000004002";

async function seedGuildVisitor(page: Page, level = 8) {
  await page.addInitScript(({ me, openLeader, approvalLeader, openGuild, approvalGuild, level }) => {
    if (sessionStorage.getItem("phase4_guild_seeded") === "1") return;
    sessionStorage.setItem("phase4_guild_seeded", "1");
    const now = new Date().toISOString();
    localStorage.setItem("tribe_demo_uuid", me);
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_db_users", JSON.stringify([
      { id: me, username: "Guild Visitor", level, cash: 10000, current_base_id: "shinjuku", last_active_at: now, favorite_character_id: "char_reiji_01" },
      { id: openLeader, username: "Open Leader", level: 20, cash: 10000, current_base_id: "shinjuku", last_active_at: now, favorite_character_id: "char_kengo_01", guild_id: openGuild },
      { id: approvalLeader, username: "Approval Leader", level: 18, cash: 10000, current_base_id: "shinjuku", last_active_at: now, favorite_character_id: "char_chang_01", guild_id: approvalGuild },
    ]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: me, step_id: "AUTHENTICATION" }]));
    localStorage.setItem("mock_db_user_account_auth_methods", JSON.stringify([{ user_id: me, auth_method: "EMAIL" }]));
    localStorage.setItem("mock_db_guilds", JSON.stringify([
      { id: openGuild, name: "OPEN NEON", leader_id: openLeader, level: 6, xp: 1200, member_limit: 10, recruitment_mode: "OPEN_JOIN", approval_required: false, description: "毎晩レイドへ挑戦しています。", main_alignment: "CHAOS" },
      { id: approvalGuild, name: "承認制ギルド", leader_id: approvalLeader, level: 5, xp: 900, member_limit: 10, recruitment_mode: "APPLICATION_REQUIRED", approval_required: true, description: "落ち着いて活動するギルドです。", main_alignment: "ORDER" },
      { id: "30000000-0000-4000-8000-000000004003", name: "FULL EDGE", leader_id: approvalLeader, level: 4, xp: 600, member_limit: 1, recruitment_mode: "OPEN_JOIN", approval_required: false, description: "満員です。", main_alignment: "ORDER" },
      { id: "30000000-0000-4000-8000-000000004004", name: "NIGHT LINK", leader_id: openLeader, level: 3, xp: 350, member_limit: 10, recruitment_mode: "OPEN_JOIN", approval_required: false, description: "初心者歓迎です。", main_alignment: "JUSTICE" },
    ]));
    localStorage.setItem("mock_db_guild_members", JSON.stringify([
      { id: "open-master", guild_id: openGuild, user_id: openLeader, role: "MASTER", joined_at: now },
      { id: "approval-master", guild_id: approvalGuild, user_id: approvalLeader, role: "MASTER", joined_at: now },
      { id: "full-master", guild_id: "30000000-0000-4000-8000-000000004003", user_id: approvalLeader, role: "MASTER", joined_at: now },
    ]));
    localStorage.setItem("mock_db_guild_join_requests", "[]");
    localStorage.setItem("mock_db_board_posts", "[]");
  }, { me, openLeader, approvalLeader, openGuild, approvalGuild, level });
}

async function enterGuild(page: Page) {
  await page.goto("/");
  const titleAction = page.getByRole("button", { name: "TAP TO START" });
  const continueAction = page.getByRole("button", { name: "続きから" });
  const header = page.locator(".header-mobile");
  await expect(titleAction.or(continueAction).or(header)).toBeVisible();
  if (await titleAction.isVisible()) await titleAction.click();
  if (await continueAction.isVisible()) await continueAction.click();
  await expect(header).toBeVisible();
  await page.getByRole("button", { name: "ギルド", exact: true }).click();
}

async function expectNoOverflow(page: Page, selector: string) {
  const geometry = await page.locator(selector).evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

test("unaffiliated discovery uses compact Japanese-first Guild presentation", async ({ page }) => {
  await seedGuildVisitor(page);
  await enterGuild(page);
  await expect(page.locator(".guild-lobby-hero")).toHaveCount(0);
  await expect(page.getByText("現在ギルドに所属していません")).toBeVisible();
  await expect(page.locator(".guild-lobby-guild-card")).toHaveCount(3);
  const creation = await page.locator(".guild-lobby-create").evaluate((element) => {
    const details = element as HTMLDetailsElement;
    return { open: details.open, ready: details.classList.contains("is-ready") };
  });
  expect(creation).toEqual({ open: false, ready: true });
  await expect(page.locator(".guild-activity-line").first()).toContainText("レイド貢献");
  await expect(page.locator(".guild-activity-line").first()).toContainText("総合力");
  await page.locator(".guild-detail-trigger").first().click();
  await expect(page.locator(".canonical-dialog")).toBeVisible();
  await expect(page.locator(".guild-public-status-grid")).toContainText("参加方法");
  await expect(page.locator(".guild-public-status-grid")).toContainText("空き枠");
  await expect(page.getByRole("button", { name: "Open Leaderのプロフィールを開く" })).toBeVisible();
  for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    await expectNoOverflow(page, ".canonical-dialog");
  }
});

test("direct join refreshes membership and opens persistent Guild Chat without reload", async ({ page }) => {
  await seedGuildVisitor(page);
  await enterGuild(page);
  await page.locator(".guild-detail-trigger").filter({ hasText: "OPEN NEON" }).click();
  await page.getByRole("button", { name: "このギルドに加入する" }).click();
  await expect(page.getByText("OPEN NEON", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "ギルドチャットを見る" }).click();
  await expect(page.getByPlaceholder("ギルドへ送信...")).toBeVisible();
  await page.getByPlaceholder("ギルドへ送信...").fill("参加しました。よろしくお願いします！");
  await page.getByRole("button", { name: "送信", exact: true }).click();
  await expect(page.locator(".tribe-msg-bubble")).toContainText("参加しました");
  await expect(page.locator(".tribe-msg-identity .character-presentation")).toBeVisible();
  const membership = await page.evaluate(({ me, openGuild }) => {
    const rows = JSON.parse(localStorage.getItem("mock_db_guild_members") || "[]");
    return rows.filter((row: any) => row.user_id === me && row.guild_id === openGuild);
  }, { me, openGuild });
  expect(membership).toHaveLength(1);
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.locator(".guild-main-container")).toBeVisible();
  await expect(page.locator(".guild-lobby-create")).toHaveCount(0);
  await expect(page.locator(".guild-membership-summary")).toContainText("あなたの役職：メンバー");
  await page.reload();
  const titleAction = page.getByRole("button", { name: "TAP TO START" });
  if (await titleAction.isVisible()) await titleAction.click();
  const continueAction = page.getByRole("button", { name: "続きから" });
  if (await continueAction.isVisible()) await continueAction.click();
  await page.getByRole("button", { name: "ギルド", exact: true }).click();
  await expect(page.locator(".guild-main-container")).toBeVisible();
  await page.getByRole("button", { name: "ギルドチャット" }).click();
  await expect(page.locator(".tribe-msg-bubble")).toContainText("参加しました");
  for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    await expectNoOverflow(page, ".tribe-modal-container-inner");
  }
});

test("approval request becomes pending and survives reload", async ({ page }) => {
  await seedGuildVisitor(page);
  await enterGuild(page);
  await page.getByPlaceholder("ギルド名で検索").fill("承認制ギルド");
  await page.getByRole("button", { name: "検索", exact: true }).click();
  await expect(page.locator(".guild-lobby-guild-card")).toHaveCount(1);
  await page.locator(".guild-detail-trigger").click();
  await page.getByRole("button", { name: "加入申請する" }).click();
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByRole("button", { name: "申請中（取消）" })).toBeVisible();
  await page.reload();
  const titleAction = page.getByRole("button", { name: "TAP TO START" });
  if (await titleAction.isVisible()) await titleAction.click();
  const continueAction = page.getByRole("button", { name: "続きから" });
  if (await continueAction.isVisible()) await continueAction.click();
  await page.getByRole("button", { name: "ギルド", exact: true }).click();
  await expect(page.getByRole("button", { name: "申請中（取消）" })).toBeVisible();
});
