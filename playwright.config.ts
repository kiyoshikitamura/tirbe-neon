import { defineConfig } from "@playwright/test";

const testPort = process.env.PLAYWRIGHT_PORT || "3100";
const testBaseUrl = `http://127.0.0.1:${testPort}`;
const nodeExecutable = process.execPath.includes(" ") ? `"${process.execPath}"` : process.execPath;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 12_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
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
    // Invoke Next directly so Playwright owns the actual server process. npm.cmd
    // leaves a detached child on Windows and can hang after all tests pass.
    command: `${nodeExecutable} node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${testPort}`,
    url: testBaseUrl,
    // The npm test command owns and tears down the server process tree. Playwright
    // only reuses that isolated process, avoiding the Windows teardown orphan.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000,
    env: { ...process.env, NEXT_PUBLIC_USE_MOCK_DB: "true" },
  },
});
