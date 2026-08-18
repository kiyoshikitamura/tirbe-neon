import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(90_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("mock_db_gacha_masters", JSON.stringify([{
      id: "CHAR_NORMAL",
      name: "ノーマルガチャ",
      gacha_type: "CHARACTER",
      cost_cash: 1000,
      cost_diamond: 100,
      is_active: true,
    }]));
    localStorage.setItem("mock_db_gacha_items_master", JSON.stringify([
      { gacha_id: "CHAR_NORMAL", item_id: "char_go_01", rarity: "R", weight: 100 },
      { gacha_id: "CHAR_NORMAL", item_id: "char_kengo_01", rarity: "SR", weight: 100 },
      { gacha_id: "CHAR_SPECIAL", item_id: "char_ssr_01", rarity: "SSR", weight: 100 },
    ]));
    localStorage.setItem("mock_db_quests", JSON.stringify([{
      id: "q_shinjuku_short",
      name: "新宿: 見回り (短期)",
      duration_seconds: 60,
      cost_vitality: 5,
      cash_reward: 800,
      exp_reward: 120,
    }]));
    localStorage.setItem("mock_db_patrol_npcs", JSON.stringify([{
      id: "npc_tutorial",
      quest_id: "q_shinjuku_short",
      npc_name: "路地裏のならず者",
      enemy_data: { hp: 120, atk: 15, def: 5, spd: 40, luk: 1 },
    }]));
  });
});

async function enterNameRegistration(page: import("@playwright/test").Page) {
  await expect(page.getByText("ようこそ。まずはあなたの名前を教えて。")).toBeVisible();
  await page.getByRole("button", { name: "名前を決める" }).click();
  await expect(page.getByPlaceholder("プレイヤー名を入力")).toBeVisible();
}

async function revealTutorialTenPull(page: import("@playwright/test").Page) {
  const reveal = page.locator(".tutorial-gacha-reveal");
  await expect(reveal).toBeVisible({ timeout: 15_000 });
  for (let index = 0; index < 10; index += 1) await reveal.click();
}

async function completeRuleGuide(page: import("@playwright/test").Page) {
  await expect(page.getByRole("heading", { name: "街を進め" })).toBeVisible();
  await page.getByRole("button", { name: "次へ" }).click();
  await expect(page.getByRole("heading", { name: "仲間を強くしろ" })).toBeVisible();
  await page.getByRole("button", { name: "次へ" }).click();
  await expect(page.getByRole("heading", { name: "仲間とつながれ" })).toBeVisible();
  await page.getByRole("button", { name: "ミッションハブへ" }).click();
}

test("common app shell owns safe area through entry and tutorial overlay", async ({ page }) => {
  await page.goto("/");
  await page.locator("html").evaluate((root) => root.style.setProperty("--app-safe-top", "47px"));
  await expect(page.locator(".app-container")).toHaveCount(1);
  const titleMetrics = await page.locator(".app-container").evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    viewport: window.innerHeight,
    paddingTop: getComputedStyle(element).paddingTop,
    paddingBottom: getComputedStyle(element).paddingBottom,
  }));
  expect(titleMetrics.height).toBeLessThanOrEqual(titleMetrics.viewport);
  expect(Number.parseFloat(titleMetrics.paddingTop)).toBeGreaterThanOrEqual(47);

  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const titleCta = page.getByRole("button", { name: "TAP TO START" });
    await expect(titleCta).toHaveClass(/semantic-cta--primary/);
    await expect(titleCta).toHaveCSS("min-height", "50px");
    await page.screenshot({ path: test.info().outputPath(`m9-design-title-${width}.png`) });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText("TAP TO START").click();
  await expect(page.getByRole("button", { name: "はじめから" })).toHaveClass(/semantic-cta--primary/);
  await expect(page.getByRole("button", { name: "既存アカウントでログイン" })).toHaveClass(/semantic-cta--secondary/);
  await page.screenshot({ path: test.info().outputPath("m9-design-entry-390.png") });
  await page.getByRole("button", { name: "はじめから" }).click();
  await expect(page.locator(".game-start-transition")).toBeVisible();
  await expect(page.getByRole("button", { name: /準備中/ })).toHaveCount(0);
  await enterNameRegistration(page);
  await expect(page.getByRole("button", { name: "この名前で進む" })).toHaveClass(/semantic-cta--primary/);
  await page.screenshot({ path: test.info().outputPath("m9-design-registration-390.png") });
  await expect(page.locator(".app-container")).toHaveCount(1);
  await page.getByPlaceholder("プレイヤー名を入力").fill("境界確認");
  await page.getByRole("button", { name: "この名前で進む" }).click();
  await page.getByRole("button", { name: "この名前で始める" }).click();

  await expect(page.getByRole("dialog", { name: "TRIBE NEONへようこそ" })).toBeVisible();
  await expect(page.locator(".app-container .app-container")).toHaveCount(0);
  await expect(page.locator(".footer-mobile")).toHaveCount(0);
  const bounds = await page.locator(".tutorial-world").evaluate((overlay) => {
    const overlayRect = overlay.getBoundingClientRect();
    return { top: overlayRect.top, bottom: overlayRect.bottom, viewportHeight: innerHeight };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
  expect(titleMetrics.paddingTop).toBeDefined();
  expect(titleMetrics.paddingBottom).toBeDefined();
});

test("free gacha presents one CTA, feedback, result assets, and formation connection", async ({ page }) => {
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);
  await page.getByPlaceholder("プレイヤー名を入力").fill("ガチャ確認");
  await page.getByRole("button", { name: "この名前で進む" }).click();
  await page.getByRole("button", { name: "この名前で始める" }).click();
  await page.getByRole("button", { name: "無料10連ガチャへ" }).click();

  await expect(page.getByRole("heading", { name: "ガチャ" })).toBeVisible();
  await expect(page.getByText("STEP 1 / ノーマルガチャ")).toBeVisible();
  await expect(page.getByText("スペシャルガチャ")).toHaveCount(0);
  const enabledActions = page.locator(".gacha-view-root button:enabled");
  await expect(enabledActions).toHaveCount(1);
  await expect(enabledActions).toHaveAccessibleName("無料10連を引く");
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await page.locator(".gacha-view-root").evaluate((root) => {
      const cta = root.querySelector(".gacha-free-btn") as HTMLElement | null;
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        ctaHeight: cta?.getBoundingClientRect().height || 0,
      };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.ctaHeight).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: test.info().outputPath("m9-0c-gacha-430.png"), fullPage: true });

  const startedAt = Date.now();
  await enabledActions.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText(/ガチャ準備中|ガチャ実行中/)).toBeVisible();
  await expect(page.locator(".blocker-spinner")).toHaveCount(0);
  await revealTutorialTenPull(page);
  await expect(page.getByText("ガチャ結果")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".gacha-result-card")).toHaveCount(10);
  const elapsedMs = Date.now() - startedAt;
  test.info().annotations.push({ type: "gacha-result-ms", description: String(elapsedMs) });
  expect(elapsedMs).toBeLessThan(15_000);
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await page.locator(".gacha-result-panel").evaluate((modal) => {
      const rect = modal.getBoundingClientRect();
      const cards = Array.from(modal.querySelectorAll(".gacha-result-card"));
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        cardCount: cards.length,
        columnCount: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))).size,
        rowCount: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size,
      };
    });
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.top).toBeGreaterThanOrEqual(0);
    expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight);
    expect(metrics.cardCount).toBe(10);
    expect(metrics.columnCount).toBe(5);
    expect(metrics.rowCount).toBe(2);
    await page.screenshot({ path: test.info().outputPath(`m9-1-gacha-result-${width}.png`), fullPage: true });
  }
  await expect(page.locator(".gacha-result-card .character-presentation-thumbnail")).toHaveCount(9);
  await expect(page.locator(".gacha-result-card").filter({ hasText: "GEAR" })).toHaveCount(1);
  await expect(page.locator(".gacha-result-card .character-presentation img").first()).toBeVisible();
  const characterImage = await page.locator(".gacha-result-card .character-presentation img").first().evaluate((image) => {
    const rect = image.getBoundingClientRect();
    return { width: rect.width, height: rect.height, objectFit: getComputedStyle(image).objectFit, objectPosition: getComputedStyle(image).objectPosition };
  });
  expect(characterImage.width).toBeGreaterThanOrEqual(45);
  expect(characterImage.height).toBeGreaterThanOrEqual(45);
  expect(characterImage.objectFit).toBe("cover");
  expect(characterImage.objectPosition).toContain("8%");
  const resultBounds = await page.locator(".gacha-result-panel").evaluate((modal) => {
    const rect = modal.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  expect(resultBounds.left).toBeGreaterThanOrEqual(0);
  expect(resultBounds.right).toBeLessThanOrEqual(resultBounds.viewportWidth);
  expect(resultBounds.top).toBeGreaterThanOrEqual(0);
  expect(resultBounds.bottom).toBeLessThanOrEqual(resultBounds.viewportHeight);
  await page.screenshot({ path: test.info().outputPath("m9-0c-result-430.png"), fullPage: true });
  await page.getByRole("button", { name: "編成へ進む" }).click();

  await expect(page.getByRole("button", { name: "おすすめ編成で決定" })).toBeVisible();
  await expect(page.locator(".char-party-candidates .character-presentation-thumbnail").first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("m9-0c-formation-430.png"), fullPage: true });
  await expect.poll(async () => page.evaluate(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    return JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")
      .find((entry: any) => entry.user_id === userId)?.step_id;
  })).toBe("AUTO_FORMATION");

  await page.reload();
  if (await page.getByText("TAP TO START").isVisible()) await page.getByText("TAP TO START").click();
  await expect(page.getByRole("button", { name: "おすすめ編成で決定" })).toBeVisible();
});

test("formation advances directly to the quest boundary and resumes there", async ({ page }) => {
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);
  await page.getByPlaceholder("プレイヤー名を入力").fill("編成確認");
  await page.getByRole("button", { name: "この名前で進む" }).click();
  await page.getByRole("button", { name: "この名前で始める" }).click();
  await page.getByRole("button", { name: "無料10連ガチャへ" }).click();
  await page.getByRole("button", { name: "無料10連を引く" }).click();
  await revealTutorialTenPull(page);
  await expect(page.getByText("ガチャ結果")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "編成へ進む" }).click();

  const formationAction = page.getByRole("button", { name: "おすすめ編成で決定" });
  await expect(formationAction).toBeVisible();
  await expect(page.locator(".char-party-modal button:enabled")).toHaveCount(1);
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await page.locator(".char-party-modal").evaluate((modal) => {
      const action = modal.querySelector(".char-party-auto-btn") as HTMLElement | null;
      const rect = modal.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewportWidth: innerWidth, actionHeight: action?.getBoundingClientRect().height || 0 };
    });
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.actionHeight).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: test.info().outputPath("m9-0d-formation-430.png"), fullPage: true });
  await formationAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });

  await expect(page.getByText(/最初の派遣では/)).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    return JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")
      .find((entry: any) => entry.user_id === userId)?.step_id;
  })).toBe("DISPATCH");

  await page.reload();
  if (await page.getByText("TAP TO START").isVisible()) await page.getByText("TAP TO START").click();
  await expect(page.getByText(/最初の派遣では/)).toBeVisible();
  await expect(page.getByRole("button", { name: "おすすめ編成で決定" })).toHaveCount(0);
});

test("first quest connects dispatch, official battle, and one reward to the completion boundary", async ({ page }) => {
  const userId = "00000000-0000-4000-8000-000000000910";
  await page.addInitScript(({ userId }) => {
    if (sessionStorage.getItem("m9_0e_seeded") === "true") return;
    sessionStorage.setItem("m9_0e_seeded", "true");
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "ANONYMOUS");
    localStorage.setItem("mock_db_users", JSON.stringify([{ id: userId, username: "初戦確認", cash: 10000, vitality: 100, level: 1, xp: 0, current_base_id: "shinjuku" }]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{ id: `starter_${userId}`, user_id: userId, character_id: "11111111-1111-1111-1111-111111111111", level: 3, awakening_level: 0 }]));
    localStorage.setItem("mock_db_user_skills", JSON.stringify([
      { id: `skill_sr_${userId}`, user_id: userId, skill_card_id: "SKILL_021", equipped_character_id: `starter_${userId}`, slot_index: 0, plus_val: 0 },
      { id: `skill_ssr_${userId}`, user_id: userId, skill_card_id: "SKILL_036", equipped_character_id: `starter_${userId}`, slot_index: 1, plus_val: 0 },
    ]));
    localStorage.setItem("mock_db_skill_battle_master", JSON.stringify([
      { skill_id: "SKILL_021", display_name: "SR TEST BREAK", kind: "ATTACK", target: "ENEMY_SINGLE", power_percent: 160, cooldown: 2, initial_cooldown: 0, enabled: true },
      { skill_id: "SKILL_036", display_name: "SSR TEST BREAK", kind: "ATTACK", target: "ENEMY_SINGLE", power_percent: 240, cooldown: 3, initial_cooldown: 0, enabled: true },
    ]));
    localStorage.setItem("mock_db_pvp_defense_decks", JSON.stringify([{ id: `deck_${userId}`, user_id: userId, character_1_id: `starter_${userId}` }]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: userId, step_id: "DISPATCH" }]));
    localStorage.setItem("mock_db_user_patrols", "[]");
    localStorage.setItem("mock_db_battle_replay_sessions", "[]");
    localStorage.setItem("mock_db_presents", "[]");
  }, { userId });

  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await expect(page.getByText(/最初の仲間と派遣先は選択済み/)).toBeVisible();
  await expect(page.locator(".footer-mobile")).toHaveCount(0);
  await expect(page.locator(".quest-stage-track .is-current")).toContainText("派遣");
  await expect(page.locator(".patrol-char-item:not(.locked) .character-presentation-thumbnail").first()).toBeVisible();

  const questAction = page.getByRole("button", { name: "クエスト開始" });
  await expect(questAction).toBeEnabled();
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await page.locator(".patrol-container").evaluate((root) => {
      const action = root.querySelector(".tutorial-primary-target button") as HTMLElement | null;
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, actionHeight: action?.getBoundingClientRect().height || 0 };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.actionHeight).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: test.info().outputPath(`m9-1-quest-${width}.png`), fullPage: true });
  }
  const questStartedAt = Date.now();
  await questAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole("button", { name: "CASH時短（今回無料）" })).toBeVisible();
  await expect(page.locator(".quest-stage-track .is-current")).toContainText("無料時短");
  test.info().annotations.push({ type: "quest-start-ms", description: String(Date.now() - questStartedAt) });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_user_patrols") || "[]").length)).toBe(1);

  await page.reload();
  await page.getByText("TAP TO START").click();
  const instantAction = page.getByRole("button", { name: "CASH時短（今回無料）" });
  await expect(instantAction).toBeVisible();
  const instantStartedAt = Date.now();
  await instantAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText("初回バトル")).toBeVisible();
  await expect(page.locator(".quest-stage-track .is-current")).toContainText("バトル");
  test.info().annotations.push({ type: "quest-instant-ms", description: String(Date.now() - instantStartedAt) });
  const promptMetrics = await page.locator(".modal-card").filter({ hasText: "初回バトル" }).evaluate((modal) => {
    const action = modal.querySelector("button") as HTMLElement | null;
    const rect = modal.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewportWidth: innerWidth, actionHeight: action?.getBoundingClientRect().height || 0 };
  });
  expect(promptMetrics.left).toBeGreaterThanOrEqual(0);
  expect(promptMetrics.right).toBeLessThanOrEqual(promptMetrics.viewportWidth);
  expect(promptMetrics.actionHeight).toBeGreaterThanOrEqual(44);

  await page.reload();
  await page.getByText("TAP TO START").click();
  const battlePromptAction = page.getByRole("button", { name: "チュートリアルバトル開始" });
  await expect(battlePromptAction).toBeVisible();
  await battlePromptAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText("初回バトル準備")).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_battle_replay_sessions") || "[]").length)).toBe(1);

  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const setupMetrics = await page.locator(".setup-container").evaluate((setup) => {
      const cta = setup.querySelector(".start-battle-btn")?.getBoundingClientRect();
      return { scrollWidth: setup.scrollWidth, clientWidth: setup.clientWidth, ctaHeight: cta?.height || 0 };
    });
    expect(setupMetrics.scrollWidth).toBeLessThanOrEqual(setupMetrics.clientWidth + 1);
    expect(setupMetrics.ctaHeight).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: test.info().outputPath(`m9-battle-setup-${width}.png`), fullPage: true });
  }

  await page.getByRole("button", { name: "バトル開始" }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.locator(".playing-container")).toBeVisible();
  await expect(page.locator(".battle-log-box")).toHaveCount(0);
  await expect(page.locator(".battle-timeline-slot.is-current")).toBeVisible();
  await expect(page.locator(".battle-timeline-slot")).toHaveCount(4);
  await expect(page.locator(".battle-unit.is-actor").first()).toBeVisible();
  await expect(page.locator(".battle-unit.is-target").first()).toBeVisible();
  await expect(page.locator(".battle-action-sequence")).toBeVisible();
  await expect(page.locator(".battle-skill-cutin.is-ssr")).toBeVisible({ timeout: 8_000 });
  await expect(page.locator(".battle-cutin-copy")).toContainText("SSR TEST BREAK");
  await page.screenshot({ path: test.info().outputPath("m9-battle-ssr-cutin-1x-390.png"), fullPage: true });
  await page.getByRole("button", { name: "1x" }).click();
  await expect(page.getByRole("button", { name: "2x" })).toBeVisible();
  await expect(page.locator(".quest-battle-viewer")).toHaveAttribute("data-battle-speed", "2");
  // Freeze replay presentation while taking three viewport measurements. The
  // battle can otherwise finish between widths on a slower CI/dev asset load.
  await page.getByRole("button", { name: "一時停止" }).click();
  await expect(page.getByRole("button", { name: "再開" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource")
    .filter((entry) => entry.name.includes("/effects/")).length)).toBeGreaterThanOrEqual(7);
  const effectPerformance = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/effects/")) as PerformanceResourceTiming[];
    return {
      count: entries.length,
      totalDurationMs: Math.round(entries.reduce((total, entry) => total + entry.duration, 0)),
      maxDurationMs: Math.round(Math.max(...entries.map((entry) => entry.duration), 0)),
      transferBytes: entries.reduce((total, entry) => total + entry.transferSize, 0),
    };
  });
  console.log(`BATTLE_EFFECT_PERF ${JSON.stringify(effectPerformance)}`);
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const battleMetrics = await page.locator(".quest-battle-viewer").evaluate((viewer) => {
      const rect = viewer.getBoundingClientRect();
      const hp = viewer.querySelector(".battle-unit-hp")?.getBoundingClientRect();
      const partyArt = viewer.querySelector(".battle-unit-party .battle-unit-art")?.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewportWidth: innerWidth, hpWidth: hp?.width || 0, partyArtHeight: partyArt?.height || 0 };
    });
    expect(battleMetrics.left).toBeGreaterThanOrEqual(0);
    expect(battleMetrics.right).toBeLessThanOrEqual(battleMetrics.viewportWidth);
    expect(battleMetrics.hpWidth).toBeGreaterThan(20);
    expect(battleMetrics.partyArtHeight).toBeGreaterThanOrEqual(66);
    await page.screenshot({ path: test.info().outputPath(`m9-battle-first-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "再開" }).click();
  await expect(page.getByText("バトル結果")).toBeVisible({ timeout: 35_000 });
  await page.getByRole("button", { name: "クエスト結果へ" }).click();
  await expect(page.getByText(/確定した勝利報酬/)).toBeVisible();

  const rewardAction = page.getByRole("button", { name: "勝利報酬を獲得" });
  const rewardStartedAt = Date.now();
  await rewardAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText("クエスト完了報告")).toBeVisible();
  test.info().annotations.push({ type: "quest-reward-ms", description: String(Date.now() - rewardStartedAt) });
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const rewardMetrics = await page.locator(".patrol-reward-modal").evaluate((modal) => {
      const action = modal.querySelector("button") as HTMLElement | null;
      const rect = modal.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, actionHeight: action?.getBoundingClientRect().height || 0 };
    });
    expect(rewardMetrics.left).toBeGreaterThanOrEqual(0);
    expect(rewardMetrics.right).toBeLessThanOrEqual(rewardMetrics.viewportWidth);
    expect(rewardMetrics.top).toBeGreaterThanOrEqual(0);
    expect(rewardMetrics.bottom).toBeLessThanOrEqual(rewardMetrics.viewportHeight);
    expect(rewardMetrics.actionHeight).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: test.info().outputPath(`m9-1-reward-${width}.png`), fullPage: true });
  }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_presents") || "[]").filter((present: any) => String(present.id).startsWith("patrol_reward_")).length)).toBe(1);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("TUTORIAL_BATTLE");
  await page.screenshot({ path: test.info().outputPath("m9-0e-reward-430.png"), fullPage: true });

  await page.getByRole("button", { name: "報酬を確認して次へ" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("RULE_GUIDE");
  await expect(page.getByRole("heading", { name: "街を進め" })).toBeVisible();
});

test("claimed tutorial reward resumes at the completion boundary after reload", async ({ page }) => {
  const userId = "00000000-0000-4000-8000-000000000911";
  await page.addInitScript(({ userId }) => {
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "ANONYMOUS");
    localStorage.setItem("mock_db_users", JSON.stringify([{ id: userId, username: "報酬復帰", cash: 10000, vitality: 95, level: 1, xp: 120, current_base_id: "shinjuku" }]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{ id: `starter_${userId}`, user_id: userId, character_id: "11111111-1111-1111-1111-111111111111", level: 3, awakening_level: 0 }]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: userId, step_id: "TUTORIAL_BATTLE" }]));
    localStorage.setItem("mock_db_user_patrols", JSON.stringify([{
      id: "claimed_tutorial_patrol",
      user_id: userId,
      course_id: "q_shinjuku_short",
      character_id: "11111111-1111-1111-1111-111111111111",
      started_at: new Date(Date.now() - 120_000).toISOString(),
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      status: "COMPLETED",
      has_battle_event: false,
      battle_resolved: true,
      battle_result: "VICTORY",
    }]));
  }, { userId });

  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await expect(page.getByRole("heading", { name: "街を進め" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("RULE_GUIDE");
});

test("tutorial completion resumes through account save and exposes the Home next action", async ({ page }) => {
  const userId = "00000000-0000-4000-8000-000000000912";
  await page.addInitScript(({ userId }) => {
    localStorage.setItem("tribe_demo_uuid", userId);
    if (!localStorage.getItem("mock_db_users")) {
      localStorage.setItem("mock_auth_mode", "ANONYMOUS");
      localStorage.setItem("mock_db_users", JSON.stringify([{ id: userId, username: "完了復帰", cash: 10000, vitality: 95, level: 5, xp: 0, current_base_id: "shinjuku" }]));
      localStorage.setItem("mock_db_user_characters", JSON.stringify([{ id: `starter_${userId}`, user_id: userId, character_id: "11111111-1111-1111-1111-111111111111", level: 3, awakening_level: 0 }]));
      localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: userId, step_id: "RULE_GUIDE" }]));
    }
  }, { userId });

  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await expect(page.getByRole("heading", { name: "街を進め" })).toBeVisible();

  const completionMetrics = await page.locator(".modal-card").evaluate((modal) => {
    const action = modal.querySelector("button") as HTMLElement | null;
    const rect = modal.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, actionHeight: action?.getBoundingClientRect().height || 0 };
  });
  expect(completionMetrics.left).toBeGreaterThanOrEqual(0);
  expect(completionMetrics.right).toBeLessThanOrEqual(completionMetrics.viewportWidth);
  expect(completionMetrics.top).toBeGreaterThanOrEqual(0);
  expect(completionMetrics.bottom).toBeLessThanOrEqual(completionMetrics.viewportHeight);
  expect(completionMetrics.actionHeight).toBeGreaterThanOrEqual(44);

  await completeRuleGuide(page);
  await expect(page.getByText("ゲームデータを保存")).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("COMPLETE");

  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("COMPLETE");
  await page.getByText("TAP TO START").click();
  await expect(page.getByText("ゲームデータを保存")).toBeVisible();
  await page.getByPlaceholder("メールアドレス").fill("m9-f@example.com");
  await page.getByPlaceholder("パスワード（6文字以上）").fill("m9-f-preview-pass");
  await page.getByRole("button", { name: "メールアカウントを連携" }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });

  await expect(page.locator(".mypage-primary-cta")).toContainText("NEXT ACTION");
  await expect(page.locator(".mypage-primary-cta")).toContainText("最初のPvPへ挑戦");
  await expect(page.locator(".footer-mobile")).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("AUTHENTICATION");

  await page.reload();
  await page.getByText("TAP TO START").click();
  await expect(page.locator(".mypage-primary-cta")).toContainText("最初のPvPへ挑戦");
  await expect(page.getByText("ゲームデータを保存")).toBeHidden();
});

test("new mobile player completes the guided first session without footer navigation", async ({ page }) => {
  const timingStages = new Set<string>();
  page.on("console", (message) => {
    if (!message.text().includes("[M9 scout timing]")) return;
    const stage = message.args()[1]?.evaluate((value: any) => value?.stage).catch(() => null);
    void stage.then((value) => { if (value) timingStages.add(value); });
  });

  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();

  await enterNameRegistration(page);

  await expect(page.getByRole("heading", { name: "名前を教えて" })).toBeVisible();
  await page.getByPlaceholder("プレイヤー名を入力").fill("新宿ナイン");
  await page.getByRole("button", { name: "この名前で進む" }).click();
  await expect(page.getByText("プレイヤー名の確認")).toBeVisible();
  await page.getByRole("button", { name: "この名前で始める" }).click();

  await expect(page.getByRole("dialog", { name: "TRIBE NEONへようこそ" })).toBeVisible();
  await expect(page.locator(".footer-mobile")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "無料10連ガチャへ" })).toHaveClass(/semantic-cta--primary/);
  await page.getByRole("button", { name: "無料10連ガチャへ" }).click();

  await expect(page.getByText("STEP 1 / ノーマルガチャ")).toBeVisible();
  await expect(page.getByRole("button", { name: "無料10連を引く" })).toBeVisible();
  await expect(page.getByRole("button", { name: "無料10連を引く" })).toHaveClass(/semantic-cta--primary/);
  await page.getByRole("button", { name: "無料10連を引く" }).click();
  await revealTutorialTenPull(page);
  await expect(page.getByText("ガチャ結果")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "編成へ進む" })).toHaveClass(/semantic-cta--primary/);
  await page.getByRole("button", { name: "編成へ進む" }).click();

  await expect(page.getByRole("button", { name: "おすすめ編成で決定" })).toBeVisible();
  await expect(page.getByRole("button", { name: "おすすめ編成で決定" })).toHaveClass(/semantic-cta--primary/);
  await page.getByRole("button", { name: "おすすめ編成で決定" }).click();
  await expect(page.getByText(/最初の派遣では/)).toBeVisible();
  await expect(page.getByRole("button", { name: "クエスト開始" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "クエスト開始" })).toHaveClass(/variant-primary/);
  await page.getByRole("button", { name: "クエスト開始" }).click();
  await expect(page.getByRole("button", { name: "CASH時短（今回無料）" })).toBeVisible();
  await expect(page.getByRole("button", { name: "CASH時短（今回無料）" })).toHaveClass(/variant-primary/);
  await page.getByRole("button", { name: "CASH時短（今回無料）" }).click();

  await expect(page.getByText("初回バトル")).toBeVisible();
  await expect(page.getByRole("button", { name: "チュートリアルバトル開始" })).toHaveClass(/semantic-cta--primary/);
  await page.getByRole("button", { name: "チュートリアルバトル開始" }).click();
  await expect(page.getByText("初回バトル準備")).toBeVisible();
  await expect(page.getByRole("button", { name: "バトル開始" })).toHaveClass(/semantic-cta--primary/);
  await page.getByRole("button", { name: "バトル開始" }).click();
  await expect(page.getByText("バトル結果")).toBeVisible({ timeout: 35_000 });
  await expect(page.getByRole("button", { name: "クエスト結果へ" })).toHaveClass(/variant-primary/);
  await page.getByRole("button", { name: "クエスト結果へ" }).click();

  await expect(page.getByText(/確定した勝利報酬/)).toBeVisible();
  await expect(page.getByRole("button", { name: "勝利報酬を獲得" })).toHaveClass(/variant-primary/);
  await page.getByRole("button", { name: "勝利報酬を獲得" }).click();
  await expect(page.getByText("クエスト完了報告")).toBeVisible();
  await expect(page.getByRole("button", { name: "報酬を確認して次へ" })).toHaveClass(/variant-primary/);
  await page.getByRole("button", { name: "報酬を確認して次へ" }).click();
  await completeRuleGuide(page);
  await expect(page.getByText("クエスト完了報告")).toHaveCount(0);
  await page.waitForTimeout(750);
  await expect(page.getByText("クエスト完了報告")).toHaveCount(0);

  await expect(page.getByText("ゲームデータを保存")).toBeVisible();
  await page.getByPlaceholder("メールアドレス").fill("m9@example.com");
  await page.getByPlaceholder("パスワード（6文字以上）").fill("m9-preview-pass");
  await expect(page.getByRole("button", { name: "メールアカウントを連携" })).toHaveClass(/semantic-cta--primary/);
  await expect(page.getByRole("button", { name: "Googleアカウントを連携" })).toHaveClass(/semantic-cta--secondary/);
  await page.getByRole("button", { name: "メールアカウントを連携" }).click();
  await expect(page.locator(".mypage-primary-cta")).toBeVisible();
  await page.waitForTimeout(750);
  await expect(page.getByText("クエスト完了報告")).toHaveCount(0);
  await expect(page.locator(".mypage-primary-cta")).toHaveClass(/semantic-cta--primary/);
  await expect(page.locator(".mypage-primary-cta")).toContainText("最初のPvPへ挑戦");
  await expect(page.locator(".footer-mobile")).toBeVisible();
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const homeMetrics = await page.locator(".mypage-primary-cta").evaluate((cta) => ({
      right: cta.getBoundingClientRect().right,
      viewport: window.innerWidth,
      minHeight: cta.getBoundingClientRect().height,
    }));
    expect(homeMetrics.right).toBeLessThanOrEqual(homeMetrics.viewport);
    expect(homeMetrics.minHeight).toBeGreaterThanOrEqual(48);
    await page.screenshot({ path: test.info().outputPath(`m9-design-home-${width}.png`) });
  }

  await expect.poll(async () => page.evaluate(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    return JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")
      .find((entry: any) => entry.user_id === userId)?.step_id;
  })).toBe("AUTHENTICATION");

  await expect.poll(() => timingStages.has("tap") && timingStages.has("server_response") && timingStages.has("result_display")).toBe(true);
  const actionMetrics = await page.evaluate(() => (
    (window as typeof window & { __TRIBE_ACTION_METRICS__?: unknown[] }).__TRIBE_ACTION_METRICS__ || []
  ));
  test.info().annotations.push({ type: "action-performance", description: JSON.stringify(actionMetrics) });
});

test("growth preparation and step advancement resume idempotently after reload", async ({ page }) => {
  const userId = "00000000-0000-4000-8000-000000000909";
  await page.addInitScript(({ userId }) => {
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "ANONYMOUS");
    localStorage.setItem("mock_db_users", JSON.stringify([{ id: userId, username: "再開確認", cash: 10000, vitality: 100, current_base_id: "shinjuku" }]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{ id: `starter_${userId}`, user_id: userId, character_id: "11111111-1111-1111-1111-111111111111", level: 2, awakening_level: 0 }]));
    localStorage.setItem("mock_db_pvp_defense_decks", JSON.stringify([{ id: `deck_${userId}`, user_id: userId, character_1_id: `starter_${userId}` }]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: userId, step_id: "AUTO_FORMATION" }]));
    localStorage.setItem("mock_db_user_items", JSON.stringify([{ user_id: userId, item_id: "CHAR_EXP_S", quantity: 0 }]));
    localStorage.setItem("mock_db_user_funnel_milestones", JSON.stringify([{ user_id: userId, milestone: "first_growth", occurrence_count: 1 }]));
  }, { userId });

  await page.goto("/");
  await expect(page.getByText("TAP TO START")).toBeVisible();
  await page.getByText("TAP TO START").click();
  await expect(page.getByText(/最初の派遣では/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("TAP TO START")).toBeVisible();
  await page.getByText("TAP TO START").click();
  await expect(page.getByText(/最初の派遣では/)).toBeVisible();
  const result = await page.evaluate(() => ({
    step: JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id,
    quantity: JSON.parse(localStorage.getItem("mock_db_user_items") || "[]")[0]?.quantity,
  }));
  expect(result).toEqual({ step: "DISPATCH", quantity: 0 });
});
