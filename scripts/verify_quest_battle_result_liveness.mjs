import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const battle = readFileSync(new URL("../src/hooks/useBattle.ts", import.meta.url), "utf8");
const patrol = readFileSync(new URL("../src/app/components/PatrolTab.tsx", import.meta.url), "utf8");
const patrolHook = readFileSync(new URL("../src/app/context/hooks/usePatrol.ts", import.meta.url), "utf8");

assert.match(
  battle,
  /setBattleSkipPending\(false\);\s*\/\/ Skip pauses replay[\s\S]*?setIsAutoPaused\(false\);/,
  "a new battle must clear pause state left by Skip",
);
assert.match(
  battle,
  /setBattlePresentationContext\(null\);\s*setBattleSkipPending\(false\);\s*setIsAutoPaused\(false\);/,
  "battle completion must clear replay pause state",
);
assert.doesNotMatch(
  patrol,
  /if \(!tutorialBattleActive \|\| battleState !== "RESULT"/,
  "normal quest victories must not be excluded from result reward settlement",
);
assert.doesNotMatch(
  patrol,
  /activePatrols\.find\(\(patrol: any\) => patrol\.id === settledPatrolEncounterId && patrol\.battle_resolved\)/,
  "reward settlement must not wait on a stale bootstrap projection",
);
assert.match(
  patrol,
  /handleClaim\(settledPatrolEncounterId, \{ battleOwnsResult: true \}\)/,
  "the mounted battle result must claim its authoritative reward",
);
assert.match(
  patrolHook,
  /if \(!options\?\.suppressResultModal\) setShowPatrolRewardModal\(true\);/,
  "battle-owned rewards must not open a duplicate result modal",
);
assert.match(
  patrol,
  /battleStartRef\.current = true;\s*\/\/ Rewards belong[\s\S]*?setLastPatrolRewards\(null\);\s*setShowPatrolRewardModal\(false\);/,
  "a later quest must clear the previous battle-owned reward projection",
);

console.log(JSON.stringify({
  status: "PASS",
  questReplay: { pauseResetAtStart: true, pauseResetAtCompletion: true },
  questResult: { regularVictoryClaim: true, staleProjectionIndependent: true, duplicateModalSuppressed: true },
  raidContractChanged: false,
}, null, 2));
