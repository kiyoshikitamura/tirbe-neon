"use client";

import { useMemo, useState } from "react";
import BattleMatchupPresentation from "@/app/components/battle/BattleMatchupPresentation";
import BattleResultSummary from "@/app/components/battle/BattleResultSummary";
import QuestBattleViewer from "@/app/components/battle/QuestBattleViewer";
import CharacterPresentation from "@/app/components/character/CharacterPresentation";
import TypewriterText from "@/app/components/tutorial/TypewriterText";
import { WORLD_STAGES } from "@/app/components/SetupView";
import { QA_PRESENTATION_SCENARIOS, VISUAL_COMPLIANCE_GATE, type QaPresentationScenarioId } from "@/domain/presentation/qaHarness";
import { resolveSsrGachaQuote } from "@/domain/presentation/ssrGachaQuotes";
import { getCharacterLocationBackground } from "@/utils/characterVisualAssets";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import "@/app/components/SetupView.css";
import "@/app/components/CommonModals.css";
import "./qa-presentation.css";

const findCharacter = (jpName: string) => CHARACTERS_MASTER.find((entry: any) => entry.jpName === jpName) ?? CHARACTERS_MASTER[0];
const leader = findCharacter("レイジ");
const playerNames = ["レイジ", "アゲハ", "ゴウ", "カエデ", "コハル"];
const enemyNames = ["ケンゴ", "レオ", "ミオ", "ミヤビ", "カレン"];

const participant = (jpName: string, index: number, isEnemy: boolean) => {
  const master: any = findCharacter(jpName);
  return {
    id: `${isEnemy ? "enemy" : "player"}-${index + 1}`,
    characterId: master.id,
    name: master.jpName,
    hp: Math.max(600, 2200 - index * 190),
    maxHp: 2400,
    level: isEnemy ? 5 : 7,
    awakeningLevel: index === 0 ? 1 : 0,
    rarity: master.rarity,
    alignment: master.alignment,
    isEnemy,
    activeEffects: index === 1 ? [{ id: "SHIELD", kind: "SHIELD", remainingDuration: 2 }] : [],
  };
};

const playerParty = playerNames.map((name, index) => participant(name, index, false));
const enemyParty = enemyNames.map((name, index) => participant(name, index, true));
const replayEvents = [
  { type: "DAMAGE", payload: { actorId: "player-1", targetId: "enemy-1", hpDamage: 1850 } },
  { type: "DAMAGE", payload: { actorId: "player-2", targetId: "enemy-2", hpDamage: 940 } },
  { type: "HEAL", payload: { actorId: "player-5", targetId: "player-1", effectiveAmount: 760 } },
  { type: "EFFECT", payload: { actorId: "player-1", targetId: "player-1", kind: "SHIELD", amount: 420 } },
  { type: "DEFEAT", payload: { targetId: "enemy-1" } },
  { type: "DAMAGE", payload: { actorId: "enemy-1", targetId: "player-3", hpDamage: 1080 } },
] as const;

function BattleFixture({ size = 3, speed = 1, ssrSkill = false }: { size?: 3 | 5; speed?: number; ssrSkill?: boolean }) {
  const enemies = enemyParty.slice(0, size);
  const timeline = [...playerParty, ...enemies].map(({ id, name, isEnemy }) => ({ id, name, isEnemy }));
  return <QuestBattleViewer battleMode="PATROL" opponentName="新宿・初級" playerParty={playerParty} enemyParty={enemies} timeline={timeline} timelineIndex={0} authoritativeTimeline={timeline.slice(0, 3)} presentationPhase="DAMAGE" round={4} skillCutIn={ssrSkill || speed === 2 ? { charName: playerParty[0].name, skillName: "ストリートパンチ" } : null} targetLine={{ fromId: "player-1", toId: "enemy-1" }} shakingId="enemy-1" damagePopup={{ charId: "enemy-1", val: ssrSkill ? 2940 : 1284, type: "dmg", isCritical: ssrSkill }} tactic="BALANCED" speed={speed} monthlyPassActive={false} paused={false} tutorial={size === 3} onSpeedChange={() => undefined} onPauseChange={() => undefined} canSkip={size === 5} skipPending={false} onSkip={() => undefined} onRetreat={() => undefined} onSound={() => undefined} />;
}

function SsrRevealFixture() {
  const [revealed, setRevealed] = useState(false);
  const quote = resolveSsrGachaQuote(leader.id);
  return <button type="button" className={`tutorial-gacha-reveal rarity-ssr ${revealed ? "is-ssr-reveal" : "is-ssr-quote"}`} data-presentation-state={revealed ? "SSR_REVEAL" : "SSR_QUOTE"} data-character-id={revealed ? leader.id : undefined} onClick={() => setRevealed(true)}>
    {!revealed ? <div className="tutorial-ssr-quote" role="status"><span>SSR SPECIAL INTRODUCTION</span><strong>SSR</strong><blockquote>{quote}</blockquote><small>TAP TO CONTINUE</small></div> : <div className="tutorial-gacha-reveal-body"><CharacterPresentation src={getCharacterTransparentImg(leader.name)} alt={leader.jpName} variant="reveal" rarity="SSR" attribute={leader.alignment} backgroundSrc={getCharacterLocationBackground(leader.homeTown)} frameKind="reveal" rarityBadge attributeBadge /><div className="tutorial-gacha-reveal-copy"><h3>{leader.jpName}</h3><small>タップして次へ</small></div></div>}
  </button>;
}

function ResultFixture({ victory }: { victory: boolean }) {
  return <BattleResultSummary victory={victory} replayEvents={replayEvents} playerParticipants={playerParty} enemyParticipants={enemyParty.slice(0, 3)} presentationContext={{ mode: "PATROL", opponentLabel: "新宿・初級", encounterLabel: "新宿・初級", opponentLeaderCharacterId: enemyParty[0].characterId, opponentLeaderName: enemyParty[0].name }} modeResult={{ resultLabel: victory ? "QUEST CLEAR" : "QUEST FAILED", reward: victory ? "初回報酬獲得" : "編成を見直して再挑戦", continueLabel: "確認" }} onContinue={() => undefined} continueControl={<button className="battle-result-continue semantic-cta semantic-cta--primary">確認</button>} />;
}

function SimpleFixture({ kind }: { kind: QaPresentationScenarioId }) {
  if (kind === "world-introduction") return <div className="setup-container is-world-entry"><div className="setup-world-shade" /><section className="setup-world-presentation is-stage-2" aria-label="TRIBE NEON プロローグ"><div className="setup-world-motion"><i /><i /></div><div className="setup-world-brand">TRIBE NEON <small>PROLOGUE</small></div><img className="setup-world-emblem" src="/branding/tribe-neon-logo.png" alt="" /><div className="setup-world-copy"><TypewriterText text={WORLD_STAGES[1].text} speedMs={22} highlightTerms={[...WORLD_STAGES[1].highlights]} /></div></section></div>;
  if (kind === "name-input-error") return <div className="setup-container is-registration"><div className="setup-box setup-name-dialog"><div className="setup-name-guidance"><strong>アゲハ</strong><span>ここでなんて呼べばいい？</span></div><h2>プレイヤー名</h2><input className="setup-name-input" value="NEON" readOnly /><button className="semantic-cta semantic-cta--primary">この名前で始める</button></div><div className="modal-overlay"><div className="modal-card border-danger" role="alertdialog"><div className="modal-title text-color-danger">エラー</div><div className="modal-desc">この名前はすでに使用されています。</div><button className="semantic-cta semantic-cta--danger">閉じる</button></div></div></div>;
  if (kind === "gacha-page") return <section className="qa-card qa-gacha"><span>アゲハ</span><p>まずは10連、引いてみよ。</p><img src="/gacha/bg_gacha_ssr.png" alt="ガチャバナー" /><small>無料10連 / SSR1体保証</small><button>無料10連を引く</button></section>;
  if (kind === "gacha-standard-reveal") { const character: any = findCharacter("アゲハ"); return <section className="qa-reveal"><CharacterPresentation src={getCharacterTransparentImg(character.name)} alt={character.jpName} variant="reveal" rarity={character.rarity} attribute={character.alignment} backgroundSrc={getCharacterLocationBackground(character.homeTown)} frameKind="reveal" rarityBadge attributeBadge /><h2>{character.jpName}</h2><small>タップして次へ</small></section>; }
  if (kind === "skill-tutorial") return <section className="qa-card"><span>SKILL TUTORIAL</span><h2>ストリートパンチ</h2><dl><div><dt>タイプ</dt><dd>攻撃</dd></div><div><dt>対象</dt><dd>敵単体</dd></div><div><dt>威力</dt><dd>120%</dd></div><div><dt>再使用</dt><dd>3ラウンド</dd></div></dl></section>;
  if (kind === "growth-before" || kind === "growth-result") return <section className="qa-card qa-growth"><CharacterPresentation src={getCharacterTransparentImg(leader.name)} alt={leader.jpName} variant="card" rarity="SSR" /><span>{kind === "growth-before" ? "強化前" : "GROWTH COMPLETE"}</span><h2>{leader.jpName}</h2><strong>Lv.{kind === "growth-before" ? "1" : "7"}</strong>{kind === "growth-result" && <><p>Lv.1 → Lv.7</p><b>総合力 1,840 → 2,960</b></>}</section>;
  if (kind === "formation") return <section className="qa-card"><span>FORMATION</span><h2>現在の編成</h2><div className="qa-formation">{playerParty.map((entry) => <CharacterPresentation key={entry.id} src={getCharacterTransparentImg(findCharacter(entry.name).name)} alt={entry.name} variant="thumbnail" />)}</div><button>編成を保存</button></section>;
  if (kind === "quest-encounter") return <section className="qa-card"><span>QUEST ENCOUNTER</span><h2>新宿・初級</h2><p>敵 3人 / 推奨Lv.5 / EASY</p><button>新宿へ派遣する</button></section>;
  if (kind === "first-home") return <section className="qa-card qa-home"><span>LIVE　SSR獲得：ゴウ</span><CharacterPresentation src={getCharacterTransparentImg(leader.name)} alt={leader.jpName} variant="full-body" rarity="SSR" /><h2>{leader.jpName}</h2><button>次にすること：最初のPvPへ</button></section>;
  return null;
}

function Scenario({ id }: { id: QaPresentationScenarioId }) {
  if (id === "gacha-ssr-reveal") return <SsrRevealFixture />;
  if (id === "battle-5v3") return <BattleFixture size={3} />;
  if (id === "battle-5v5") return <BattleFixture size={5} />;
  if (id === "battle-2x") return <BattleFixture size={5} speed={2} />;
  if (id === "battle-ssr-skill") return <BattleFixture size={5} ssrSkill />;
  if (id === "battle-result-win") return <ResultFixture victory />;
  if (id === "battle-result-lose") return <ResultFixture victory={false} />;
  if (id === "quest-encounter") return <SimpleFixture kind={id} />;
  if (id === "formation") return <SimpleFixture kind={id} />;
  if (id === "growth-before" || id === "growth-result") return <SimpleFixture kind={id} />;
  if (id === "skill-tutorial") return <SimpleFixture kind={id} />;
  if (id === "gacha-standard-reveal" || id === "gacha-page") return <SimpleFixture kind={id} />;
  if (id === "name-input-error" || id === "world-introduction" || id === "first-home") return <SimpleFixture kind={id} />;
  return <BattleMatchupPresentation playerLeader={playerParty[0]} opponentLeader={enemyParty[0]} context={{ mode: "PATROL", opponentLabel: "新宿・初級", encounterLabel: "新宿・初級", opponentLeaderCharacterId: enemyParty[0].characterId, opponentLeaderName: enemyParty[0].name }} imageFor={(id) => { const master: any = CHARACTERS_MASTER.find((entry: any) => entry.id === id); return master ? getCharacterTransparentImg(master.name) : undefined; }} />;
}

export default function QaPresentationHarness() {
  const [scenario, setScenario] = useState<QaPresentationScenarioId>("world-introduction");
  const label = useMemo(() => QA_PRESENTATION_SCENARIOS.find(([id]) => id === scenario)?.[1], [scenario]);
  return <main className="qa-harness" data-qa-harness="presentation"><header><div><small>PREVIEW / DEVELOPMENT ONLY</small><h1>Human QA Harness</h1><p>{label}</p></div><a href="#compliance">Visual Compliance</a></header><nav aria-label="QA scenarios">{QA_PRESENTATION_SCENARIOS.map(([id, name]) => <button key={id} className={scenario === id ? "is-active" : ""} aria-pressed={scenario === id} onClick={() => setScenario(id)} data-scenario-id={id}>{name}</button>)}</nav><section className="qa-stage" data-active-scenario={scenario}><Scenario id={scenario} /></section><section id="compliance" className="qa-compliance"><h2>Visual Compliance Precheck</h2><p>客観的Contractは自動検証。見た目の品質はHuman ReviewまでPASSにしません。</p>{VISUAL_COMPLIANCE_GATE.map((item) => <article key={item.id} data-compliance-id={item.id} data-status={item.status}><div><strong>{item.specification}</strong><small>AUTO {item.automatedPrecheck}</small></div><b>{item.status}</b><p>{item.evidence}</p></article>)}</section></main>;
}
