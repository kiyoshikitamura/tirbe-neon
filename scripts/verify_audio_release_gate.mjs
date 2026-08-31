import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const contract = read("src/audio/audioContract.ts");
const provider = read("src/audio/AudioProvider.tsx");
const qaPage = read("src/app/qa/audio/page.tsx");
const harness = read("src/app/qa/audio/AudioLifecycleHarness.tsx");
const procedure = read("specs/production/ux/audio_lifecycle_release_gate_20260830.md");

const assetPaths = [...new Set([...contract.matchAll(/"(\/sounds\/(?:bgm|se)\/[^"\s]+\.mp3)"/g)].map((match) => match[1]))];
assert(assetPaths.length > 0, "audio contract must contain canonical assets");
for (const assetPath of assetPaths) {
  assert(fs.existsSync(path.join(root, "public", assetPath)), `missing canonical asset: ${assetPath}`);
}

for (const scene of ["TITLE", "HOME", "BATTLE", "RAID"]) assert(contract.includes(`${scene}:`), `missing BGM scene ${scene}`);
for (const event of ["UI_TAP", "UI_MODAL_OPEN", "BATTLE_SKILL", "BATTLE_CRITICAL"]) assert(contract.includes(`${event}:`), `missing SE event ${event}`);
for (const token of ["AudioContext", "webkitAudioContext", "visibilitychange", "context.suspend()", "context.resume()", "localStorage", "stopActiveBgm", "contextRef.current?.close()"])
  assert(provider.includes(token), `lifecycle implementation audit token missing: ${token}`);
assert(qaPage.includes("isQaHarnessAvailable"), "audio QA route must use the non-production guard");
assert(qaPage.includes("notFound()"), "audio QA route must return 404 when disabled");
assert(harness.includes("data-qa-harness=\"audio-lifecycle\""), "audio lifecycle harness marker missing");
for (const id of "ABCDEFGHIJKLMNO") assert(procedure.includes(`| ${id} |`), `acceptance matrix row ${id} missing`);

console.log(`audio release-gate preparation verified: ${assetPaths.length} canonical assets, QA guard, lifecycle contract, matrix A-O`);
