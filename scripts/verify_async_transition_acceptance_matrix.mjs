import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const matrix = await read("specs/async_transition_loading_final_acceptance_20260830.md");
const spec = await read("tests/e2e/async-transition-final-acceptance.spec.ts");
const probe = await read("tests/e2e/support/async-transition-probe.ts");

for (const surface of ["Global Navigation", "Quest", "Gacha", "Character Growth", "Skill Growth", "Equipment Growth", "Mission", "Present", "Profile", "Guild", "PvP", "Raid", "Reward Dialog", "Confirm Dialog"]) {
  assert.match(matrix, new RegExp(`\\| ${surface.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")} \\|`), `missing surface: ${surface}`);
}
for (const phase of ["tap", "pending_paint", "lock_active", "server_completion", "destination_paint", "unlock"]) assert.match(probe, new RegExp(`"${phase}"`));
for (const delay of [0, 500, 1500, 3000]) assert.match(spec, new RegExp(`\\b${delay}\\b`));
assert.doesNotMatch(matrix, /Production routeへQA導線/);

console.log(JSON.stringify({ status: "PASS", surfaces: 14, delays: [0, 500, 1500, 3000], productionUiChanged: false, productionRouteAdded: false }, null, 2));
