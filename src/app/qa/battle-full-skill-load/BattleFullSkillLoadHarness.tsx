"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CardBattleView from "@/app/components/CardBattleView";
import { GameContext } from "@/app/context/GameContext";
import type { BattlePresentationPhase } from "@/hooks/useBattle";
import type { ParticipantState } from "@/hooks/battle/battleTypes";
import type { BattleUnitInput } from "@/lib/battle/deterministicBattle";
import { isSkillAction, resolveBattleFullSkillLoadFixture } from "@/domain/battle/fullSkillLoadFixture";
import "./battle-full-skill-load.css";

type BattleScreenState = "PLAYING" | "ENDING" | "OUTCOME" | "RESULT";
type DamagePopup = { val: number; type: "dmg" | "heal" | "shield"; isCritical?: boolean; x: number; y: number; charId: string };

const toParticipant = (unit: BattleUnitInput): ParticipantState => ({
  id: unit.id,
  characterId: unit.characterId ?? unit.id,
  name: unit.name,
  alignment: unit.alignment,
  level: unit.level ?? 100,
  awakeningLevel: unit.awakeningLevel ?? 5,
  rarity: unit.rarity,
  hp: unit.stats.hp,
  maxHp: unit.stats.hp,
  shield: 0,
  isDead: false,
  isEnemy: unit.team === "ENEMY",
  tauntTurns: 0,
  stunTurns: 0,
  activeEffects: [],
  stats: unit.stats,
  skills: unit.skills.map((skill) => ({
    id: skill.id,
    skill_card_id: skill.id,
    name: skill.name,
    plus_val: skill.skillPlusVal ?? 0,
    activationType: skill.activationType,
    target: skill.target,
    cooldown: skill.cooldown,
    availableFromRound: skill.availableFromRound,
    effects: skill.effects,
  })),
});

const activeEffects = (payload: Record<string, unknown>) => Array.isArray(payload.activeEffectsAfter)
  ? payload.activeEffectsAfter.filter((entry): entry is NonNullable<ParticipantState["activeEffects"]>[number] => Boolean(entry) && typeof entry === "object")
  : null;

const projectEffects = (participant: ParticipantState, payload: Record<string, unknown>): ParticipantState => {
  const effects = activeEffects(payload);
  if (!effects) return participant;
  return {
    ...participant,
    activeEffects: effects,
    shield: effects.filter((entry) => entry.kind === "SHIELD").reduce((sum, entry) => sum + Math.max(0, Number(entry.amount || 0)), 0),
    stunTurns: effects.some((entry) => entry.id === "STUN") ? 1 : 0,
    tauntTurns: effects.some((entry) => entry.id === "TAUNT") ? 1 : 0,
  };
};

export default function BattleFullSkillLoadHarness() {
  const resolved = useMemo(() => resolveBattleFullSkillLoadFixture(), []);
  const { fixture, replay } = resolved;
  const initialPlayers = useMemo(() => fixture.player.map(toParticipant), [fixture.player]);
  const initialEnemies = useMemo(() => fixture.enemy.map(toParticipant), [fixture.enemy]);
  const skillNames = useMemo(() => new Map([...fixture.player, ...fixture.enemy].flatMap((unit) => unit.skills.map((skill) => [skill.id, skill.name] as const))), [fixture.enemy, fixture.player]);
  const baseTimeline = useMemo(() => [...initialPlayers, ...initialEnemies]
    .sort((left, right) => right.stats.spd - left.stats.spd || left.id.localeCompare(right.id))
    .map((entry) => ({ id: entry.id, name: entry.name, isEnemy: entry.isEnemy })), [initialEnemies, initialPlayers]);
  const teamById = useMemo(() => new Map([...initialPlayers, ...initialEnemies].map((entry) => [entry.id, entry.isEnemy])), [initialEnemies, initialPlayers]);
  const timersRef = useRef<number[]>([]);
  const playerRef = useRef(initialPlayers);
  const enemyRef = useRef(initialEnemies);
  const [started, setStarted] = useState(false);
  const [battleState, setBattleState] = useState<BattleScreenState>("PLAYING");
  const [eventIndex, setEventIndex] = useState(0);
  const [players, setPlayers] = useState(initialPlayers);
  const [enemies, setEnemies] = useState(initialEnemies);
  const [round, setRound] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<BattlePresentationPhase>("IDLE");
  const [skillCutIn, setSkillCutIn] = useState<{ charName: string; skillName: string } | null>(null);
  const [targetLine, setTargetLine] = useState<{ fromId: string; toId: string } | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const [authoritativeTimeline, setAuthoritativeTimeline] = useState<Array<{ id: string; name: string; isEnemy: boolean }>>([]);
  const [skipPending, setSkipPending] = useState(false);
  const [outcome, setOutcome] = useState<"VICTORY" | "DEFEAT">(replay.winner === "PLAYER" ? "VICTORY" : "DEFEAT");

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }, []);

  const replaceParticipant = useCallback((targetId: string, transform: (participant: ParticipantState) => ParticipantState) => {
    const nextPlayers = playerRef.current.map((entry) => entry.id === targetId ? transform(entry) : entry);
    const nextEnemies = enemyRef.current.map((entry) => entry.id === targetId ? transform(entry) : entry);
    playerRef.current = nextPlayers;
    enemyRef.current = nextEnemies;
    setPlayers(nextPlayers);
    setEnemies(nextEnemies);
  }, []);

  const enterResult = useCallback((winner: "PLAYER" | "ENEMY") => {
    clearTimers();
    setOutcome(winner === "PLAYER" ? "VICTORY" : "DEFEAT");
    setSkillCutIn(null);
    setTargetLine(null);
    setShakingId(null);
    setDamagePopup(null);
    setPhase("IDLE");
    setAuthoritativeTimeline([]);
    setBattleState("ENDING");
    schedule(() => setBattleState("OUTCOME"), 760);
    schedule(() => setBattleState("RESULT"), 1740);
  }, [clearTimers, schedule]);

  const reset = useCallback(() => {
    clearTimers();
    playerRef.current = initialPlayers;
    enemyRef.current = initialEnemies;
    setPlayers(initialPlayers);
    setEnemies(initialEnemies);
    setEventIndex(0);
    setRound(1);
    setSpeed(1);
    setPaused(false);
    setPhase("IDLE");
    setSkillCutIn(null);
    setTargetLine(null);
    setShakingId(null);
    setDamagePopup(null);
    setAuthoritativeTimeline([]);
    setSkipPending(false);
    setBattleState("PLAYING");
    setStarted(false);
  }, [clearTimers, initialEnemies, initialPlayers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!started || paused || battleState !== "PLAYING") return;
    const event = replay.events[eventIndex];
    if (!event) return;
    const payload = event.payload;
    const actorId = String(payload.actorId ?? "");
    const targetId = String(payload.targetId ?? "");
    const participants = [...playerRef.current, ...enemyRef.current];
    const actor = participants.find((entry) => entry.id === actorId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the harness consumes one immutable replay event per effect pass.
    setRound(Math.max(1, event.round));
    clearTimers();

    const advance = (delay: number) => schedule(() => setEventIndex((current) => current + 1), delay);
    if (event.type === "ACTION") {
      const skillId = String(payload.skillId ?? "BASIC_ATTACK");
      const skill = isSkillAction(event);
      const nextActionOffset = replay.events.slice(eventIndex + 1).findIndex((entry) => entry.type === "ACTION");
      const actionUnit = replay.events.slice(eventIndex + 1, nextActionOffset < 0 ? undefined : eventIndex + 1 + nextActionOffset);
      const outcomeEvent = actionUnit.find((entry) => ["DAMAGE", "HEAL", "STATUS", "EFFECT"].includes(entry.type));
      const nextTargetId = String(outcomeEvent?.payload.targetId ?? "");
      const nextActors = replay.events.slice(eventIndex).filter((entry) => entry.type === "ACTION").slice(0, 4).map((entry) => {
        const id = String(entry.payload.actorId ?? "");
        const participant = participants.find((candidate) => candidate.id === id);
        return { id, name: participant?.name ?? "キャラクター", isEnemy: teamById.get(id) === true };
      });
      setSkillCutIn({ charName: actor?.name ?? "キャラクター", skillName: skillNames.get(skillId) ?? (skill ? "スキル発動" : "通常攻撃") });
      setTargetLine(null);
      setShakingId(null);
      setDamagePopup(null);
      setAuthoritativeTimeline(nextActors);
      setPhase("ACTOR_FOCUS");
      const targetDelay = skill ? Math.max(760, 1120 / speed) : 260 / speed;
      const attackDelay = skill ? Math.max(1040, 1480 / speed) : 480 / speed;
      schedule(() => { if (nextTargetId) setTargetLine({ fromId: actorId, toId: nextTargetId }); setPhase("TARGET_FOCUS"); }, targetDelay);
      schedule(() => setPhase("ATTACK_MOTION"), attackDelay);
      advance(skill ? Math.max(1300, 1660 / speed) : 620 / speed);
      return;
    }

    if (event.type === "DAMAGE") {
      const amount = Math.max(0, Number(payload.amount ?? 0));
      const remainingHp = Math.max(0, Number(payload.remainingHp ?? 0));
      replaceParticipant(targetId, (entry) => projectEffects({ ...entry, hp: remainingHp, isDead: remainingHp <= 0 }, payload));
      setTargetLine(actorId && targetId ? { fromId: actorId, toId: targetId } : null);
      setShakingId(payload.hit === false ? null : targetId);
      setDamagePopup({ val: amount, type: "dmg", isCritical: payload.critical === true, x: 120, y: 40, charId: targetId });
      setPhase("IMPACT");
      schedule(() => setPhase("DAMAGE"), 180);
      schedule(() => setPhase("HP_TRANSITION"), 480);
      schedule(() => setPhase("ACTION_HOLD"), 850);
      advance(980);
      return;
    }

    if (event.type === "HEAL") {
      const amount = Math.max(0, Number(payload.effectiveAmount ?? payload.amount ?? 0));
      const remainingHp = Math.max(0, Number(payload.remainingHp ?? 0));
      replaceParticipant(targetId, (entry) => ({ ...entry, hp: remainingHp, isDead: false }));
      setTargetLine(actorId && targetId ? { fromId: actorId, toId: targetId } : null);
      setDamagePopup({ val: amount, type: "heal", x: 120, y: 40, charId: targetId });
      setPhase("IMPACT");
      schedule(() => setPhase("DAMAGE"), 180);
      schedule(() => setPhase("HP_TRANSITION"), 480);
      schedule(() => setPhase("ACTION_HOLD"), 850);
      advance(980);
      return;
    }

    if (event.type === "STATUS" || event.type === "EFFECT") {
      const syncOnly = event.type === "EFFECT" && payload.kind === "ACTIVE_EFFECT_SYNC";
      replaceParticipant(targetId, (entry) => projectEffects(entry, payload));
      if (syncOnly) { advance(45); return; }
      setTargetLine(actorId && targetId ? { fromId: actorId, toId: targetId } : null);
      if (payload.kind === "SHIELD") setDamagePopup({ val: Math.max(0, Number(payload.amount ?? 0)), type: "shield", x: 120, y: 40, charId: targetId });
      setPhase("IMPACT");
      schedule(() => setPhase("DAMAGE"), 180);
      schedule(() => setPhase("HP_TRANSITION"), 480);
      schedule(() => setPhase("ACTION_HOLD"), 850);
      advance(920);
      return;
    }

    if (event.type === "DEFEAT") {
      replaceParticipant(targetId, (entry) => ({ ...entry, hp: 0, isDead: true }));
      advance(520);
      return;
    }

    if (event.type === "RESULT") {
      enterResult(payload.winner === "PLAYER" ? "PLAYER" : "ENEMY");
      return;
    }

    advance(40);
  }, [battleState, clearTimers, enterResult, eventIndex, paused, replay.events, replaceParticipant, schedule, skillNames, speed, started, teamById]);

  const start = () => {
    setStarted(true);
    setBattleState("PLAYING");
    setEventIndex(0);
  };
  const skip = () => {
    setSkipPending(true);
    schedule(() => { setSkipPending(false); enterResult(replay.winner); }, 240);
  };
  const context = {
    battleMode: "PVP_PRACTICE",
    battleOpponentName: "Battle Full Skill Load / Current Master",
    battleState,
    battleOutcome: outcome,
    tutorialBattleActive: false,
    tactic: "SKILL_PRIORITY",
    setTactic: () => undefined,
    battleSpeed: speed,
    setBattleSpeed: setSpeed,
    monthlyPassActive: false,
    isAutoPaused: paused,
    setIsAutoPaused: setPaused,
    setConfirmDialogConfig: (config: { message?: string; onConfirm?: () => void } | null) => {
      if (config?.onConfirm && window.confirm(config.message || "バトルを終了しますか？")) config.onConfirm();
    },
    playerPartyStates: players,
    enemyPartyStates: enemies,
    timeline: baseTimeline,
    timelineIndex: Math.max(0, baseTimeline.findIndex((entry) => entry.id === authoritativeTimeline[0]?.id)),
    battleRound: round,
    activeSkillCutIn: skillCutIn,
    targetLine,
    activeShakingCharId: shakingId,
    damagePopup,
    battleResultReplayEvents: replay.events,
    battlePresentationContext: {
      mode: "PVP_PRACTICE",
      opponentLabel: fixture.location.questName,
      encounterLabel: `${fixture.location.questName} / stress fixture`,
      opponentLeaderCharacterId: enemies[0]?.characterId,
      opponentLeaderName: enemies[0]?.name,
      backgroundPath: fixture.location.runtimeBattleBackgroundPath,
      backgroundLabel: fixture.location.townId,
    },
    battleModeResultDetail: {
      resultLabel: "BATTLE FULL SKILL LOAD",
      reward: "QA fixture / 報酬なし",
      note: "Production User Dataは変更されていません。",
      continueLabel: "もう一度確認",
    },
    battleSkipPending: skipPending,
    presentationPhase: phase,
    authoritativeTimeline,
    launchBattlePlaying: () => undefined,
    confirmPreparedPvpBattle: async () => true,
    cancelPreparedPvpBattle: () => true,
    confirmPreparedRaidBattle: async () => true,
    cancelPreparedRaidBattle: () => true,
    raidPoints: 0,
    raidFirstEntryFree: false,
    skipBattlePresentation: skip,
    endBattleSession: () => enterResult("ENEMY"),
    completeBattleResult: reset,
    completeTutorialBattleResult: reset,
    lastPatrolRewards: null,
    playCyberSe: () => undefined,
    handleFirstUserInteraction: () => undefined,
    playSe: () => undefined,
    preloadAudio: () => undefined,
  };
  const skills = [...new Map([...fixture.player, ...fixture.enemy].flatMap((unit) => unit.skills.map((skill) => [skill.id, skill]))).values()];
  const replaySkillCount = replay.events.filter((event) => event.type === "ACTION" && isSkillAction(event)).length;

  return <main className="battle-full-skill-load" data-qa-harness="battle-full-skill-load" data-replay-index={eventIndex} data-battle-state={started ? battleState : "READY"}>
    {!started ? <section className="battle-stress-launch">
      <small>PREVIEW / DEVELOPMENT ONLY</small>
      <h1>BATTLE FULL SKILL LOAD</h1>
      <p>Current Canonical Master / seed {fixture.seed} / Lv100 / 覚醒5 / 6 Skill Slots</p>
      <div className="battle-stress-rosters"><article><b>PLAYER</b><span>{fixture.player.map((unit) => unit.name).join(" / ")}</span></article><article><b>ENEMY</b><span>{fixture.enemy.map((unit) => unit.name).join(" / ")}</span></article></div>
      <dl><div><dt>Replay</dt><dd>{replaySkillCount} Skill actions / {replay.rounds} rounds / {replay.events.length} events</dd></div><div><dt>Quest / Area</dt><dd>{fixture.location.questId} → {fixture.location.townId}</dd></div><div><dt>Expected BG</dt><dd>{fixture.location.expectedBackgroundPath}</dd></div><div><dt>Runtime Battle BG</dt><dd>{fixture.location.runtimeBattleBackgroundPath ?? "UNCONNECTED — Human AcceptanceでFAIL判定"}</dd></div></dl>
      <details><summary>Current Skills ({skills.length})</summary><p>{skills.map((skill) => `${skill.id} ${skill.name}`).join(" / ")}</p></details>
      <button type="button" onClick={start}>Stress Battleを開始</button>
    </section> : <GameContext.Provider value={context}><CardBattleView /></GameContext.Provider>}
    {started && <aside className="battle-stress-audit" data-location-parity={fixture.location.runtimeBattleBackgroundPath === fixture.location.expectedBackgroundPath ? "pass" : "fail"}><b>{round}/{replay.rounds}</b><span>EVENT {Math.min(eventIndex + 1, replay.events.length)}/{replay.events.length}</span><span>BG {fixture.location.runtimeBattleBackgroundPath ? "CONNECTED" : "UNCONNECTED / FAIL"}</span></aside>}
  </main>;
}
