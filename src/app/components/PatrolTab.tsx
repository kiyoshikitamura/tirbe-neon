"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import {
  CHARACTERS_MASTER,
  CHARACTER_GROWTH_PATTERNS
} from "@/utils/game_constants";
import OutlawCard from "./ui/OutlawCard";
import OutlawButton from "./ui/OutlawButton";
import SubTabNav from "./ui/SubTabNav";
import SectionHeader from "./ui/SectionHeader";
import HubPage from "./ui/HubPage";
import HeroPanel from "./ui/HeroPanel";
import Badge from "./ui/Badge";
import TutorialNavigator from "./TutorialNavigator";
import CharacterPresentation from "./character/CharacterPresentation";
import { supabase } from "@/utils/supabase";
import { useScreenReadiness } from "../hooks/useScreenReadiness";
import { SCREEN_ASSET_MANIFESTS } from "../lib/screenManifests";
import "./PatrolTab.css";

export default function PatrolTab() {
  const {
    activePatrols,
    selectedTown,
    setSelectedTown,
    selectedCourse,
    setSelectedCourse,
    selectedPatrolMember,
    togglePatrolMemberSelection,
    userCharactersDbList,
    handleStartPatrol,
    dispatchLoading,
    handleInstantComplete,
    handleClaimRewards,
    dailyCashSkips,
    dailyCashSkipsResetDate,
    playCyberSe,
    patrolCourses,
    patrolNpcs,
    startCardBattle,
    lastPatrolRewards,
    setLastPatrolRewards,
    showPatrolRewardModal,
    setShowPatrolRewardModal,
    setGlobalInteractionBlocking,
    onboardingState,
    setOnboardingState,
    userLevel,
    featureOperatingStates
  } = useGame();
  const tutorialStep = onboardingState?.tutorial_step;
  const isTutorialQuestStep = ["DISPATCH", "FREE_INSTANT", "TUTORIAL_BATTLE"].includes(tutorialStep || "");
  const tutorialActiveListRef = React.useRef<HTMLDivElement>(null);
  const questActionRef = React.useRef(false);
  const battleStartRef = React.useRef(false);
  const rewardTransitionRef = React.useRef(false);
  const [rewardTransitionWorking, setRewardTransitionWorking] = React.useState(false);
  const [battleStartingId, setBattleStartingId] = React.useState<string | null>(null);

  // コースが未選択のときに初期選択を設定
  React.useEffect(() => {
    if (patrolCourses.length > 0 && (!selectedCourse || selectedCourse === "e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1")) {
      const firstCourse = patrolCourses.find((c: any) => c.town_id === selectedTown);
      if (firstCourse) {
        setSelectedCourse(firstCourse.id);
      }
    }
  }, [patrolCourses, selectedTown, selectedCourse, setSelectedCourse]);

  // The first quest reuses the normal dispatch UI, but removes route hunting:
  // the canonical first course and first available member are selected for the player.
  React.useEffect(() => {
    if (tutorialStep !== "DISPATCH") return;
    const tutorialCourse = patrolCourses.find((course: any) => course.town_id === selectedTown) || patrolCourses[0];
    if (tutorialCourse && selectedCourse !== tutorialCourse.id) setSelectedCourse(tutorialCourse.id);
    if (!selectedPatrolMember) {
      const firstAvailable = userCharactersDbList.find((character: any) =>
        !activePatrols.some((patrol: any) => patrol.characterId === character.character_id && patrol.status !== "COMPLETED")
      );
      if (firstAvailable) togglePatrolMemberSelection(firstAvailable.character_id);
    }
  }, [activePatrols, patrolCourses, selectedCourse, selectedPatrolMember, selectedTown, setSelectedCourse, togglePatrolMemberSelection, tutorialStep, userCharactersDbList]);

  React.useEffect(() => {
    if (tutorialStep === "FREE_INSTANT") {
      tutorialActiveListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tutorialStep]);

  const activeCourse = patrolCourses.find((c: any) => c.id === selectedCourse);
  const questStageIndex = tutorialStep === "DISPATCH"
    ? 2
    : tutorialStep === "FREE_INSTANT"
      ? 3
      : tutorialStep === "TUTORIAL_BATTLE"
        ? activePatrols.some((patrol: any) => patrol.battle_resolved) ? 5 : 4
        : -1;
  const questStages = ["クエスト", "メンバー", "派遣", "無料時短", "バトル", "報酬"];

  const townTabs = [
    { id: "shinjuku", label: "新宿" },
    { id: "shibuya", label: "渋谷" },
    { id: "ikebukuro", label: "池袋" },
    { id: "roppongi", label: "六本木" },
    { id: "akihabara", label: "秋葉原" },
    { id: "kawasaki", label: "川崎" },
    { id: "yokohama", label: "横浜" }
  ];

  const handleStart = async () => {
    if (questActionRef.current) return;
    questActionRef.current = true;
    setGlobalInteractionBlocking(true);
    try {
      await handleStartPatrol();
    } finally {
      questActionRef.current = false;
      setGlobalInteractionBlocking(false);
    }
  };

  const handleInstant = async (currency: "CASH" | "DIAMOND" | "FREE_TUTORIAL" | "FREE_PREOPEN", pId: string) => {
    if (questActionRef.current) return;
    questActionRef.current = true;
    setGlobalInteractionBlocking(true);
    try {
      await handleInstantComplete(currency, pId);
    } finally {
      questActionRef.current = false;
      setGlobalInteractionBlocking(false);
    }
  };

  const handleClaim = async (pId: string) => {
    if (questActionRef.current) return;
    questActionRef.current = true;
    setGlobalInteractionBlocking(true);
    try {
      await handleClaimRewards(pId, { isTutorialReward: tutorialStep === "TUTORIAL_BATTLE" });
    } finally {
      questActionRef.current = false;
      setGlobalInteractionBlocking(false);
    }
  };

  const handleBattleStart = async (patrol: any, battleNpc: any) => {
    if (!battleNpc || battleStartRef.current) return;
    battleStartRef.current = true;
    setBattleStartingId(patrol.id);
    setGlobalInteractionBlocking(true);
    try {
      await startCardBattle(
        "PATROL", battleNpc.npc_name || "敵NPC", battleNpc.id,
        undefined, undefined, undefined, undefined, undefined, undefined,
        battleNpc, patrol.id
      );
    } finally {
      battleStartRef.current = false;
      setBattleStartingId(null);
      setGlobalInteractionBlocking(false);
    }
  };

  // 背景画像の取得
  const bgImage = `/bg/bg_street_${selectedTown}.png`;
  const characterImage = (src?: string) => {
    if (!src) return "/characters/reiji_transparent_asset.png";
    return src.startsWith("/characters/") ? src : `/characters/${src.replace(/^\//, "")}`;
  };

  const closeRewardResult = async () => {
    if (tutorialStep !== "TUTORIAL_BATTLE") {
      setShowPatrolRewardModal(false);
      setLastPatrolRewards(null);
      return;
    }
    if (rewardTransitionRef.current) return;
    rewardTransitionRef.current = true;
    setRewardTransitionWorking(true);
    try {
      const { error } = await supabase.rpc("advance_tutorial_progress", {
        p_expected_step: "TUTORIAL_BATTLE",
        p_next_step: "RULE_GUIDE",
      });
      if (error) return;
      setShowPatrolRewardModal(false);
      setLastPatrolRewards(null);
      setOnboardingState((current: any) => current ? { ...current, tutorial_step: "RULE_GUIDE" } : current);
    } finally {
      rewardTransitionRef.current = false;
      setRewardTransitionWorking(false);
    }
  };

  React.useEffect(() => {
    if (!lastPatrolRewards?.isTutorialReward || tutorialStep === "TUTORIAL_BATTLE") return;
    setShowPatrolRewardModal(false);
    setLastPatrolRewards(null);
  }, [lastPatrolRewards, setLastPatrolRewards, setShowPatrolRewardModal, tutorialStep]);

  const canRenderRewardResult = showPatrolRewardModal
    && lastPatrolRewards
    && (!lastPatrolRewards.isTutorialReward || tutorialStep === "TUTORIAL_BATTLE");
  const readiness = useScreenReadiness({
    assets: [...SCREEN_ASSET_MANIFESTS.quest, { src: bgImage, required: false }],
  });

  return (
    <HubPage
      className="patrol-container"
      eyebrow="QUEST / DISPATCH"
      title="クエスト"
      description="仲間を街へ派遣し、育成素材と報酬を獲得します。"
      status={readiness.status}
      onRetry={readiness.retry}
    >
      <div className="patrol-content">
        <HeroPanel className="patrol-hero" backgroundImage={bgImage}>
          <div className="patrol-hero-status">
            <Badge tone="success">DISPATCH</Badge>
            <strong>{activePatrols.length}<small>/5</small></strong>
          </div>
          <p>派遣先と所要時間を選び、空き枠へ仲間を送り出してください。</p>
        </HeroPanel>

        {isTutorialQuestStep && (
          <nav className="quest-stage-track" aria-label="最初のクエスト進行">
            {questStages.map((stage, index) => (
              <div key={stage} className={index < questStageIndex ? "is-complete" : index === questStageIndex ? "is-current" : ""}>
                <span>{index < questStageIndex ? "✓" : index + 1}</span>
                <b>{stage}</b>
              </div>
            ))}
          </nav>
        )}
        
        <SectionHeader title={`新規クエスト派遣 (${activePatrols.length}/5 出撃中)`} />

        {tutorialStep === "DISPATCH" && (
          <OutlawCard className="mb-3 border-cyan-glow">
            <TutorialNavigator message="最初の仲間と派遣先は選択済みです。「クエスト開始」を押してください。" />
            <div className="font-size-7 text-color-cyan mt-2">最初の派遣では、この後の時短を無料で体験できます。</div>
          </OutlawCard>
        )}
        
        <div className="patrol-town-tabs-wrapper mb-3" aria-disabled={isTutorialQuestStep}>
          <SubTabNav 
            tabs={townTabs} 
            activeTabId={selectedTown} 
            onSelect={(tabId) => {
              if (isTutorialQuestStep) return;
              setSelectedTown(tabId);
              const firstCourse = patrolCourses.find((c: any) => c.town_id === tabId);
              if (firstCourse) setSelectedCourse(firstCourse.id);
              else setSelectedCourse("");
              playCyberSe("click");
            }} 
          />
        </div>

        {/* コース選択 */}
        <div className="patrol-courses-grid mb-3">
          {patrolCourses.filter((c: any) => c.town_id === selectedTown).map((c: any) => (
            <div 
              key={c.id} 
              className={`patrol-course-item ${selectedCourse === c.id ? "active" : ""}`}
              onClick={() => { if (!isTutorialQuestStep) { setSelectedCourse(c.id); playCyberSe("click"); } }}
            >
              <div className="course-name">{c.name}</div>
              <div className={`course-badge badge-${c.id.split('_').pop()}`}>
                {c.id.includes('short') ? '短期' : c.id.includes('medium') ? '中期' : c.id.includes('long') ? '長期' : '放置'}
              </div>
            </div>
          ))}
        </div>

        {/* 出撃メンバー選択 */}
        {activeCourse && (
          <OutlawCard className={`mb-4 ${tutorialStep === "DISPATCH" ? "tutorial-primary-target" : ""}`}>
            <div className="quest-v0-summary">
              <div><span>SELECTED QUEST</span><strong>{activeCourse.name}</strong></div>
              <dl><div><dt>所要</dt><dd>{activeCourse.duration_seconds >= 60 ? String(activeCourse.duration_seconds / 60) + "分" : String(activeCourse.duration_seconds) + "秒"}</dd></div><div><dt>報酬</dt><dd>{activeCourse.reward_cash.toLocaleString()} CASH</dd></div><div><dt>時短</dt><dd>{tutorialStep === "DISPATCH" ? "今回無料" : "利用可"}</dd></div></dl>
            </div>
            <div className="quest-v0-section-label">派遣する仲間 <b>1名</b></div>
            <div className="patrol-char-grid mb-3">
              {CHARACTERS_MASTER.map((c: any) => {
                const isUnlocked = userCharactersDbList.some((uc: any) => uc.character_id === c.id);
                const isHome = c.homeTown === selectedTown;
                const isSelected = selectedPatrolMember === c.id;
                
                const isAlreadyDeployed = activePatrols.some((p: any) => p.characterId === c.id && p.status !== "COMPLETED");

                const pattern = CHARACTER_GROWTH_PATTERNS.find((p: any) => p.pattern_id === c.growthPatternId) || CHARACTER_GROWTH_PATTERNS[0];
                const baseLuk = pattern.base_luk;
                
                return (
                  <div 
                    key={c.id} 
                    className={`patrol-char-item ${!isUnlocked ? "locked" : ""} ${isSelected ? "selected" : ""} ${isAlreadyDeployed ? "deployed" : ""}`} 
                    onClick={() => {
                      if (isTutorialQuestStep) return;
                      if (isUnlocked && !isAlreadyDeployed) {
                        togglePatrolMemberSelection(c.id);
                      } else if (isAlreadyDeployed) {
                        playCyberSe("error");
                      }
                    }}
                  >
                    <div className="patrol-char-portrait">
                      <CharacterPresentation
                        src={characterImage(c.img)}
                        alt={c.jpName}
                        variant="thumbnail"
                        name={c.jpName}
                      />
                    </div>
                    {isHome && <div className="char-bonus-badge">地元一致(LUK{baseLuk})</div>}
                    {isAlreadyDeployed && <div className="char-deployed-badge">出撃中</div>}
                  </div>
                );
              })}
            </div>
            <div className="course-cost-info mb-3 font-size-7 text-color-gray flex-row-gap-2">
              <span>⏱ 所要: {activeCourse.duration_seconds >= 60 ? `${activeCourse.duration_seconds / 60}分` : `${activeCourse.duration_seconds}秒`}</span>
              <span>⚡ スタミナ: {activeCourse.cost_vitality}</span>
              <span>💰 基本報酬: {activeCourse.reward_cash}</span>
            </div>
            <OutlawButton 
              onClick={handleStart}
              disabled={dispatchLoading || tutorialStep !== "DISPATCH" || !selectedCourse || !selectedPatrolMember || activePatrols.length >= 5}
              fullWidth
              variant="primary"
            >
              {dispatchLoading ? "クエスト準備中..." : "クエスト開始"}
            </OutlawButton>
          </OutlawCard>
        )}

        <div ref={tutorialActiveListRef}>
          <SectionHeader title="進行中クエスト一覧" className="mt-4" />
        </div>

        {tutorialStep === "FREE_INSTANT" && (
          <OutlawCard className="mb-3 border-cyan-glow">
            <TutorialNavigator message="派遣をCASH時短してください。チュートリアル中の今回だけ料金は0です。" />
          </OutlawCard>
        )}

        {tutorialStep === "TUTORIAL_BATTLE" && activePatrols.some((patrol: any) => patrol.battle_resolved) && !showPatrolRewardModal && (
          <OutlawCard className="mb-3 border-cyan-glow">
            <TutorialNavigator message="初勝利！確定した勝利報酬を受け取って、結果を確認しよう。" />
          </OutlawCard>
        )}

        <div className="active-patrols-list flex-col-gap-3 pb-4">
          {activePatrols.length === 0 ? (
            <div className="text-center font-size-7 text-color-gray p-4">現在進行中のクエストはありません。</div>
          ) : (
            activePatrols.map((p: any) => {
              const pCourse = patrolCourses.find((c: any) => c.id === p.courseId);
              const pChar = CHARACTERS_MASTER.find((c: any) => c.id === p.characterId);
              const battleNpc = patrolNpcs.find((npc: any) => npc.quest_id === p.courseId);
              // The mandatory tutorial action must remain available even if
              // the short quest timer reaches zero while the guide is read.
              const isTutorialInstant = tutorialStep === "FREE_INSTANT" && !p.battle_resolved;
              const isTutorialReward = tutorialStep === "TUTORIAL_BATTLE" && p.battle_resolved;
              const isComplete = p.secondsLeft <= 0 && !isTutorialInstant;
              const hasUnresolvedBattle = p.has_battle_event && !p.battle_resolved && Boolean(battleNpc);
              const cashSkipCost = Math.ceil(Math.max(p.secondsLeft, 0) / 60) * 100;
              const diamondSkipCost = Math.ceil(Math.max(p.secondsLeft, 0) / 3600) * 10;
              const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
              const cashSkipsToday = dailyCashSkipsResetDate === todayJst ? Number(dailyCashSkips || 0) : 0;
              const remainingCashSkips = Math.max(3 - cashSkipsToday, 0);

              return (
                <OutlawCard key={p.id} className={`active-patrol-card ${isTutorialInstant || isTutorialReward ? "tutorial-primary-target" : ""}`}>
                  <div className="patrol-card-header flex-between mb-2">
                    <div className="font-size-8 font-bold text-shadow-neon">{pCourse?.name || '不明なクエスト'}</div>
                    <div className="font-size-7 text-color-gray">{pChar?.jpName || '不明なキャラ'} 派遣中</div>
                  </div>
                  
                  {isComplete ? (
                    <div className="patrol-card-complete flex-col-gap-2">
                      <div className="progress-bar-container full">
                        <div className="progress-bar-fill" style={{ width: '100%' }} />
                        <span className="progress-text">帰還完了</span>
                      </div>
                      
                      {hasUnresolvedBattle ? (
                        <div className="battle-alert p-2 border-red mt-2">
                          <div className="text-color-red font-bold font-size-8 mb-1">⚠️ 敵襲発生！</div>
                          <div className="font-size-7 mb-2">エリア内でNPCとの戦闘が発生しました。</div>
                          <OutlawButton 
                            onClick={() => handleBattleStart(p, battleNpc)}
                            variant="primary"
                            disabled={dispatchLoading || battleStartingId === p.id}
                            fullWidth
                          >
                            {battleStartingId === p.id ? "バトルへ移動中..." : "戦闘開始"}
                          </OutlawButton>
                        </div>
                      ) : (
                        <OutlawButton 
                          onClick={() => handleClaim(p.id)}
                          variant="primary"
                          disabled={dispatchLoading}
                          fullWidth
                        >
                          {dispatchLoading ? "報酬確認中..." : p.battle_resolved && p.battle_result === "VICTORY" ? "勝利報酬を獲得" : "報酬獲得"}
                        </OutlawButton>
                      )}
                    </div>
                  ) : (
                    <div className="patrol-card-ongoing flex-col-gap-2">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${((p.secondsTotal - p.secondsLeft) / p.secondsTotal) * 100}%` }} 
                        />
                        <span className="progress-text">残り {p.secondsLeft}秒</span>
                      </div>
                      <div className="flex-row-gap-2 mt-1">
                        {isTutorialInstant ? (
                          <OutlawButton onClick={() => handleInstant("FREE_TUTORIAL", p.id)} disabled={dispatchLoading} variant="primary" fullWidth>
                            {dispatchLoading ? "時短処理中..." : "CASH時短（今回無料）"}
                          </OutlawButton>
                        ) : (
                          <>
                            <OutlawButton
                              onClick={() => handleInstant(featureOperatingStates?.PRE_OPEN === "OPEN" && userLevel < 8 ? "FREE_PREOPEN" : "CASH", p.id)}
                              disabled={dispatchLoading || remainingCashSkips === 0}
                              fullWidth
                            >
                              {featureOperatingStates?.PRE_OPEN === "OPEN" && userLevel < 8 ? "Pre-Open無料時短" : `CASH時短 (${cashSkipCost.toLocaleString()} / 残り${remainingCashSkips}回)`}
                            </OutlawButton>
                            <OutlawButton onClick={() => handleInstant("DIAMOND", p.id)} disabled={dispatchLoading} variant="primary" fullWidth>
                              DIA時短 ({diamondSkipCost.toLocaleString()})
                            </OutlawButton>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </OutlawCard>
              );
            })
          )}
        </div>
      </div>

      {/* 見回り完了報酬モーダルポップアップ */}
      {canRenderRewardResult && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <OutlawCard className={["patrol-reward-modal", "patrol-result-v0", "scroll-container", tutorialStep === "TUTORIAL_BATTLE" || lastPatrolRewards.battleVictory ? "is-victory" : ""].join(" ")}>
            <header className="patrol-result-heading">
              <span>クエスト完了報告</span>
              <h3>{tutorialStep === "TUTORIAL_BATTLE" || lastPatrolRewards.battleVictory ? "勝利" : "帰還完了"}</h3>
              <p>{lastPatrolRewards.courseName}</p>
            </header>

            <div className="reward-section patrol-result-rewards flex-col-gap-2">
              <div className="patrol-result-primary-reward">
                <span>獲得報酬</span>
                <strong>+{lastPatrolRewards.totalCash.toLocaleString()} CASH</strong>
                <small>プレゼントBOXへ送付</small>
              </div>
              <div className="flex-between patrol-result-row">
                <span>基本報酬</span>
                <strong>+{lastPatrolRewards.baseCash.toLocaleString()} CASH</strong>
              </div>
              
              {lastPatrolRewards.matchBonusApplied && (
                <div className="flex-between font-size-7 pl-2">
                  <span className="text-color-yellow">└ 地元一致ボーナス:</span>
                  <span className="text-color-yellow">+{lastPatrolRewards.matchBonusCash} CASH</span>
                </div>
              )}

              {lastPatrolRewards.levelBonusPercent > 0 && (
                <div className="flex-between font-size-7 pl-2">
                  <span className="text-color-cyan">└ Lvボーナス ({lastPatrolRewards.levelBonusPercent}%):</span>
                  <span className="text-color-cyan">+{lastPatrolRewards.levelBonusCash} CASH</span>
                </div>
              )}

              <div className="flex-between border-top pt-2 mt-1 patrol-result-row">
                <span>獲得経験値</span>
                <strong className="text-color-cyan">+{lastPatrolRewards.totalXp.toLocaleString()} XP</strong>
              </div>

              {lastPatrolRewards.dropItemName && (
                <div className="flex-between">
                  <span className="text-color-gray">獲得ドロップ品:</span>
                  <span className="text-color-yellow font-bold">{lastPatrolRewards.dropItemName} x{lastPatrolRewards.dropItemQty}</span>
                </div>
              )}

              {lastPatrolRewards.gearDropped && (
                <div className="flex-between mt-1 p-2" style={{ background: 'rgba(255, 0, 255, 0.1)', border: '1px solid rgba(255, 0, 255, 0.3)' }}>
                  <span className="text-color-magenta">🔥 追加ドロップ装備:</span>
                  <span className="text-color-magenta font-bold">初期武器 x1</span>
                </div>
              )}

              {lastPatrolRewards.hasBattle && (
                <div className="battle-result-section border-top pt-2 mt-2">
                  <div className={`font-size-8 font-bold mb-1 ${lastPatrolRewards.battleVictory ? 'text-color-green' : 'text-color-red'}`}>
                    NPC遭遇バトル: {lastPatrolRewards.battleVictory ? '勝利' : '敗北'}
                  </div>
                  {lastPatrolRewards.battleVictory ? (
                    <div className="pl-2 flex-col-gap-1 font-size-7 text-color-green">
                      <div className="flex-between"><span>追加キャッシュ:</span><span>+{lastPatrolRewards.battleCashBonus} CASH</span></div>
                      <div className="flex-between"><span>追加経験値:</span><span>+{lastPatrolRewards.battleXpBonus} XP</span></div>
                      {lastPatrolRewards.battleRewardItemName && (
                        <div className="flex-between"><span>追加アイテム:</span><span>{lastPatrolRewards.battleRewardItemName} x{lastPatrolRewards.battleRewardItemQty}</span></div>
                      )}
                    </div>
                  ) : (
                    <div className="font-size-7 text-color-gray pl-2 mt-1">敗北したため、追加報酬はありません。</div>
                  )}
                </div>
              )}
            </div>

            <div className="border-top pt-3 mt-3 flex-col-gap-2">
              {lastPatrolRewards.levelUpMessage && (
                <div className="patrol-result-growth">
                  <span>POWER UP</span><strong>{lastPatrolRewards.levelUpMessage}</strong>
                </div>
              )}
            </div>

            <OutlawButton 
              onClick={() => void closeRewardResult()}
              className="mt-4"
              fullWidth
              variant={tutorialStep === "TUTORIAL_BATTLE" ? "primary" : "secondary"}
              isLoading={rewardTransitionWorking}
              loadingLabel="結果を更新中..."
            >
              {tutorialStep === "TUTORIAL_BATTLE" ? "報酬を確認して次へ" : "閉じる"}
            </OutlawButton>
          </OutlawCard>
        </div>
      )}
    </HubPage>
  );
}
