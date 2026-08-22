import { defineConfig } from "@playwright/test";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const testPort = process.env.PLAYWRIGHT_PORT || "3100";
const testBaseUrl = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  // The suite shares one Next.js dev server. Bounding browser concurrency keeps
  // compilation and cold asset loading deterministic on GitHub's 2-core runner.
  workers: 2,
  use: {
    baseURL: testBaseUrl,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `${npmCommand} run dev -- --hostname 127.0.0.1 --port ${testPort}`,
    url: testBaseUrl,
    // ローカルでは既存の開発サーバーを利用し、Playwright終了時に不要な
    // Next.js開発サーバープロセスを残さない。
    reuseExistingServer: true,
    timeout: 120_000,
    env: { ...process.env, NEXT_PUBLIC_USE_MOCK_DB: "true" },
  },
});
