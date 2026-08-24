import { expect, test } from "@playwright/test";

async function enterNameRegistration(page: import("@playwright/test").Page) {
  await expect(page.locator('[data-entry-state="WORLD_INFORMATION"]')).toBeVisible();
  await expect(page.locator('[data-world-stage="4"] .setup-world-tap')).toBeVisible({ timeout: 30_000 });
  await page.locator(".setup-world-tap").click();
  await expect(page.locator('[data-entry-state="AGEHA_INTRO"]')).toBeVisible();
  await page.locator(".setup-ageha-presentation .setup-primary-action").click();
  await expect(page.locator('[data-entry-state="NAME_INPUT"]')).toBeVisible();
  await expect(page.getByPlaceholder("プレイヤー名を入力")).toBeVisible();
}

async function seedCompletedAnonymous(page: import("@playwright/test").Page, confirmationRequired = false) {
  await page.addInitScript(({ confirmationRequired }) => {
    if (localStorage.getItem("m1_completed_anonymous_seeded") === "true") return;
    localStorage.setItem("m1_completed_anonymous_seeded", "true");
    const userId = "00000000-0000-4000-8000-000000000099";
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "ANONYMOUS");
    if (confirmationRequired) localStorage.setItem("mock_email_confirmation_required", "true");
    localStorage.setItem("mock_db_users", JSON.stringify([{
      id: userId,
      username: "認証待ち",
      current_base_id: "neon_tower",
      favorite_character_id: "char_reiji_01",
    }]));
    localStorage.setItem("mock_db_user_characters", JSON.stringify([{
      id: `starter_${userId}`,
      user_id: userId,
      character_id: "char_reiji_01",
      level: 1,
      awakening_level: 0,
    }]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: userId, step_id: "COMPLETE" }]));
  }, { confirmationRequired });
}

test("title screen opens the authentication menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("TAP TO START")).toBeVisible();
  await expect(page.locator(".title-logo-text")).toHaveCount(0);
  await expect(page.locator(".title-view-container")).toHaveCSS("background-image", /branding\/title-key-visual\.png/);
  await expect(page.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/legal/terms");
  await expect(page.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute("href", "/legal/privacy");
  await expect(page.getByRole("link", { name: "特定商取引法に基づく表記" })).toHaveAttribute("href", "/legal/commercial");

  await page.getByText("TAP TO START").click();

  await page.getByRole("button", { name: "既存アカウントでログイン" }).click();

  await expect(page.getByText("TRIBE NEON")).toBeVisible();
  await expect(page.getByRole("button", { name: "Googleで始める" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Googleで始める" })).toHaveClass(/semantic-cta--primary/);
});

test("authentication menu opens the email login form", async ({ page }) => {
  await page.goto("/");
  const tapToStart = page.getByText("TAP TO START");
  await expect(tapToStart).toBeVisible();
  await tapToStart.click();

  await page.getByRole("button", { name: "既存アカウントでログイン" }).click();

  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("a new player explicitly creates an anonymous session before name setup", async ({ page }) => {
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);

  await expect(page.getByRole("heading", { name: "プレイヤー名" })).toBeVisible();
  await expect(page.getByPlaceholder("プレイヤー名を入力")).toBeVisible();
  await expect(page.locator(".setup-invite-details")).toHaveCount(0);
  await expect(page.getByPlaceholder("8文字の招待コード")).toHaveCount(0);
  const nameInputMetrics = await page.getByPlaceholder("プレイヤー名を入力").evaluate((input) => {
    const rect = input.getBoundingClientRect();
    return { fontSize: Number.parseFloat(getComputedStyle(input).fontSize), height: rect.height };
  });
  expect(nameInputMetrics.fontSize).toBeGreaterThanOrEqual(16);
  expect(nameInputMetrics.height).toBeGreaterThanOrEqual(52);
});

test("an invitation URL carries its code without adding a primary form field", async ({ page }) => {
  await page.goto("/?invite=AB12CD34&utm_source=x");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);

  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByPlaceholder("8文字の招待コード")).toHaveCount(0);
});

test("an authenticated Google user without game data cannot enter anonymous name setup", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tribe_demo_uuid", "00000000-0000-4000-8000-000000000777");
    localStorage.setItem("mock_auth_mode", "GOOGLE");
  });
  await page.goto("/");
  await page.getByText("TAP TO START").click();

  await expect(page.getByText(/このGoogleアカウントにはゲームデータがありません/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "プレイヤー名" })).toBeHidden();

  await page.locator(".title-entry-primary").click();
  await enterNameRegistration(page);
  await expect(page.getByRole("heading", { name: "プレイヤー名" })).toBeVisible();
  await expect(page.getByPlaceholder("プレイヤー名を入力")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("mock_auth_mode"))).toBe("ANONYMOUS");
});

test("name-only initialization is idempotent and resumes the tutorial after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);
  await page.getByPlaceholder("プレイヤー名を入力").fill("新宿太郎");
  await page.getByRole("button", { name: "この名前で始める" }).evaluate((button: HTMLButtonElement) => {
    // Simulate a rapid duplicate submission before React can repaint the
    // disabled state. Initialization must still create one profile/progress row;
    // characters are granted later by the authoritative tutorial gacha.
    button.click();
    button.click();
  });

  await expect(page.getByRole("dialog", { name: "アゲハからの案内" })).toBeVisible();
  const storedCounts = await page.evaluate(() => ({
    users: JSON.parse(localStorage.getItem("mock_db_users") || "[]").length,
    characters: JSON.parse(localStorage.getItem("mock_db_user_characters") || "[]").length,
    progress: JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]").length,
  }));
  expect(storedCounts).toEqual({ users: 1, characters: 0, progress: 1 });

  await page.reload();
  await page.getByText("TAP TO START").waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (await page.getByText("TAP TO START").isVisible()) await page.getByText("TAP TO START").click();
  await expect(page.getByRole("dialog", { name: "アゲハからの案内" })).toBeVisible();
  const reloadedCounts = await page.evaluate(() => ({
    users: JSON.parse(localStorage.getItem("mock_db_users") || "[]").length,
    characters: JSON.parse(localStorage.getItem("mock_db_user_characters") || "[]").length,
    progress: JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]").length,
  }));
  expect(reloadedCounts).toEqual(storedCounts);
});

test("name-only initialization rejects a normalized duplicate username", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("mock_db_users", JSON.stringify([{ id: "other-user", username: "NEON" }]));
  });
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);
  await page.getByPlaceholder("プレイヤー名を入力").fill(" neon ");
  await page.setViewportSize({ width: 390, height: 844 });
  const beforeErrorHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.getByRole("button", { name: "この名前で始める" }).click();

  await expect(page.getByText("このユーザー名は既に使用されています。")).toBeVisible();
  await expect(page.locator('[data-entry-state="NAME_INPUT"]')).toBeVisible();
  await expect(page.getByPlaceholder("プレイヤー名を入力")).toHaveValue(" neon ");
  const errorGeometry = await page.getByRole("alertdialog", { name: "エラー" }).evaluate((modal) => {
    const rect = modal.getBoundingClientRect();
    return {
      centerDelta: Math.abs((rect.top + rect.height / 2) - window.innerHeight / 2),
      documentHeight: document.documentElement.scrollHeight,
    };
  });
  expect(errorGeometry.centerDelta).toBeLessThan(2);
  expect(errorGeometry.documentHeight).toBe(beforeErrorHeight);
  await page.getByRole("button", { name: "閉じる" }).click();
  await page.getByPlaceholder("プレイヤー名を入力").fill("NEON2");
  await page.getByRole("button", { name: "この名前で始める" }).click();
  await expect(page.getByRole("dialog", { name: "アゲハからの案内" })).toBeVisible();
  await expect(page.getByText("このユーザー名は既に使用されています。")).toHaveCount(0);
  await page.waitForTimeout(350);
  await expect(page.getByText("このユーザー名は既に使用されています。")).toHaveCount(0);
});

test("tutorial gacha failure overlays the intact offer and remains retryable", async ({ page }) => {
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "はじめから" }).click();
  await enterNameRegistration(page);
  await page.getByPlaceholder("プレイヤー名を入力").fill("失敗確認");
  await page.getByRole("button", { name: "この名前で始める" }).click();
  await page.getByRole("button", { name: "次へ" }).click();
  await page.evaluate(() => localStorage.setItem("mock_tutorial_gacha_error", "true"));
  await page.getByRole("button", { name: "無料10連を引く" }).click();

  await expect(page.getByText("ガチャの実行に失敗しました。通信状態を確認して、もう一度お試しください。")).toBeVisible();
  await expect(page.locator(".tutorial-gacha-page")).toBeVisible();
  await expect(page.locator(".gacha-presentation-stage, .tutorial-gacha-reveal")).toHaveCount(0);
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("button", { name: "無料10連を引く" })).toBeEnabled();
});

test("email linking keeps the anonymous user id and completes onboarding once", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await expect(page.getByText("ゲームデータを保存")).toBeVisible();
  await page.getByPlaceholder("メールアドレス").fill("new@example.com");
  await page.getByPlaceholder("パスワード（6文字以上）").fill("secure-pass-123");
  await page.getByRole("button", { name: "メールアカウントを連携" }).click();

  await expect(page.getByText("ゲームデータを保存")).toBeHidden();
  const state = await page.evaluate(() => ({
    userId: localStorage.getItem("tribe_demo_uuid"),
    progress: JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]"),
    methods: JSON.parse(localStorage.getItem("mock_db_user_account_auth_methods") || "[]"),
  }));
  expect(state.userId).toBe("00000000-0000-4000-8000-000000000099");
  expect(state.progress).toEqual([{ user_id: state.userId, step_id: "AUTHENTICATION" }]);
  expect(state.methods).toEqual([{ user_id: state.userId, auth_method: "EMAIL" }]);
});

test("email confirmation wait survives reload and finalizes after the callback session", async ({ page }) => {
  await seedCompletedAnonymous(page, true);
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByPlaceholder("メールアドレス").fill("confirm@example.com");
  await page.getByPlaceholder("パスワード（6文字以上）").fill("secure-pass-123");
  await page.getByRole("button", { name: "メールアカウントを連携" }).click();

  await expect(page.getByRole("status")).toContainText("確認メールを confirm@example.com に送信しました");
  await page.reload();
  await page.getByText("TAP TO START").waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (await page.getByText("TAP TO START").isVisible()) await page.getByText("TAP TO START").click();
  await expect(page.getByRole("status")).toContainText("確認メールを confirm@example.com に送信しました");

  await page.evaluate(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.removeItem("mock_pending_email");
    localStorage.removeItem("mock_email_confirmation_required");
    localStorage.setItem("mock_db_auth_identities", JSON.stringify([{ user_id: userId, provider: "email", email: "confirm@example.com" }]));
  });
  await page.reload();
  await page.getByText("TAP TO START").waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
  if (await page.getByText("TAP TO START").isVisible()) await page.getByText("TAP TO START").click();
  await expect(page.getByRole("status")).toContainText("メール確認が完了しました");
  await page.getByPlaceholder("パスワード（6文字以上）").fill("secure-pass-123");
  await page.getByRole("button", { name: "パスワードを設定して完了" }).click();
  await expect(page.getByText("ゲームデータを保存")).toBeHidden();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("AUTHENTICATION");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("tribe_onboarding_email_intent"))).toBeNull();
});

test("email linking rejects an identity owned by another account without merging data", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.addInitScript(() => {
    localStorage.setItem("mock_db_auth_identities", JSON.stringify([{ user_id: "other-user", provider: "email", email: "used@example.com" }]));
  });
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByPlaceholder("メールアドレス").fill("used@example.com");
  await page.getByPlaceholder("パスワード（6文字以上）").fill("secure-pass-123");
  await page.getByRole("button", { name: "メールアカウントを連携" }).click();

  await expect(page.getByText(/このメールアドレスは既存アカウントで使用されています/)).toBeVisible();
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]"));
  expect(progress[0].step_id).toBe("COMPLETE");
});

test("Google linking keeps the anonymous user id and completes onboarding once", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "Googleアカウントを連携" }).click();

  await expect(page.getByText("ゲームデータを保存")).toBeHidden();
  const state = await page.evaluate(() => ({
    userId: localStorage.getItem("tribe_demo_uuid"),
    intent: localStorage.getItem("tribe_onboarding_auth_intent"),
    progress: JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]"),
    methods: JSON.parse(localStorage.getItem("mock_db_user_account_auth_methods") || "[]"),
  }));
  expect(state.userId).toBe("00000000-0000-4000-8000-000000000099");
  expect(state.intent).toBeNull();
  expect(state.progress).toEqual([{ user_id: state.userId, step_id: "AUTHENTICATION" }]);
  expect(state.methods).toEqual([{ user_id: state.userId, auth_method: "GOOGLE" }]);
});

test("Google OAuth redirect resumes with the same anonymous user id", async ({ page }) => {
  test.setTimeout(60_000);
  await seedCompletedAnonymous(page);
  await page.addInitScript(() => localStorage.setItem("mock_google_redirect_required", "true"));
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "Googleアカウントを連携" }).click();

  const intent = await page.evaluate(() => JSON.parse(localStorage.getItem("tribe_onboarding_auth_intent") || "null"));
  expect(intent).toMatchObject({ method: "GOOGLE", userId: "00000000-0000-4000-8000-000000000099" });

  await page.evaluate(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    localStorage.setItem("mock_auth_mode", "GOOGLE");
    localStorage.removeItem("mock_google_redirect_required");
    localStorage.setItem("mock_db_auth_identities", JSON.stringify([{ user_id: userId, provider: "google" }]));
  });
  await page.reload();

  await expect(page.getByText("TAP TO START")).toBeHidden();
  await expect(page.getByText("ゲームデータを保存")).toBeHidden();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]")[0]?.step_id)).toBe("AUTHENTICATION");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("tribe_onboarding_auth_intent"))).toBeNull();
});

test("existing Google login returns directly to the game without the war-entry dialog", async ({ page }) => {
  await page.addInitScript(() => {
    const userId = "00000000-0000-4000-8000-000000000099";
    localStorage.setItem("tribe_demo_uuid", userId);
    localStorage.setItem("mock_auth_mode", "GOOGLE");
    localStorage.setItem("tribe_existing_google_login_intent", JSON.stringify({ startedAt: Date.now() }));
    localStorage.setItem("mock_db_users", JSON.stringify([{
      id: userId,
      username: "Google Player",
      current_base_id: "neon_tower",
      favorite_character_id: "char_reiji_01",
    }]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{
      user_id: userId,
      step_id: "AUTHENTICATION",
    }]));
    localStorage.setItem("mock_db_user_account_auth_methods", JSON.stringify([{
      user_id: userId,
      auth_method: "GOOGLE",
    }]));
  });

  await page.goto("/");

  await expect(page.getByText("TAP TO START")).toBeHidden();
  await expect(page.locator(".header-mobile")).toBeVisible();
  await expect(page.getByRole("button", { name: "抗争に参入する" })).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("tribe_existing_google_login_intent"))).toBeNull();
});

test("Google linking rejects an identity owned by another account without merging data", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.addInitScript(() => localStorage.setItem("mock_google_identity_collision", "true"));
  await page.goto("/");
  await page.getByText("TAP TO START").click();
  await page.getByRole("button", { name: "Googleアカウントを連携" }).click();

  await expect(page.getByText(/このGoogleアカウントは既存アカウントで使用されています/)).toBeVisible();
  const state = await page.evaluate(() => ({
    mode: localStorage.getItem("mock_auth_mode"),
    intent: localStorage.getItem("tribe_onboarding_auth_intent"),
    progress: JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]"),
  }));
  expect(state.mode).toBe("ANONYMOUS");
  expect(state.intent).toBeNull();
  expect(state.progress[0].step_id).toBe("COMPLETE");
});

test("Google OAuth cancellation returns to onboarding and can be retried", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.goto("/?error=access_denied&error_description=cancelled");
  await page.getByText("TAP TO START").click();

  await expect(page.getByText("Google連携はキャンセルされました。もう一度お試しください。")).toBeVisible();
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "Googleアカウントを連携" }).click();
  await expect(page.getByText("ゲームデータを保存")).toBeHidden();
});

test("two supported identities cannot complete tutorial authentication", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.addInitScript(() => {
    localStorage.setItem("mock_auth_mode", "GOOGLE");
    localStorage.setItem("mock_session_identity_providers", JSON.stringify(["email", "google"]));
  });
  await page.goto("/");
  await page.getByText("TAP TO START").click();

  await expect(page.getByText("メールとGoogleの両方が検出されました。データ保護のため認証完了を中止しました。")).toBeVisible();
  const state = await page.evaluate(() => ({
    progress: JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]"),
    methods: JSON.parse(localStorage.getItem("mock_db_user_account_auth_methods") || "[]"),
  }));
  expect(state.progress[0].step_id).toBe("COMPLETE");
  expect(state.methods).toEqual([]);
});

test("a completed account with two auth methods is blocked on revisit", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.addInitScript(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    localStorage.setItem("mock_auth_mode", "EMAIL");
    localStorage.setItem("mock_session_identity_providers", JSON.stringify(["email", "google"]));
    localStorage.setItem("mock_db_tutorial_progress", JSON.stringify([{ user_id: userId, step_id: "AUTHENTICATION" }]));
    localStorage.setItem("mock_db_user_account_auth_methods", JSON.stringify([{ user_id: userId, auth_method: "EMAIL" }]));
  });
  await page.goto("/");

  await expect(page.getByText("アカウント認証エラー")).toBeVisible();
  await expect(page.getByText(/ゲームデータへのアクセスを停止しました/)).toBeVisible();
  await expect(page.getByRole("button", { name: "ログアウトして戻る" })).toBeVisible();
});

test("switching from a recorded email method to Google is refused", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.addInitScript(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    localStorage.setItem("mock_auth_mode", "GOOGLE");
    localStorage.setItem("mock_session_identity_providers", JSON.stringify(["google"]));
    localStorage.setItem("mock_db_user_account_auth_methods", JSON.stringify([{ user_id: userId, auth_method: "EMAIL" }]));
  });
  await page.goto("/");
  if (await page.getByText("TAP TO START").isVisible()) await page.getByText("TAP TO START").click();

  await expect(page.getByText("A different authentication method is already linked")).toBeVisible();
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("mock_db_tutorial_progress") || "[]"));
  expect(progress[0].step_id).toBe("COMPLETE");
});

test("an expired Google linking intent is discarded", async ({ page }) => {
  await seedCompletedAnonymous(page);
  await page.addInitScript(() => {
    const userId = localStorage.getItem("tribe_demo_uuid");
    localStorage.setItem("tribe_onboarding_auth_intent", JSON.stringify({
      method: "GOOGLE",
      userId,
      startedAt: Date.now() - 31 * 60 * 1000,
    }));
  });
  await page.goto("/");
  await page.getByText("TAP TO START").click();

  await expect(page.getByText("ゲームデータを保存")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("tribe_onboarding_auth_intent"))).toBeNull();
});

test.describe("X in-app browser Google OAuth guard", () => {
  test.describe("iOS", () => {
    test.use({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Twitter for iPhone/10.50",
    });

    test("blocks OAuth before it starts and retains the invitation URL", async ({ page }) => {
      await page.goto("/?invite=FRIEND-X-IOS");
      await page.getByText("TAP TO START").click();
      await page.getByRole("button", { name: "既存アカウントでログイン" }).click();
      await page.locator(".auth-btn-google").click();

      await expect(page.getByText("Googleログインを続けるには、SafariまたはChromeでTRIBE NEONを開いてください。")).toBeVisible();
      const externalLink = page.getByRole("link", { name: "ブラウザで開く" });
      await expect(externalLink).toHaveAttribute("href", /\?invite=FRIEND-X-IOS$/);
      await expect.poll(async () => page.evaluate(() => localStorage.getItem("mock_auth_mode"))).toBeNull();
      await expect.poll(async () => page.evaluate(() => localStorage.getItem("tribe_existing_google_login_intent"))).toBeNull();
    });
  });

  test.describe("Android", () => {
    test.use({
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 TwitterAndroid/10.50 Chrome/131.0 Mobile Safari/537.36",
    });

    test("blocks anonymous identity linking before OAuth starts", async ({ page }) => {
      await seedCompletedAnonymous(page);
      await page.goto("/?invite=FRIEND-X-ANDROID");
      await page.getByText("TAP TO START").click();
      await expect(page.getByText("ゲームデータを保存")).toBeVisible();
      await page.getByRole("button", { name: "Googleアカウントを連携" }).click();

      await expect(page.getByText("Googleログインを続けるには、SafariまたはChromeでTRIBE NEONを開いてください。")).toBeVisible();
      await expect(page.getByRole("link", { name: "ブラウザで開く" })).toHaveAttribute("href", /\?invite=FRIEND-X-ANDROID/);
      await expect.poll(async () => page.evaluate(() => localStorage.getItem("tribe_onboarding_auth_intent"))).toBeNull();
    });
  });
});

test.describe("external browsers keep normal Google OAuth behavior", () => {
  for (const browserProfile of [
    { name: "Safari", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1" },
    { name: "Chrome", userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36" },
  ]) {
    test.describe(browserProfile.name, () => {
      test.use({ userAgent: browserProfile.userAgent });
      test("starts Google OAuth and uses the existing intent contract", async ({ page }) => {
        await page.goto("/?invite=DIRECT-BROWSER");
        await page.getByText("TAP TO START").click();
        await page.getByRole("button", { name: "既存アカウントでログイン" }).click();
        await page.locator(".auth-btn-google").click();

        await expect.poll(async () => page.evaluate(() => localStorage.getItem("mock_auth_mode"))).toBe("GOOGLE");
        await expect.poll(async () => page.evaluate(() => localStorage.getItem("tribe_existing_google_login_intent"))).not.toBeNull();
        await expect(page.getByText("外部ブラウザで開いてください")).toBeHidden();
      });
    });
  }
});

test("OAuth callback restores the persisted session and retains the invitation code", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tribe_demo_uuid", "00000000-0000-4000-8000-000000000888");
    localStorage.setItem("mock_auth_mode", "GOOGLE");
  });
  await page.goto("/auth/callback?invite=CALLBACK-FRIEND");

  await expect(page).toHaveURL(/\/\?invite=CALLBACK-FRIEND$/);
  await expect(page.getByText("TAP TO START")).toBeVisible();
});
