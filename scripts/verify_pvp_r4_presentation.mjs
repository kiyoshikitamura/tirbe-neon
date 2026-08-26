import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveBattleSkillLabel, safeBattleCharacterName } from "../src/domain/presentation/battleSkillLabels.ts";

assert.equal(resolveBattleSkillLabel("SKILL_001"), "ストリートパンチ");
assert.equal(resolveBattleSkillLabel("skill_01", [{ id: "skill_01", name: "skill_01" }]), "スキル発動");
assert.equal(resolveBattleSkillLabel("07ef5890-f502-4ab5-8007-9006796d6142"), "スキル発動");
assert.equal(safeBattleCharacterName("player_123"), "キャラクター");

const battle = fs.readFileSync(new URL("../src/hooks/useBattle.ts", import.meta.url), "utf8");
const pvp = fs.readFileSync(new URL("../src/app/components/PvpTab.tsx", import.meta.url), "utf8");
const setup = fs.readFileSync(new URL("../src/app/components/CardBattleView.tsx", import.meta.url), "utf8");
assert.match(battle, /remainingHp[\s\S]*playerPartyStatesRef\.current = nextPlayers[\s\S]*setPlayerPartyStates\(nextPlayers\)/);
assert.match(pvp, /selectedMembers[\s\S]*data-character-id=\{ownedId\}/);
assert.doesNotMatch(pvp, /const myDeckCharacters[\s\S]{0,400}myPvpDefenseDeck/);
assert.match(setup, /metadata=\{false\}/);
assert.match(setup, /className="setup-cta-area"/);

console.log("PvP R4 presentation contract: PASS");
