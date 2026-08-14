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
      { gacha_id: "CHAR_NORMAL", item_id: "char_go_01", weight: 100 },
      { gacha_id: "CHAR_NORMAL", item_id: "char_kengo_01", weight: 100 },
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

  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);
  await expect(page.locator(".app-container")).toHaveCount(1);
  await page.getByPlaceholder("プレイヤー名を入力").fill("境界確認");
  await page.getByRole("button", { name: "入力内容を確認する" }).click();
  await page.getByRole("button", { name: "この名前で始める" }).click();

  await expect(page.getByText("最初の案内")).toBeVisible();
  await expect(page.locator(".app-container .app-container")).toHaveCount(0);
  await expect(page.locator(".footer-mobile")).toHaveCount(0);
  const bounds = await page.locator(".modal-overlay").evaluate((overlay) => {
    const overlayRect = overlay.getBoundingClientRect();
    const shellRect = document.querySelector(".app-container")!.getBoundingClientRect();
    return { top: overlayRect.top, bottom: overlayRect.bottom, shellTop: shellRect.top, shellBottom: shellRect.bottom };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.shellTop);
  expect(bounds.top).toBeGreaterThanOrEqual(47);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.shellBottom);
  expect(titleMetrics.paddingTop).toBeDefined();
  expect(titleMetrics.paddingBottom).toBeDefined();
});

test("free gacha presents one CTA, feedback, result assets, and formation connection", async ({ page }) => {
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);
  await page.getByPlaceholder("プレイヤー名を入力").fill("ガチャ確認");
  await page.getByRole("button", { name: "入力内容を確認する" }).click();
  await page.getByRole("button", { name: "この名前で始める" }).click();
  await page.getByRole("button", { name: "無料10連へ" }).click();

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
  await expect(page.getByText("ガチャ結果")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".modal-card .list-item")).toHaveCount(10);
  const elapsedMs = Date.now() - startedAt;
  test.info().annotations.push({ type: "gacha-result-ms", description: String(elapsedMs) });
  expect(elapsedMs).toBeLessThan(15_000);
  await expect(page.locator(".gacha-result-character").first()).toBeVisible();
  const characterImage = await page.locator(".gacha-result-character").first().evaluate((image) => {
    const rect = image.getBoundingClientRect();
    return { width: rect.width, height: rect.height, objectFit: getComputedStyle(image).objectFit };
  });
  expect(characterImage.width).toBeGreaterThanOrEqual(70);
  expect(characterImage.height).toBeGreaterThanOrEqual(80);
  expect(characterImage.objectFit).toBe("cover");
  const resultBounds = await page.locator(".modal-card").filter({ hasText: "ガチャ結果" }).evaluate((modal) => {
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

test("formation connects to one safe growth action and resumes at the quest boundary", async ({ page }) => {
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);
  await page.getByPlaceholder("プレイヤー名を入力").fill("強化確認");
  await page.getByRole("button", { name: "入力内容を確認する" }).click();
  await page.getByRole("button", { name: "この名前で始める" }).click();
  await page.getByRole("button", { name: "無料10連へ" }).click();
  await page.getByRole("button", { name: "無料10連を引く" }).click();
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

  await expect(page.getByText(/経験の書\(S\)を使って、1回レベルアップ/)).toBeVisible();
  const growthAction = page.getByRole("button", { name: /レベルアップ/ });
  await expect(growthAction).toBeVisible();
  await expect(page.locator(".tutorial-character-step button:enabled")).toHaveCount(1);
  await expect(page.getByText(/経験の書\(S\) 1 \/ CASH/)).toBeVisible();

  await page.reload();
  if (await page.getByText("TAP TO START").isVisible()) await page.getByText("TAP TO START").click();
  await expect(page.getByText(/経験の書\(S\)を使って、1回レベルアップ/)).toBeVisible();
  await expect(page.getByRole("button", { name: "おすすめ編成で決定" })).toHaveCount(0);

  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await page.locator(".char-bottom-modal-sheet").evaluate((sheet) => {
      const action = sheet.querySelector(".char-upgrade-btn") as HTMLElement | null;
      const rect = sheet.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewportWidth: innerWidth,
        actionHeight: action?.getBoundingClientRect().height || 0,
      };
    });
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.actionHeight).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: test.info().outputPath("m9-0d-growth-430.png"), fullPage: true });

  const before = await page.evaluate(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    return JSON.parse(localStorage.getItem("mock_db_user_characters") || "[]")
      .filter((entry: any) => entry.user_id === userId)
      .reduce((total: number, entry: any) => total + Number(entry.level || 0), 0);
  });
  await growthAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });

  await expect(page.getByRole("heading", { name: "強化完了" })).toBeVisible();
  await expect(page.locator(".outlaw-confirm-dialog button:visible")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "クエストへ進む" })).toBeEnabled();
  const resultMetrics = await page.locator(".outlaw-confirm-dialog").evaluate((dialog) => {
    const action = dialog.querySelector("button") as HTMLElement | null;
    const rect = dialog.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, actionHeight: action?.getBoundingClientRect().height || 0 };
  });
  expect(resultMetrics.left).toBeGreaterThanOrEqual(0);
  expect(resultMetrics.right).toBeLessThanOrEqual(resultMetrics.viewportWidth);
  expect(resultMetrics.top).toBeGreaterThanOrEqual(0);
  expect(resultMetrics.bottom).toBeLessThanOrEqual(resultMetrics.viewportHeight);
  expect(resultMetrics.actionHeight).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: test.info().outputPath("m9-0d-growth-result-430.png"), fullPage: true });

  await expect.poll(async () => page.evaluate(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    const progress = JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")
      .find((entry: any) => entry.user_id === userId);
    const levelTotal = JSON.parse(localStorage.getItem("mock_db_user_characters") || "[]")
      .filter((entry: any) => entry.user_id === userId)
      .reduce((total: number, entry: any) => total + Number(entry.level || 0), 0);
    const material = JSON.parse(localStorage.getItem("mock_db_user_items") || "[]")
      .find((entry: any) => entry.user_id === userId && entry.item_id === "CHAR_EXP_S");
    const milestone = JSON.parse(localStorage.getItem("mock_db_user_funnel_milestones") || "[]")
      .find((entry: any) => entry.user_id === userId && entry.milestone === "first_growth");
    return { step: progress?.step_id, level: levelTotal, material: Number(material?.quantity || 0), growthCount: Number(milestone?.occurrence_count || 0) };
  })).toEqual({ step: "DISPATCH", level: before + 1, material: 0, growthCount: 1 });

  await page.getByRole("button", { name: "クエストへ進む" }).click();
  await expect(page.getByText(/最初の派遣では/)).toBeVisible();
  await page.reload();
  if (await page.getByText("TAP TO START").isVisible()) await page.getByText("TAP TO START").click();
  await expect(page.getByText(/最初の派遣では/)).toBeVisible();
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
  }
  await questAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole("button", { name: "CASH時短（今回無料）" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_user_patrols") || "[]").length)).toBe(1);

  await page.reload();
  await page.getByText("TAP TO START").click();
  const instantAction = page.getByRole("button", { name: "CASH時短（今回無料）" });
  await expect(instantAction).toBeVisible();
  await instantAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText("初回バトル")).toBeVisible();
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
    const setup = await page.locator(".setup-container").evaluate((root) => {
      const action = root.querySelector(".start-battle-btn") as HTMLElement | null;
      const rect = root.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewportWidth: innerWidth, actionHeight: action?.getBoundingClientRect().height || 0 };
    });
    expect(setup.left).toBeGreaterThanOrEqual(0);
    expect(setup.right).toBeLessThanOrEqual(setup.viewportWidth);
    expect(setup.actionHeight).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: test.info().outputPath("m9-0e-battle-setup-430.png"), fullPage: true });

  await page.getByRole("button", { name: "バトル開始" }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText("バトル結果")).toBeVisible({ timeout: 35_000 });
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText(/確定した勝利報酬/)).toBeVisible();

  const rewardAction = page.getByRole("button", { name: "勝利報酬を獲得" });
  await rewardAction.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText("クエスト完了報告")).toBeVisible();
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
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_presents") || "[]").filter((present: any) => String(present.id).startsWith("patrol_reward_")).length)).toBe(1);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("RULE_GUIDE");
  await page.screenshot({ path: test.info().outputPath("m9-0e-reward-430.png"), fullPage: true });

  await page.getByRole("button", { name: "報酬を確認して次へ" }).click();
  await expect(page.getByText("チュートリアル完了")).toBeVisible();
  await expect(page.getByRole("button", { name: "ホームへ" })).toBeVisible();
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
  await expect(page.getByText("チュートリアル完了")).toBeVisible();
  await expect(page.getByRole("button", { name: "ホームへ" })).toBeVisible();
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
  await expect(page.getByText("チュートリアル完了")).toBeVisible();

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

  await page.getByRole("button", { name: "ホームへ" }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
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

  await expect(page.getByText("プレイヤー登録")).toBeVisible();
  await page.getByPlaceholder("プレイヤー名を入力").fill("新宿ナイン");
  await page.getByRole("button", { name: "入力内容を確認する" }).click();
  await expect(page.getByText("プレイヤー名の確認")).toBeVisible();
  await page.getByRole("button", { name: "この名前で始める" }).click();

  await expect(page.getByText("最初の案内")).toBeVisible();
  await expect(page.locator(".footer-mobile")).toHaveCount(0);
  await page.getByRole("button", { name: "無料10連へ" }).click();

  await expect(page.getByText("STEP 1 / ノーマルガチャ")).toBeVisible();
  await expect(page.getByRole("button", { name: "無料10連を引く" })).toBeVisible();
  await page.getByRole("button", { name: "無料10連を引く" }).click();
  await expect(page.getByText("ガチャ結果")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "編成へ進む" }).click();

  await expect(page.getByRole("button", { name: "おすすめ編成で決定" })).toBeVisible();
  await page.getByRole("button", { name: "おすすめ編成で決定" }).click();
  await expect(page.getByText(/経験の書\(S\)を使って/)).toBeVisible();
  await page.getByRole("button", { name: /レベルアップ/ }).click();
  await expect(page.getByText("強化完了")).toBeVisible();
  await page.getByRole("button", { name: "クエストへ進む" }).click();

  await expect(page.getByText(/最初の派遣では/)).toBeVisible();
  await expect(page.getByRole("button", { name: "クエスト開始" })).toBeEnabled();
  await page.getByRole("button", { name: "クエスト開始" }).click();
  await expect(page.getByRole("button", { name: "CASH時短（今回無料）" })).toBeVisible();
  await page.getByRole("button", { name: "CASH時短（今回無料）" }).click();

  await expect(page.getByText("初回バトル")).toBeVisible();
  await page.getByRole("button", { name: "チュートリアルバトル開始" }).click();
  await expect(page.getByText("初回バトル準備")).toBeVisible();
  await page.getByRole("button", { name: "バトル開始" }).click();
  await expect(page.getByText("バトル結果")).toBeVisible({ timeout: 35_000 });
  await page.getByRole("button", { name: "OK" }).click();

  await expect(page.getByText(/確定した勝利報酬/)).toBeVisible();
  await page.getByRole("button", { name: "勝利報酬を獲得" }).click();
  await expect(page.getByText("クエスト完了報告")).toBeVisible();
  await page.getByRole("button", { name: "報酬を確認して次へ" }).click();
  await expect(page.getByText("チュートリアル完了")).toBeVisible();
  await page.getByRole("button", { name: "ホームへ" }).click();

  await expect(page.getByText("ゲームデータを保存")).toBeVisible();
  await page.getByPlaceholder("メールアドレス").fill("m9@example.com");
  await page.getByPlaceholder("パスワード（6文字以上）").fill("m9-preview-pass");
  await page.getByRole("button", { name: "メールアカウントを連携" }).click();
  await expect(page.locator(".mypage-primary-cta")).toBeVisible();
  await expect(page.locator(".mypage-primary-cta")).toContainText("最初のPvPへ挑戦");
  await expect(page.locator(".footer-mobile")).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    return JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")
      .find((entry: any) => entry.user_id === userId)?.step_id;
  })).toBe("AUTHENTICATION");

  await expect.poll(() => timingStages.has("tap") && timingStages.has("server_response") && timingStages.has("result_display")).toBe(true);
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
