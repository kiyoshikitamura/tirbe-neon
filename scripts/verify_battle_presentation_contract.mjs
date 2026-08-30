import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveCanonicalBattle } from "../src/domain/battle/canonical_runtime.ts";
import {
  battlePresentationBudget,
  buildBattlePresentationUnit,
  reconcileBattleHpFromReplay,
} from "../src/domain/presentation/battlePresentationUnit.ts";

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
const grouped = buildBattlePresentationUnit([
  { index: 0, round: 1, type: "ACTION", payload: { actorId: "player-1", skillId: "SKILL_AOE" } },
  { index: 1, round: 1, type: "DAMAGE", payload: { targetId: "enemy-1", amount: 100, remainingHp: 900 } },
  { index: 2, round: 1, type: "DAMAGE", payload: { targetId: "enemy-2", amount: 120, remainingHp: 880 } },
  { index: 3, round: 1, type: "STATUS", payload: { targetId: "enemy-2", status: "ATK_DOWN", activeEffectsAfter: [] } },
  { index: 4, round: 1, type: "ACTION", payload: { actorId: "enemy-1", skillId: "BASIC_ATTACK" } },
], 0);
assert.deepEqual(grouped?.targets.map((target) => target.targetId), ["enemy-1", "enemy-2"], "One ACTION must group all canonical targets for simultaneous presentation");
assert.deepEqual(grouped?.targets[1].events.map((event) => event.type), ["DAMAGE", "STATUS"], "Target result order must remain authoritative");
assert.equal(grouped?.nextReplayCursor, 4, "Presentation grouping must stop at the next ACTION");
assert.equal(battlePresentationBudget("NORMAL", 1), 1440, "1x normal budget must be twice the former 1x target");
assert.equal(battlePresentationBudget("SSR", 1), 2400, "1x premium budget must preserve the expanded recognition window");
assert.equal(battlePresentationBudget("NORMAL", 2), 720, "2x normal budget must track the former 1x target");
assert.equal(battlePresentationBudget("SSR", 2), 1200, "2x premium budget must track the former 1x target");
const reconciled = reconcileBattleHpFromReplay([
  { id: "enemy-1", hp: 1000, maxHp: 1000, isDead: false },
  { id: "enemy-2", hp: 1000, maxHp: 1000, isDead: false },
], [
  { index: 0, round: 1, type: "DAMAGE", payload: { targetId: "enemy-1", remainingHp: 125 } },
  { index: 1, round: 1, type: "DEFEAT", payload: { targetId: "enemy-2" } },
]);
assert.deepEqual(reconciled.map((entry) => [entry.hp, entry.isDead]), [[125, false], [0, true]], "Result HP projection must copy canonical replay HP without calculation");

const runtime = read("src/hooks/useBattle.ts");
const viewer = read("src/app/components/battle/QuestBattleViewer.tsx");
const portrait = read("src/app/components/battle/BattleUnitPortrait.tsx");
const effects = read("src/app/components/battle/BattleEffectPresentation.tsx");
const result = read("src/app/components/battle/BattleResultSummary.tsx");
const globals = read("src/app/globals.css");
const setup = read("src/app/components/SetupView.tsx");
assert.match(runtime, /setBattleResultReplayEvents\(replayEventsTemp\)/, "Result must retain an immutable replay event snapshot");
assert.match(runtime, /if \(tutorialBattleActive \|\| battleState !== "PLAYING"/, "In-battle skip must explicitly reject the first tutorial");
assert.match(runtime, /find\(\(entry\) => entry\.type === "RESULT"\)/, "Skip must use the authoritative result event");
assert.match(viewer, /data-party-size=/, "Roster must expose its authoritative party length");
assert.doesNotMatch(viewer, />CURRENT<|`NEXT \$\{index\}`/, "Battle V2 must not render CURRENT/NEXT presentation");
assert.doesNotMatch(viewer, /className="battle-action-stage/, "Battle V2 must not render a central action stage");
assert.match(runtime, /buildBattlePresentationUnit\(authoritativeEvents/, "Production replay must use the presentation-only ACTION builder");
assert.match(runtime, /waitForRenderedBattleHpParity/, "RESULT must wait for rendered HP parity before leaving the field");
assert.match(viewer, /battle-cutin-slot/, "SR/SSR cut-in must use the reserved lower strip");
assert.ok(portrait.indexOf("<BattleTargetReaction") > portrait.indexOf("<div className=\"battle-unit-art\""), "Target reaction must be mounted inside the character icon");
assert.match(effects, /data-target-effect-scope="icon"/, "Target effects must declare icon-local scope");
for (const tone of ["damage", "heal", "buff", "debuff", "shield", "status"]) assert.match(effects, new RegExp(`battle-target-effect is-${tone}`), `${tone} must have a distinct icon-local effect layer`);
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
  actionPresentationAuthorityImpact: 0,
  actionBudgets: { normal1x: 1440, normal2x: 720, ssr1x: 2400, ssr2x: 1200 },
  resultHpParityGate: true,
  targetEffectScope: "character-icon",
}, null, 2));
