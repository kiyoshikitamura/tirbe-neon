import { spawn } from "node:child_process";

const port = process.env.PLAYWRIGHT_PORT || "3100";
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], {
  stdio: "inherit",
  env: process.env,
});
const waitForServer = async () => {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode != null) throw new Error(`Next server exited with ${server.exitCode}`);
    try { const response = await fetch(baseUrl); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the browser E2E server");
};
const stopServer = async () => {
  if (server.exitCode != null) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      killer.once("exit", resolve); killer.once("error", resolve);
    });
  } else {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)),new Promise((resolve) => setTimeout(resolve, 5000))]);
    if (server.exitCode == null) server.kill("SIGKILL");
  }
};
let status = 1;
try {
  await waitForServer();
  status = await new Promise((resolve, reject) => {
    const runner = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PLAYWRIGHT_REUSE_SERVER: "true" } });
    runner.once("error", reject); runner.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  await stopServer();
}
process.exit(status);
