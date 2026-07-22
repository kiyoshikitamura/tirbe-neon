"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import {
  CHARACTERS_MASTER,
  CHARACTER_GROWTH_PATTERNS
} from "@/utils/game_constants";
import "./PatrolTab.css";

export default function PatrolTab() {
  const {
    patrol,
    selectedTown,
    setSelectedTown,
    selectedCourse,
    setSelectedCourse,
    patrolMembers,
    togglePatrolMemberSelection,
    userCharactersDbList,
    handleStartPatrol,
    dispatchLoading,
    patrolLogs,
    handleInstantComplete,
    handleClaimRewards,
    playCyberSe,
    patrolCourses,
    patrolNpcs,
    startCardBattle,
    lastPatrolRewards,
    showPatrolRewardModal,
    setShowPatrolRewardModal
  } = useGame();

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

  // 現在見回り進行中のコース情報
  const ongoingCourse = patrol && patrolCourses.find((c: any) => c.id === patrol.courseId);

  return (
    <div className="view-container">
      <h2 className="view-title">クエスト</h2>
      
      {!patrol ? (
        <div className="quest-courses scroll-container flex-1">
          <div className="flex-row-gap-2 expedition-town-tabs pb-2 border-bottom-subtle">
            {[
              { id: "shinjuku", name: "新宿" },
              { id: "shibuya", name: "渋谷" },
              { id: "ikebukuro", name: "池袋" },
              { id: "roppongi", name: "六本木" },
              { id: "akihabara", name: "秋葉原" },
              { id: "kawasaki", name: "川崎" },
              { id: "yokohama", name: "横浜" }
            ].map(town => (
              <button 
                key={town.id} 
                className={`tab-btn font-size-8 height-26 px-3 ${selectedTown === town.id ? "active" : ""}`} 
                onClick={() => { 
                  setSelectedTown(town.id); 
                  const firstCourse = patrolCourses.find((c: any) => c.town_id === town.id);
                  if (firstCourse) setSelectedCourse(firstCourse.id);
                  else setSelectedCourse(""); 
                  playCyberSe("click"); 
                }}
              >
                {town.name}
              </button>
            ))}
          </div>

          <div className="mt-3 flex-col-gap-2">
            {patrolCourses.filter((c: any) => c.town_id === selectedTown).map((c: any) => (
              <div 
                key={c.id} 
                className={`course-card ${selectedCourse === c.id ? "active-border" : ""}`} 
                onClick={() => { setSelectedCourse(c.id); playCyberSe("click"); }}
              >
                <div className="course-header">
                  <span className="course-title">{c.name}</span>
                  <span className={`course-badge course-badge--${c.course_type.toLowerCase()}`}>
                    {c.course_type === 'EASY' ? '初級' : c.course_type === 'NORMAL' ? '中級' : '上級'}
                  </span>
                </div>
                <div className="course-details">
                  <span>所要: {c.duration_seconds}秒</span>
                  <span>スタミナ: {c.cost_vitality}</span>
                  <span>獲得キャッシュ: {c.reward_cash}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="char-picker-title mt-4">見回りメンバーの編成 (重複派遣不可・1名のみ)</div>
          <div className="char-picker-grid">
            {CHARACTERS_MASTER.map((c: any) => {
              const isUnlocked = userCharactersDbList.some((uc: any) => uc.character_id === c.id);
              const isHome = c.homeTown === selectedTown;
              const isSelected = patrolMembers.includes(c.id);
              
              // ロード時間を短縮するため、ローカルでパターン情報を引く
              const pattern = CHARACTER_GROWTH_PATTERNS.find((p: any) => p.pattern_id === c.growthPatternId) || CHARACTER_GROWTH_PATTERNS[0];
              const baseLuk = pattern.base_luk;
              
              return (
                <div 
                  key={c.id} 
                  className={`char-pick-item ${!isUnlocked ? "locked" : isSelected ? "selected" : ""} ${isHome ? "synergy-bonus" : ""}`} 
                  onClick={() => isUnlocked && togglePatrolMemberSelection(c.id)}
                >
                  <div className="char-pick-name">{c.jpName}</div>
                  {isHome && <div className="char-pick-badge text-color-yellow font-size-7 mt-1">地元一致 (LUK {baseLuk})</div>}
                </div>
              );
            })}
          </div>

          <button 
            className="dispatch-action-btn active-scale-effect mt-4" 
            onClick={handleStartPatrol} 
            disabled={dispatchLoading || !selectedCourse || patrolMembers.length === 0}
          >
            見回り開始
          </button>
        </div>
      ) : (
        <div className="dispatching-layout">
          <div className="progress-card">
            <div className="progress-header">見回り任務進行中 ({ongoingCourse?.name || ""})</div>
            <div className="time-display">{patrol.secondsLeft > 0 ? `${patrol.secondsLeft}秒` : "帰還完了"}</div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${((patrol.secondsTotal - patrol.secondsLeft) / patrol.secondsTotal) * 100}%` }} 
              />
            </div>

            {patrol.secondsLeft > 0 ? (
              <div className="skip-actions">
                <button className="skip-btn cash active-scale-effect" onClick={() => handleInstantComplete("CASH")} disabled={dispatchLoading}>キャッシュ時短</button>
                <button className="skip-btn diamond active-scale-effect" onClick={() => handleInstantComplete("DIAMOND")} disabled={dispatchLoading}>ダイヤ時短</button>
              </div>
            ) : (
              <div className="complete-actions w-full flex-col-gap-2">
                {/* バトルイベントが発生しており、未解決の場合 */}
                {patrol.has_battle_event && !patrol.battle_resolved ? (
                  <div className="battle-event-alert flex-col-gap-2 mt-2">
                    <div className="battle-event-title font-size-9 text-color-red font-bold">⚠️ 敵襲発生！</div>
                    <div className="battle-event-desc font-size-7">見回りエリアでトラブルが発生しました。NPC戦を解決してください。</div>
                    <button 
                      className="claim-reward-btn claim-reward-btn--battle active-scale-effect" 
                      onClick={() => {
                        if (ongoingCourse && ongoingCourse.battle_npc_id) {
                          const npc = patrolNpcs.find((n: any) => n.id === ongoingCourse.battle_npc_id);
                          startCardBattle("PATROL", npc?.npc_name || "敵NPC", ongoingCourse.battle_npc_id);
                        }
                      }}
                      disabled={dispatchLoading}
                    >
                      戦闘開始
                    </button>
                  </div>
                ) : (
                  <button className="claim-reward-btn active-scale-effect" onClick={handleClaimRewards} disabled={dispatchLoading}>
                    {patrol.battle_resolved && patrol.battle_result === "VICTORY" ? "勝利報酬を獲得" : "報酬獲得"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 見回り完了報酬モーダルポップアップ */}
      {showPatrolRewardModal && lastPatrolRewards && (
        <div className="modal-overlay">
          <div className="patrol-reward-modal scroll-container">
            <h3 className="modal-title text-color-yellow font-size-10 mb-3">🚨 見回り完了報告</h3>
            <div className="modal-subtitle font-size-8 text-center text-color-gray mb-3 border-bottom pb-2">
              {lastPatrolRewards.courseName}
            </div>

            <div className="reward-section flex-col-gap-2">
              <div className="reward-row">
                <span className="reward-label">獲得基本キャッシュ:</span>
                <span className="reward-val text-color-green">+{lastPatrolRewards.baseCash} CASH</span>
              </div>
              
              {lastPatrolRewards.matchBonusApplied && (
                <div className="reward-row reward-row--bonus font-size-7 text-color-yellow pl-3">
                  <span>地元一致ボーナス:</span>
                  <span>+{lastPatrolRewards.matchBonusCash} CASH</span>
                </div>
              )}

              <div className="reward-row reward-row--bonus font-size-7 text-color-cyan pl-3">
                <span>キャラクターレベルボーナス:</span>
                <span>+{lastPatrolRewards.levelBonusPercent}% (+{lastPatrolRewards.levelBonusCash} CASH)</span>
              </div>

              <div className="reward-row border-top pt-2">
                <span className="reward-label">獲得経験値:</span>
                <span className="reward-val text-color-cyan">+{lastPatrolRewards.baseXp} XP</span>
              </div>

              {lastPatrolRewards.dropItemName && (
                <div className="reward-row">
                  <span className="reward-label">獲得ドロップ品:</span>
                  <span className="reward-val text-color-yellow">{lastPatrolRewards.dropItemName} x{lastPatrolRewards.dropItemQty}</span>
                </div>
              )}

              {lastPatrolRewards.gearDropped && (
                <div className="reward-row reward-row--epic">
                  <span className="reward-label">🔥 追加ドロップ装備:</span>
                  <span className="reward-val text-color-magenta">初期武器 (WEAPON_001) x1</span>
                </div>
              )}

              {/* バトル結果表示 */}
              {lastPatrolRewards.hasBattle && (
                <div className="battle-result-section border-top pt-2 mt-2">
                  <div className={`battle-status-title font-size-8 font-bold ${lastPatrolRewards.battleVictory ? 'text-color-green' : 'text-color-red'}`}>
                    NPC遭遇バトル: {lastPatrolRewards.battleVictory ? '勝利' : '敗北'}
                  </div>
                  {lastPatrolRewards.battleVictory ? (
                    <div className="battle-rewards-list pl-3 mt-1 flex-col-gap-1 font-size-7 text-color-green">
                      <div>追加キャッシュ: +{lastPatrolRewards.battleCashBonus} CASH</div>
                      <div>追加経験値: +{lastPatrolRewards.battleXpBonus} XP</div>
                      {lastPatrolRewards.battleRewardItemName && (
                        <div>追加アイテム: {lastPatrolRewards.battleRewardItemName} x{lastPatrolRewards.battleRewardItemQty}</div>
                      )}
                    </div>
                  ) : (
                    <div className="font-size-7 text-color-gray pl-3 mt-1">敗北したため、追加報酬はありません。</div>
                  )}
                </div>
              )}
            </div>

            <div className="total-summary-section border-top pt-3 mt-3 flex-col-gap-2">
              <div className="reward-row font-size-9 font-bold">
                <span>合計獲得キャッシュ:</span>
                <span className="text-color-green font-size-10">{lastPatrolRewards.totalCash} CASH</span>
              </div>
              <div className="reward-row font-size-9 font-bold">
                <span>合計獲得経験値:</span>
                <span className="text-color-cyan font-size-10">{lastPatrolRewards.totalXp} XP</span>
              </div>
              {lastPatrolRewards.levelUpMessage && (
                <div className="level-up-alert text-color-yellow font-bold text-center mt-2 font-size-8">
                  {lastPatrolRewards.levelUpMessage}
                </div>
              )}
            </div>

            <button 
              className="modal-close-btn active-scale-effect mt-4" 
              onClick={() => setShowPatrolRewardModal(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
