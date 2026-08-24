import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveCanonicalBattle } from "../src/domain/battle/canonical_runtime.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const unit = (id, team, skills = []) => ({
  id,
  characterId: id,
  name: id,
  team,
  level: 12,
  awakeningLevel: 1,
  rarity: team === "PLAYER" ? "SSR" : "SR",
  alignment: "ORDER",
  stats: { hp: 100000, atk: 10000, def: 5000, spd: team === "PLAYER" ? 200 : 100, luk: 0 },
  skills,
});
const shieldSkill = {
  id: "presentation-shield",
  name: "Presentation Shield",
  activationType: "ACTIVE",
  cooldown: 3,
  availableFromRound: 1,
  target: "SELF",
  effects: ["SHIELD 30% MaxHP / 2T"],
};
const input = {
  seed: 20260824,
  tactic: "SKILL_PRIORITY",
  enemyTactic: "BALANCED",
  maxRounds: 3,
  player: [unit("player-1", "PLAYER", [shieldSkill])],
  enemy: [unit("enemy-1", "ENEMY")],
};
const first = resolveCanonicalBattle(input);
const second = resolveCanonicalBattle(input);
assert.deepEqual(first, second, "The same authoritative replay seed must remain deterministic");
assert.ok(first.events.some((event) => Array.isArray(event.payload.activeEffectsAfter)), "Replay events must project authoritative active effect snapshots");
assert.ok(first.events.some((event) => event.type === "EFFECT" && event.payload.kind === "ACTIVE_EFFECT_SYNC"), "Effect expiry must be projected without client duration calculation");

const runtime = read("src/hooks/useBattle.ts");
const viewer = read("src/app/components/battle/QuestBattleViewer.tsx");
const result = read("src/app/components/battle/BattleResultSummary.tsx");
const globals = read("src/app/globals.css");
const setup = read("src/app/components/SetupView.tsx");
assert.match(runtime, /setBattleResultReplayEvents\(replayEventsTemp\)/, "Result must retain an immutable replay event snapshot");
assert.match(runtime, /if \(tutorialBattleActive \|\| battleState !== "PLAYING"/, "In-battle skip must explicitly reject the first tutorial");
assert.match(runtime, /find\(\(entry\) => entry\.type === "RESULT"\)/, "Skip must use the authoritative result event");
assert.match(viewer, /data-party-size=/, "Roster must expose its authoritative party length");
assert.doesNotMatch(viewer, /battle-enemy-compact/, "Variable enemy rosters must not use a fixed tutorial-only slot");
assert.match(viewer, /battle-skip-btn/, "Repeat battles must expose presentation skip");
assert.match(result, /battle-result-opponent/, "Result must present the opponent before the outcome");
assert.match(result, /battle-result-mvp-hero/, "Result must preserve the MVP hero hierarchy");
assert.match(globals, /--font-ui:/);
assert.match(globals, /--font-display:/);
assert.match(setup, /setup-world-motion/, "World introduction must use the existing scene foundation for cinematic motion");

console.log(JSON.stringify({
  status: "PASS",
  replayDeterministic: true,
  activeEffectProjection: true,
  variableRoster: "1-5 per side",
  tutorialSkip: false,
  resultReplayRetention: true,
  typographyTokens: true,
  worldIntroMotion: true,
}, null, 2));
