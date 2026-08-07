import { defineConfig } from "@playwright/test";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `${npmCommand} run dev -- --hostname 127.0.0.1 --port 3100`,
    url: "http://127.0.0.1:3100",
    // ローカルでは既存の開発サーバーを利用し、Playwright終了時に不要な
    // Next.js開発サーバープロセスを残さない。
    reuseExistingServer: true,
    timeout: 120_000,
    env: { ...process.env, NEXT_PUBLIC_USE_MOCK_DB: "true" },
  },
});
