"use client";

import { useEffect, useMemo, useState } from "react";
import BattleMatchupPresentation from "@/app/components/battle/BattleMatchupPresentation";
import BattleResultSummary from "@/app/components/battle/BattleResultSummary";
import QuestBattleViewer from "@/app/components/battle/QuestBattleViewer";
import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import HomeTab from "@/app/components/HomeTab";
import CharacterPresentation from "@/app/components/character/CharacterPresentation";
import PageShell from "@/app/components/ui/PageShell";
import TypewriterText from "@/app/components/tutorial/TypewriterText";
import { SkillDetailDialog, SkillIconGrid } from "@/app/components/skill/SkillPresentation";
import type { SkillCardMaster } from "@/utils/skills_master_data";
import PublicUserProfile from "@/app/components/profile/PublicUserProfile";
import { GameContext } from "@/app/context/GameContext";
import { WORLD_STAGES } from "@/app/components/SetupView";
import { QA_PRESENTATION_SCENARIOS, VISUAL_COMPLIANCE_GATE, type QaPresentationScenarioId } from "@/domain/presentation/qaHarness";
import { resolveSsrGachaQuote } from "@/domain/presentation/ssrGachaQuotes";
import { getCharacterLocationBackground } from "@/utils/characterVisualAssets";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import "@/app/components/SetupView.css";
import "@/app/components/TutorialWorldIntro.css";
import "@/app/components/CommonModals.css";
import "@/app/components/CharacterTab.css";
import "@/app/components/ui/ConfirmDialog.css";
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

function BattleFixture({ size = 3, speed = 1, ssrSkill = false, consecutiveSkill = false, finalHit = false }: { size?: 3 | 5; speed?: number; ssrSkill?: boolean; consecutiveSkill?: boolean; finalHit?: boolean }) {
  const paceDemo = speed === 2;
  const [liveSpeed, setLiveSpeed] = useState(speed);
  const [consecutiveSkillName, setConsecutiveSkillName] = useState(consecutiveSkill ? "ストリートパンチ" : "");
  const skillDemo = ssrSkill || consecutiveSkill || paceDemo;
  const [skillPhase, setSkillPhase] = useState<"ACTOR_FOCUS" | "TARGET_FOCUS" | "ATTACK_MOTION" | "IMPACT" | "DAMAGE" | "HP_TRANSITION" | "ACTION_HOLD">(skillDemo ? "ACTOR_FOCUS" : "DAMAGE");
  const [showSkillDamage, setShowSkillDamage] = useState(!skillDemo);
  const [skillHpResolved, setSkillHpResolved] = useState(false);
  useEffect(() => {
    if (!skillDemo) return;
    const timers: number[] = [];
    const targetAt = liveSpeed > 1 ? 760 : 1120;
    const attackAt = liveSpeed > 1 ? 1040 : 1480;
    const impactAt = liveSpeed > 1 ? 1300 : 1650;
    const scheduleResolution = (startAt: number, nextSkill?: string) => {
      timers.push(window.setTimeout(() => setSkillPhase("TARGET_FOCUS"), startAt + targetAt));
      timers.push(window.setTimeout(() => setSkillPhase("ATTACK_MOTION"), startAt + attackAt));
      timers.push(window.setTimeout(() => { setShowSkillDamage(true); setSkillPhase("IMPACT"); }, startAt + impactAt));
      timers.push(window.setTimeout(() => setSkillPhase("DAMAGE"), startAt + impactAt + 180));
      timers.push(window.setTimeout(() => { setSkillHpResolved(true); setSkillPhase("HP_TRANSITION"); }, startAt + impactAt + 480));
      timers.push(window.setTimeout(() => setSkillPhase("ACTION_HOLD"), startAt + impactAt + 850));
      if (nextSkill) timers.push(window.setTimeout(() => {
        setShowSkillDamage(false);
        setSkillHpResolved(false);
        setSkillPhase("ACTOR_FOCUS");
        setConsecutiveSkillName(nextSkill);
      }, startAt + impactAt + 1100));
    };
    const nextStart = impactAt + 1100;
    scheduleResolution(0, consecutiveSkill ? "ネオンブレイク" : undefined);
    if (consecutiveSkill) scheduleResolution(nextStart);
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [consecutiveSkill, liveSpeed, skillDemo]);
  const enemies = enemyParty.slice(0, size).map((entry, index) => finalHit
    ? { ...entry, hp: 0, isDead: true }
    : index === 0 && skillDemo && skillHpResolved
      ? { ...entry, hp: 900 }
      : entry);
  const timeline = [...playerParty, ...enemies].map(({ id, name, isEnemy }) => ({ id, name, isEnemy }));
  const fixtureSkillName = consecutiveSkill ? consecutiveSkillName : skillDemo ? "ストリートパンチ" : "";
  return <QuestBattleViewer battleMode="PATROL" opponentName="新宿・初級" playerParty={playerParty} enemyParty={enemies} timeline={timeline} timelineIndex={0} authoritativeTimeline={timeline.slice(0, 3)} presentationPhase={skillDemo ? skillPhase : paceDemo ? "ACTION_HOLD" : "DAMAGE"} round={4} skillCutIn={fixtureSkillName ? { charName: playerParty[0].name, skillName: fixtureSkillName } : null} targetLine={{ fromId: "player-1", toId: "enemy-1" }} shakingId={showSkillDamage ? "enemy-1" : null} damagePopup={showSkillDamage ? { charId: "enemy-1", val: ssrSkill ? 2940 : 1284, type: "dmg", isCritical: ssrSkill } : null} tactic="BALANCED" speed={liveSpeed} monthlyPassActive={false} paused={false} tutorial={size === 3 || paceDemo} onSpeedChange={setLiveSpeed} onPauseChange={() => undefined} canSkip={size === 5} skipPending={false} onSkip={() => undefined} onRetreat={() => undefined} onSound={() => undefined} />;
}

function SsrRevealFixture() {
  const [stage, setStage] = useState<"QUOTE" | "FLASH" | "REVEAL">("QUOTE");
  const [quoteComplete, setQuoteComplete] = useState(false);
  const quote = resolveSsrGachaQuote(leader.id);
  useEffect(() => {
    if (stage !== "FLASH") return;
    const timer = window.setTimeout(() => setStage("REVEAL"), 420);
    return () => window.clearTimeout(timer);
  }, [stage]);
  return <button type="button" className={`tutorial-gacha-reveal rarity-ssr ${stage === "QUOTE" ? "is-ssr-quote" : stage === "FLASH" ? "is-ssr-flash" : "is-ssr-reveal"}`} data-presentation-state={`SSR_${stage}`} data-character-id={stage === "REVEAL" ? leader.id : undefined} onClick={() => { if (stage === "QUOTE" && quoteComplete) setStage("FLASH"); }}>
    {stage === "QUOTE" ? <div className="tutorial-ssr-quote" role="status"><blockquote><TypewriterText text={quote || ""} speedMs={38} onComplete={() => setQuoteComplete(true)} /></blockquote><small>{quoteComplete ? "TAP" : "…"}</small></div> : stage === "FLASH" ? <div className="tutorial-ssr-flash" role="status" aria-label="キャラクター登場演出中"><i /></div> : <div className="tutorial-gacha-reveal-body"><CharacterPresentation src={getCharacterTransparentImg(leader.name)} alt={leader.jpName} variant="reveal" rarity="SSR" attribute={leader.alignment} backgroundSrc={getCharacterLocationBackground(leader.homeTown)} frameKind="reveal" rarityBadge attributeBadge /><div className="tutorial-gacha-reveal-copy"><h3>{leader.jpName}</h3><small>タップして次へ</small></div></div>}
  </button>;
}

function NameRetryFixture() {
  const [state, setState] = useState<"ERROR" | "RETRY" | "SUCCESS">("ERROR");
  if (state === "SUCCESS") return <div className="setup-container is-world-entry" data-name-lifecycle="success"><section className="setup-ageha-presentation" data-entry-state="AGEHA_INTRO"><div className="setup-ageha-character"><CharacterPresentation src="/characters/ageha_transparent_asset.png" alt="アゲハ" variant="dialogue-bust" /></div><div className="setup-ageha-dialogue"><div className="setup-ageha-name">アゲハ</div><span>NEON-Rね。覚えた。よろしく。</span></div><button className="semantic-cta semantic-cta--primary setup-primary-action">次へ</button></section></div>;
  return <div className="setup-container is-registration" data-name-lifecycle={state.toLowerCase()}><div className="setup-box setup-name-dialog"><div className="setup-name-guidance"><strong>アゲハ</strong><span>ここでなんて呼べばいい？</span></div><h2>プレイヤー名</h2><input className="setup-name-input" value={state === "ERROR" ? "NEON" : "NEON-R"} readOnly /><button className="semantic-cta semantic-cta--primary" onClick={() => setState("SUCCESS")}>この名前で始める</button></div>{state === "ERROR" && <div className="modal-overlay"><div className="modal-card border-danger" role="alertdialog"><div className="modal-title text-color-danger">エラー</div><div className="modal-desc">この名前はすでに使用されています。</div><button className="semantic-cta semantic-cta--danger" onClick={() => setState("RETRY")}>閉じる</button></div></div>}</div>;
}

function AutoFormationFixture() {
  const [complete, setComplete] = useState(false);
  const [continued, setContinued] = useState(false);
  return <section className="qa-card" data-auto-formation-state={continued ? "continued" : complete ? "complete" : "idle"}><span>FORMATION</span><h2>出撃編成 5/5</h2><div className="qa-formation">{playerParty.map((entry) => <CharacterPresentation key={entry.id} src={getCharacterTransparentImg(findCharacter(entry.name).name)} alt={entry.name} variant="thumbnail" />)}</div>{continued ? <p role="status">クエストへ進みます</p> : complete ? <div className="tutorial-formation-complete" role="dialog" aria-modal="true"><div className="tutorial-formation-complete-dialog"><span>FORMATION COMPLETE</span><strong>編成しました</strong><p>5人のメンバーと推奨スキルを保存しました。</p><button className="semantic-cta semantic-cta--primary" onClick={() => setContinued(true)}>OK</button></div></div> : <button className="semantic-cta semantic-cta--primary" onClick={() => setComplete(true)}>おすすめ編成にする</button>}</section>;
}

function QuestTransitionFixture({ instant }: { instant: boolean }) {
  const [state, setState] = useState<"READY" | "COMPLETE" | "ENCOUNTER" | "BATTLE">("READY");
  if (state === "BATTLE") return <BattleFixture size={3} />;
  return <section className="qa-card qa-quest-transition" data-quest-completion-mode={instant ? "instant" : "normal"} data-quest-transition-state={state.toLowerCase()}><span>{instant ? "INSTANT COMPLETE" : "NORMAL COMPLETE"}</span><h2>{state === "READY" ? "新宿へ派遣中" : state === "COMPLETE" ? "クエスト完了" : "バトル発生"}</h2><p>新宿・初級 / 敵3人</p>{state === "READY" && <button onClick={() => setState("COMPLETE")}>{instant ? "時短完了を再現" : "通常完了を再現"}</button>}{state === "COMPLETE" && <button onClick={() => setState("ENCOUNTER")}>次へ</button>}{state === "ENCOUNTER" && <button onClick={() => setState("BATTLE")}>バトルへ</button>}</section>;
}

function ResultFixture({ victory }: { victory: boolean }) {
  const rewards = victory ? { totalCash: 1000, totalXp: 120, dropItemName: "キャラEXP（小）", dropItemQty: 1 } : null;
  return <BattleResultSummary tutorial victory={victory} rewards={rewards} replayEvents={replayEvents} playerParticipants={playerParty} enemyParticipants={enemyParty.slice(0, 3)} presentationContext={{ mode: "PATROL", opponentLabel: "新宿・初級", encounterLabel: "新宿・初級", opponentLeaderCharacterId: enemyParty[0].characterId, opponentLeaderName: enemyParty[0].name }} modeResult={{ resultLabel: victory ? "QUEST CLEAR" : "QUEST FAILED", reward: victory ? "初回報酬獲得" : "編成を見直して再挑戦", continueLabel: "確認" }} onContinue={() => undefined} continueControl={<button className="battle-result-continue semantic-cta semantic-cta--primary">確認</button>} />;
}

function SimpleFixture({ kind }: { kind: QaPresentationScenarioId }) {
  if (kind === "world-introduction") return <div className="tutorial-world" aria-label="World Introduction"><div className="tutorial-world-content"><div className="tutorial-world-shade" /><div className="tutorial-world-ageha"><CharacterPresentation src="/characters/ageha_transparent_asset.png" alt="アゲハ" variant="dialogue-bust" /></div><div className="tutorial-world-dialogue"><strong>アゲハ</strong><TypewriterText text={WORLD_STAGES[1].text} speedMs={22} highlightTerms={[...WORLD_STAGES[1].highlights]} /></div><button className="semantic-cta semantic-cta--primary">次へ</button></div></div>;
  if (kind === "gacha-page") return <section className="qa-card qa-gacha"><span>アゲハ</span><p>まずは10連、引いてみよ。</p><img src="/gacha/bg_gacha_ssr.png" alt="ガチャバナー" /><small>無料10連 / SSR1体保証</small><button>無料10連を引く</button></section>;
  if (kind === "gacha-standard-reveal") { const character: any = findCharacter("アゲハ"); return <section className="qa-reveal"><CharacterPresentation src={getCharacterTransparentImg(character.name)} alt={character.jpName} variant="reveal" rarity={character.rarity} attribute={character.alignment} backgroundSrc={getCharacterLocationBackground(character.homeTown)} frameKind="reveal" rarityBadge attributeBadge /><h2>{character.jpName}</h2><small>タップして次へ</small></section>; }
  if (kind === "skill-tutorial") return <section className="qa-card"><span>SKILL TUTORIAL</span><h2>ストリートパンチ</h2><dl><div><dt>タイプ</dt><dd>攻撃</dd></div><div><dt>対象</dt><dd>敵単体</dd></div><div><dt>威力</dt><dd>120%</dd></div><div><dt>再使用</dt><dd>3ラウンド</dd></div></dl><button className="semantic-cta semantic-cta--primary tutorial-primary-target">育成へ進む</button></section>;
  if (kind === "growth-before") return <section className="qa-card qa-growth"><CharacterPresentation src={getCharacterTransparentImg(leader.name)} alt={leader.jpName} variant="card" rarity="SSR" /><span>強化前</span><h2>{leader.jpName}</h2><strong>Lv.1</strong><button className="semantic-cta semantic-cta--primary tutorial-primary-target">Lv.7まで強化</button></section>;
  if (kind === "growth-result") return <div className="outlaw-confirm-overlay qa-growth-result-overlay"><section className="outlaw-confirm-dialog neon-mode kind-result"><div className="confirm-content-wrapper"><h3 className="confirm-title">レベルアップ結果</h3><div className="growth-result-v0" data-growth-result="level-up"><span>CHARACTER GROWTH</span><strong>{leader.jpName}</strong><p className="growth-result-level">Lv.1 → Lv.7</p><small className="growth-result-power">総合力 1,840 → 2,960（+1,120）</small></div><button className="semantic-cta semantic-cta--primary">編成へ進む</button></div></section></div>;
  if (kind === "formation") return <section className="qa-card"><span>FORMATION</span><h2>現在の編成</h2><div className="qa-formation">{playerParty.map((entry) => <CharacterPresentation key={entry.id} src={getCharacterTransparentImg(findCharacter(entry.name).name)} alt={entry.name} variant="thumbnail" />)}</div><button>編成を保存</button></section>;
  if (kind === "quest-encounter") return <section className="qa-card"><span>QUEST ENCOUNTER</span><h2>新宿・初級</h2><p>敵 3人 / 推奨Lv.5 / EASY</p><button>新宿へ派遣する</button></section>;
  return null;
}

function SharedSkillFixture() {
  const [selectedSkill, setSelectedSkill] = useState<SkillCardMaster | null>(null);
  const ids = ["SKILL_001", "SKILL_002", "SKILL_003", "SKILL_004", "SKILL_005", "SKILL_006"];
  return <section className="qa-card" data-shared-skill-fixture>
    <span>SHARED SKILL PRESENTATION</span>
    {[0, 1, 3, 6].map((count) => <div key={count} data-skill-fixture-count={count}><h2>{count} SKILL</h2><SkillIconGrid skills={ids.slice(0, count)} onSelect={setSelectedSkill} /></div>)}
    {selectedSkill && <SkillDetailDialog skill={selectedSkill} onClose={() => setSelectedSkill(null)} />}
  </section>;
}

function PublicProfileFixture() {
  return <GameContext.Provider value={{ playCyberSe: () => undefined } as any}><PublicUserProfile profile={{
    id: "qa-public-user",
    status: "ready",
    username: "NEON-RIVAL",
    leaderCharacterId: enemyParty[0].characterId,
    level: 12,
    guildId: "qa-guild",
    guildName: "NIGHT CREW",
    titleName: "新宿ストリートキング",
    bio: "夜の街で、最高のチームを探しています。\n対戦よろしく！",
    totalPower: 83146,
    dailyPvpRank: 7,
    party: enemyParty.map((entry) => ({ characterId: entry.characterId, name: entry.name, level: entry.level, rarity: entry.rarity })),
  }} currentUserId="qa-self" onClose={() => undefined} onRetry={() => undefined} onDm={() => undefined} /></GameContext.Provider>;
}

type HomeScenario = "first-home-fresh" | "first-home-raid" | "first-home-guild-out" | "first-home-guild-in";

function ProductionHomeFixture({ scenario }: { scenario: HomeScenario }) {
  const homeLeader: any = findCharacter("アゲハ");
  const raidActive = scenario === "first-home-raid";
  const guildJoined = scenario === "first-home-guild-in";
  const activationComplete = scenario === "first-home-guild-out" || guildJoined;
  const noop = () => undefined;
  const game = {
    activeTab: "home",
    currentBaseId: "shinjuku",
    selectedLeader: homeLeader.id,
    selectedMembers: playerParty.map((entry) => entry.characterId),
    unreadMissionsCount: 2,
    unclaimedPresentsCount: 1,
    guildChats: [],
    chatUnreadCounts: {},
    bbsUnreadTotal: 0,
    dmUnreadTotal: 0,
    selectedBgMode: "auto",
    titleEquipped: "半グレの首領",
    userTitle: "半グレの首領",
    ownedTitles: [],
    interiorItem: "none",
    equippedFrontEffect: "effect_none",
    totalPower: 7420,
    totalPowerLoading: false,
    monthlyPassActive: false,
    isRaidActive: raidActive,
    session: null,
    activePatrols: [],
    onboardingState: { tutorial_step: "AUTHENTICATION" },
    userGuildMember: guildJoined ? { role: "MEMBER" } : null,
    userGuild: guildJoined ? { name: "NEON CREW" } : null,
    featureOperatingStates: [],
    username: "NEON-R",
    userLevel: 2,
    userXp: 120,
    cash: 4200,
    diamonds: 300,
    vitality: 95,
    vitalityNextRecoveryAt: new Date(Date.now() + 180_000).toISOString(),
    setShowMissionPanel: noop,
    setShowInboxPanel: noop,
    setInboxPanelTab: noop,
    setShowSettingsPanel: noop,
    setShowMoveBaseModal: noop,
    setShowTribeChatPanel: noop,
    navigateTab: noop,
    playCyberSe: noop,
    fetchPlayerDetail: noop,
  };
  const milestones = activationComplete || raidActive ? ["first_pvp", "ranking_viewed"] : [];
  const activities = [{ id: "qa-activity", activity_type: "SSR_CHARACTER", actor_user_id: "other-user", actor_display_name: "KAI", created_at: new Date().toISOString() }];
  return <GameContext.Provider value={game}>
    <div className="qa-production-home" data-home-scenario={scenario} data-raid-active={String(raidActive)} data-guild-joined={String(guildJoined)}>
      <PageShell header={<Header />} footer={<Footer />}>
        <HomeTab qaState={{ socialActivities: activities, funnelMilestones: milestones }} />
      </PageShell>
    </div>
  </GameContext.Provider>;
}

function Scenario({ id }: { id: QaPresentationScenarioId }) {
  if (id.startsWith("first-home-")) return <ProductionHomeFixture scenario={id as HomeScenario} />;
  if (id === "gacha-ssr-reveal") return <SsrRevealFixture />;
  if (id === "battle-5v3") return <BattleFixture size={3} />;
  if (id === "battle-5v5") return <BattleFixture size={5} />;
  if (id === "battle-2x") return <BattleFixture size={5} speed={2} />;
  if (id === "battle-ssr-skill") return <BattleFixture size={5} ssrSkill />;
  if (id === "battle-consecutive-skill") return <BattleFixture size={5} speed={2} consecutiveSkill />;
  if (id === "battle-final-hit") return <BattleFixture size={3} finalHit />;
  if (id === "battle-result-win") return <ResultFixture victory />;
  if (id === "battle-result-lose") return <ResultFixture victory={false} />;
  if (id === "quest-encounter") return <SimpleFixture kind={id} />;
  if (id === "quest-normal-battle") return <QuestTransitionFixture instant={false} />;
  if (id === "quest-instant-battle") return <QuestTransitionFixture instant />;
  if (id === "auto-formation") return <AutoFormationFixture />;
  if (id === "formation") return <SimpleFixture kind={id} />;
  if (id === "growth-before" || id === "growth-result") return <SimpleFixture kind={id} />;
  if (id === "skill-tutorial") return <SimpleFixture kind={id} />;
  if (id === "shared-skill-presentation") return <SharedSkillFixture />;
  if (id === "public-user-profile") return <PublicProfileFixture />;
  if (id === "gacha-standard-reveal" || id === "gacha-page") return <SimpleFixture kind={id} />;
  if (id === "name-input-error") return <NameRetryFixture />;
  if (id === "world-introduction") return <SimpleFixture kind={id} />;
  return <BattleMatchupPresentation playerLeader={playerParty[0]} opponentLeader={enemyParty[0]} context={{ mode: "PATROL", opponentLabel: "新宿・初級", encounterLabel: "新宿・初級", opponentLeaderCharacterId: enemyParty[0].characterId, opponentLeaderName: enemyParty[0].name }} imageFor={(id) => { const master: any = CHARACTERS_MASTER.find((entry: any) => entry.id === id); return master ? getCharacterTransparentImg(master.name) : undefined; }} />;
}

export default function QaPresentationHarness() {
  const [scenario, setScenario] = useState<QaPresentationScenarioId>("world-introduction");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("scenario");
    if (QA_PRESENTATION_SCENARIOS.some(([id]) => id === requested)) setScenario(requested as QaPresentationScenarioId);
  }, []);
  const label = useMemo(() => QA_PRESENTATION_SCENARIOS.find(([id]) => id === scenario)?.[1], [scenario]);
  const fullscreenHome = scenario.startsWith("first-home-");
  return <main className={`qa-harness${fullscreenHome ? " is-home-preview" : ""}`} data-qa-harness="presentation"><header><div><small>PREVIEW / DEVELOPMENT ONLY</small><h1>Human QA Harness</h1><p>{label}</p></div><a href="#compliance">Visual Compliance</a></header><nav aria-label="QA scenarios">{QA_PRESENTATION_SCENARIOS.map(([id, name]) => <button key={id} className={scenario === id ? "is-active" : ""} aria-pressed={scenario === id} onClick={() => setScenario(id)} data-scenario-id={id}>{name}</button>)}</nav><section className="qa-stage" data-active-scenario={scenario}><Scenario key={scenario} id={scenario} /></section><section id="compliance" className="qa-compliance"><h2>Visual Compliance Precheck</h2><p>客観的Contractは自動検証。見た目の品質はHuman ReviewまでPASSにしません。</p>{VISUAL_COMPLIANCE_GATE.map((item) => <article key={item.id} data-compliance-id={item.id} data-status={item.status}><div><strong>{item.specification}</strong><small>AUTO {item.automatedPrecheck}</small></div><b>{item.status}</b><p>{item.evidence}</p></article>)}</section></main>;
}
