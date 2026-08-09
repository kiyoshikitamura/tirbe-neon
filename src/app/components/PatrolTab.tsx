"use client";

import React from "react";
import Image from "next/image";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
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
    playCyberSe,
    patrolCourses,
    patrolNpcs,
    startCardBattle,
    lastPatrolRewards,
    showPatrolRewardModal,
    setShowPatrolRewardModal,
    setGlobalInteractionBlocking,
    session
  } = useGame();
  const [tutorialStep, setTutorialStep] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!session?.user?.id) return;
    const loadTutorialStep = async () => {
      const { data } = await supabase
        .from("tutorial_progress")
        .select("step_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setTutorialStep(data?.step_id ?? null);
    };
    void loadTutorialStep();
  }, [session?.user?.id]);

  // コースが未選択のときに初期選択を設定
  React.useEffect(() => {
    if (patrolCourses.length > 0 && (!selectedCourse || selectedCourse === "e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1")) {
      const firstCourse = patrolCourses.find((c: any) => c.town_id === selectedTown);
      if (firstCourse) {
        setSelectedCourse(firstCourse.id);
      }
    }
  }, [patrolCourses, selectedTown, selectedCourse, setSelectedCourse]);

  const activeCourse = patrolCourses.find((c: any) => c.id === selectedCourse);

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
    setGlobalInteractionBlocking(true);
    await handleStartPatrol();
    setGlobalInteractionBlocking(false);
  };

  const handleInstant = async (currency: "CASH" | "DIAMOND" | "FREE_TUTORIAL", pId: string) => {
    setGlobalInteractionBlocking(true);
    await handleInstantComplete(currency, pId);
    if (currency === "FREE_TUTORIAL") setTutorialStep("TUTORIAL_BATTLE");
    setGlobalInteractionBlocking(false);
  };

  const handleClaim = async (pId: string) => {
    setGlobalInteractionBlocking(true);
    await handleClaimRewards(pId);
    setGlobalInteractionBlocking(false);
  };

  // 背景画像の取得
  const bgImage = `/bg/bg_street_${selectedTown}.png`;
  const characterImage = (src?: string) => {
    if (!src) return "/characters/reiji_transparent_asset.png";
    return src.startsWith("/characters/") ? src : `/characters/${src.replace(/^\//, "")}`;
  };
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
        
        <SectionHeader title={`新規クエスト派遣 (${activePatrols.length}/5 出撃中)`} />
        
        <div className="patrol-town-tabs-wrapper mb-3">
          <SubTabNav 
            tabs={townTabs} 
            activeTabId={selectedTown} 
            onSelect={(tabId) => {
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
              onClick={() => { setSelectedCourse(c.id); playCyberSe("click"); }}
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
          <OutlawCard className="mb-4">
            <div className="font-size-8 text-color-gray mb-2">派遣メンバーの選択 (1名)</div>
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
                      if (isUnlocked && !isAlreadyDeployed) {
                        togglePatrolMemberSelection(c.id);
                      } else if (isAlreadyDeployed) {
                        playCyberSe("error");
                      }
                    }}
                  >
                    <div className="patrol-char-portrait">
                      <Image src={characterImage(c.img)} alt="" fill sizes="72px" />
                    </div>
                    <div className="char-name">{c.jpName}</div>
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
              disabled={dispatchLoading || !selectedCourse || !selectedPatrolMember || activePatrols.length >= 5}
              fullWidth
              variant="danger"
            >
              クエスト開始
            </OutlawButton>
          </OutlawCard>
        )}

        <SectionHeader title="進行中クエスト一覧" className="mt-4" />

        <div className="active-patrols-list flex-col-gap-3 pb-4">
          {activePatrols.length === 0 ? (
            <div className="text-center font-size-7 text-color-gray p-4">現在進行中のクエストはありません。</div>
          ) : (
            activePatrols.map((p: any) => {
              const pCourse = patrolCourses.find((c: any) => c.id === p.courseId);
              const pChar = CHARACTERS_MASTER.find((c: any) => c.id === p.characterId);
              const isComplete = p.secondsLeft <= 0;
              const hasUnresolvedBattle = p.has_battle_event && !p.battle_resolved;

              return (
                <OutlawCard key={p.id} className="active-patrol-card">
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
                            onClick={() => {
                              if (pCourse && pCourse.battle_npc_id) {
                                const npc = patrolNpcs.find((n: any) => n.id === pCourse.battle_npc_id);
                                startCardBattle("PATROL", npc?.npc_name || "敵NPC", pCourse.battle_npc_id);
                              }
                            }}
                            variant="danger"
                            disabled={dispatchLoading}
                            fullWidth
                          >
                            戦闘開始
                          </OutlawButton>
                        </div>
                      ) : (
                        <OutlawButton 
                          onClick={() => handleClaim(p.id)}
                          variant="primary"
                          disabled={dispatchLoading}
                          fullWidth
                        >
                          {p.battle_resolved && p.battle_result === "VICTORY" ? "勝利報酬を獲得" : "報酬獲得"}
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
                        <OutlawButton onClick={() => handleInstant("CASH", p.id)} disabled={dispatchLoading} fullWidth>CASH時短</OutlawButton>
                        <OutlawButton onClick={() => handleInstant("DIAMOND", p.id)} disabled={dispatchLoading} variant="primary" fullWidth>DIA時短</OutlawButton>
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
      {showPatrolRewardModal && lastPatrolRewards && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <OutlawCard className="patrol-reward-modal scroll-container">
            <h3 className="modal-title text-color-yellow font-size-10 mb-3 text-center text-shadow-neon">🚨 クエスト完了報告</h3>
            <div className="modal-subtitle font-size-8 text-center text-color-gray mb-3 border-bottom pb-2">
              {lastPatrolRewards.courseName}
            </div>

            <div className="reward-section flex-col-gap-2">
              <div className="flex-between">
                <span className="text-color-gray">獲得基本キャッシュ:</span>
                <span className="text-color-green font-bold">+{lastPatrolRewards.baseCash} CASH</span>
              </div>
              
              {lastPatrolRewards.matchBonusApplied && (
                <div className="flex-between font-size-7 pl-2">
                  <span className="text-color-yellow">└ 地元一致ボーナス:</span>
                  <span className="text-color-yellow">+{lastPatrolRewards.matchBonusCash} CASH</span>
                </div>
              )}

              <div className="flex-between font-size-7 pl-2">
                <span className="text-color-cyan">└ Lvボーナス ({lastPatrolRewards.levelBonusPercent}%):</span>
                <span className="text-color-cyan">+{lastPatrolRewards.levelBonusCash} CASH</span>
              </div>

              <div className="flex-between border-top pt-2 mt-1">
                <span className="text-color-gray">獲得経験値:</span>
                <span className="text-color-cyan font-bold">+{lastPatrolRewards.baseXp} XP</span>
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
              <div className="flex-between font-size-9">
                <span className="font-bold">合計獲得キャッシュ:</span>
                <span className="text-color-green font-bold text-shadow-neon">{lastPatrolRewards.totalCash} CASH</span>
              </div>
              <div className="flex-between font-size-9">
                <span className="font-bold">合計獲得経験値:</span>
                <span className="text-color-cyan font-bold text-shadow-neon">{lastPatrolRewards.totalXp} XP</span>
              </div>
              {lastPatrolRewards.levelUpMessage && (
                <div className="text-color-yellow font-bold text-center mt-3 font-size-8 p-2" style={{ background: 'rgba(255, 204, 0, 0.1)' }}>
                  {lastPatrolRewards.levelUpMessage}
                </div>
              )}
            </div>

            <OutlawButton 
              onClick={() => setShowPatrolRewardModal(false)}
              className="mt-4"
              fullWidth
            >
              閉じる
            </OutlawButton>
          </OutlawCard>
        </div>
      )}
    </HubPage>
  );
}
