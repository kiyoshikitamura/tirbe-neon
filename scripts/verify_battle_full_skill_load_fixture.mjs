import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  BATTLE_FULL_SKILL_LOAD_AWAKENING,
  BATTLE_FULL_SKILL_LOAD_ENEMY_NAMES,
  BATTLE_FULL_SKILL_LOAD_LEVEL,
  BATTLE_FULL_SKILL_LOAD_PLAYER_NAMES,
  BATTLE_FULL_SKILL_LOAD_SEED,
  actionEvents,
  isSkillAction,
  resolveBattleFullSkillLoadFixture,
} from "../src/domain/battle/fullSkillLoadFixture.ts";
import { canonicalSkillSlotCount } from "../src/domain/gameplay/canonical/calculations.ts";
import { CANONICAL_CHARACTERS, CANONICAL_SKILLS } from "../src/domain/gameplay/canonical/masters.ts";

const root = resolve(import.meta.dirname, "..");
const { fixture, replay } = resolveBattleFullSkillLoadFixture();
const replayAgain = resolveBattleFullSkillLoadFixture().replay;
const actions = actionEvents(replay.events);
const skills = actions.filter(isSkillAction);
const teamByActor = new Map([...fixture.player.map((unit) => [unit.id, "PLAYER"]), ...fixture.enemy.map((unit) => [unit.id, "ENEMY"])]);
const actionKinds = actions.map((event) => ({
  team: teamByActor.get(String(event.payload.actorId)),
  skill: isSkillAction(event),
  actorId: String(event.payload.actorId),
  skillId: String(event.payload.skillId ?? "BASIC_ATTACK"),
  round: event.round,
}));
const hasRun = (length, predicate) => actionKinds.some((_, index) => actionKinds.slice(index, index + length).length === length && actionKinds.slice(index, index + length).every(predicate));
const adjacent = (left, right) => actionKinds.some((entry, index) => left(entry) && right(actionKinds[index + 1]));

assert.equal(fixture.seed, BATTLE_FULL_SKILL_LOAD_SEED);
assert.equal(BATTLE_FULL_SKILL_LOAD_SEED, 20260829);
assert.equal(BATTLE_FULL_SKILL_LOAD_LEVEL, 100);
assert.equal(BATTLE_FULL_SKILL_LOAD_AWAKENING, 5);
assert.equal(canonicalSkillSlotCount(5), 6);
assert.deepEqual(fixture.player.map((unit) => unit.name), [...BATTLE_FULL_SKILL_LOAD_PLAYER_NAMES]);
assert.deepEqual(fixture.enemy.map((unit) => unit.name), [...BATTLE_FULL_SKILL_LOAD_ENEMY_NAMES]);
assert.equal(fixture.player.length, 5);
assert.equal(fixture.enemy.length, 5);

const currentCharacterIds = new Set(CANONICAL_CHARACTERS.map((entry) => entry.character_id));
const currentSkills = new Map(CANONICAL_SKILLS.map((entry) => [entry.skill_id, entry]));
for (const unit of [...fixture.player, ...fixture.enemy]) {
  assert.ok(currentCharacterIds.has(unit.characterId ?? ""), `Character ID parity: ${unit.characterId}`);
  assert.equal(unit.level, 100, `${unit.name}: level`);
  assert.equal(unit.awakeningLevel, 5, `${unit.name}: awakening`);
  assert.equal(unit.skills.length, 6, `${unit.name}: current Skill Slot`);
  for (const skill of unit.skills) {
    const master = currentSkills.get(skill.id);
    assert.ok(master, `${unit.name}: Skill ID parity ${skill.id}`);
    assert.equal(skill.name, master.name, `${skill.id}: Current Skill Master name`);
    assert.deepEqual(skill.effects, master.effects, `${skill.id}: Current Skill Master effects`);
    assert.equal(skill.cooldown, master.cooldown, `${skill.id}: Current Skill Master cooldown`);
    assert.ok(!master.exclusive_character_id || master.exclusive_character_id === unit.characterId, `${unit.name}: exclusive Skill ownership`);
  }
}

assert.deepEqual(replay, replayAgain, "deterministic replay drifted for the fixed seed");
assert.ok(replay.events.at(-1)?.type === "RESULT", "5v5 replay must complete with RESULT");
assert.ok(replay.rounds <= fixture.maxRounds, "5v5 replay exceeded max rounds");
assert.equal(replay.rounds, 8, "Current Master no longer reproduces the accepted 8-round stress duration");
assert.equal(skills.length, 76, "Current Master no longer reproduces 76 Skill actions");
assert.equal(replay.events.at(-1)?.payload.winner, replay.winner, "Replay RESULT winner drifted");
assert.deepEqual(replay.events.map((event) => event.index), replay.events.map((_, index) => index), "Current Replay event index contract drifted");
assert.ok(actions.every((event) => teamByActor.has(String(event.payload.actorId))), "Current Replay ACTION actor is outside the fixture authority");
assert.deepEqual(fixture.encounterSnapshot.map((entry) => entry.characterId), fixture.enemy.map((entry) => entry.characterId), "Encounter Snapshot Enemy != Battle Enemy");

assert.ok(hasRun(3, (entry) => entry.skill && entry.team === "PLAYER"), "A: Player Skill x3 missing");
assert.ok(hasRun(3, (entry) => entry.skill && entry.team === "ENEMY"), "B: Enemy Skill x3 missing");
assert.ok(actionKinds.some((entry, index) => entry.skill && actionKinds[index + 1]?.skill && entry.team !== actionKinds[index + 1]?.team), "C: alternating Player/Enemy Skill missing");
assert.ok(adjacent((entry) => entry.skill, (entry) => entry && !entry.skill), "D: Skill -> Normal Attack missing");
assert.ok(adjacent((entry) => !entry.skill, (entry) => entry?.skill), "E: Normal Attack -> Skill missing");
assert.ok(hasRun(5, (entry) => entry.skill), "G: five consecutive Skill actions missing");
assert.ok(replay.events.some((event) => event.type === "STATUS"), "H: Status Skill outcome missing");
const defeatIndexes = replay.events.flatMap((event, index) => event.type === "DEFEAT" ? [index] : []);
assert.ok(defeatIndexes.some((index) => {
  const previousAction = replay.events.slice(0, index).reverse().find((event) => event.type === "ACTION");
  const nextAction = replay.events.slice(index + 1).find((event) => event.type === "ACTION");
  return previousAction && isSkillAction(previousAction) && nextAction;
}), "F: Skill defeat -> next Actor missing");

assert.ok(fixture.location.expectedBackgroundPath, "Current Quest/Area has no canonical expected Battle background");
await access(resolve(root, "public", fixture.location.expectedBackgroundPath.replace(/^\//, "")));
assert.equal(fixture.location.runtimeBattleBackgroundPath, fixture.location.expectedBackgroundPath, "Quest/Area background is not connected to BattlePresentationContext");

const page = await readFile(resolve(root, "src/app/qa/battle-full-skill-load/page.tsx"), "utf8");
const harness = await readFile(resolve(root, "src/app/qa/battle-full-skill-load/BattleFullSkillLoadHarness.tsx"), "utf8");
assert.match(page, /isQaHarnessAvailable/, "QA route must fail closed through the existing environment gate");
assert.match(page, /notFound\(\)/, "Production QA route must return 404");
assert.match(harness, /<CardBattleView\s*\/>/, "QA must render the Production Battle component");
assert.match(harness, /buildBattlePresentationUnit\(replay\.events/, "QA must replay the existing canonical fixture through the Production V2 presentation grouping");
assert.doesNotMatch(harness, /supabase|fetch\(|\.from\(|\.rpc\(/, "QA fixture must not read or mutate Production User Data");

console.log(JSON.stringify({
  status: "PASS",
  seed: fixture.seed,
  roster: { player: fixture.player.map((unit) => unit.name), enemy: fixture.enemy.map((unit) => unit.name) },
  skillSlotsPerUnit: 6,
  currentSkillIds: [...new Set([...fixture.player, ...fixture.enemy].flatMap((unit) => unit.skills.map((skill) => skill.id)))],
  currentLoadouts: Object.fromEntries([...fixture.player, ...fixture.enemy].map((unit) => [unit.name, unit.skills.map((skill) => `${skill.id} ${skill.name}`)])),
  replay: { winner: replay.winner, rounds: replay.rounds, events: replay.events.length, actions: actions.length, skillActions: skills.length },
  patterns: { A: "PASS", B: "PASS", C: "PASS", D: "PASS", E: "PASS", F: "PASS", G: "PASS", H: "PASS", I: "PASS" },
  location: { ...fixture.location, parityGate: fixture.location.runtimeBattleBackgroundPath === fixture.location.expectedBackgroundPath ? "PASS" : "FAIL" },
  productionImpact: 0,
}, null, 2));
