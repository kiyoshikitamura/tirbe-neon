"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import CharacterPresentation from "./character/CharacterPresentation";
import QuestBattleViewer from "./battle/QuestBattleViewer";
import BattleResultSummary from "./battle/BattleResultSummary";
import BattleMatchupPresentation from "./battle/BattleMatchupPresentation";
import { preloadBattleEffects } from "./battle/BattleEffectPresentation";
import { preloadTutorialCompletionAssets } from "../lib/tutorialCompletionAssets";
import "./CardBattleView.css";

export default function CardBattleView() {
  const {
    battleMode,
    battleOpponentName,
    battleState,
    battleOutcome,
    tutorialBattleActive,
    tactic,
    setTactic,
    battleSpeed,
    setBattleSpeed,
    monthlyPassActive,
    isAutoPaused,
    setIsAutoPaused,
    setConfirmDialogConfig,
    playerPartyStates,
    enemyPartyStates,
    timeline,
    timelineIndex,
    battleRound,
    activeSkillCutIn,
    targetLine,
    activeShakingCharId,
    damagePopup,
    battleResultReplayEvents,
    battlePresentationContext,
    battleModeResultDetail,
    battleSkipPending,
    presentationPhase,
    authoritativeTimeline,
    launchBattlePlaying,
    skipBattlePresentation,
    endBattleSession,
    completeBattleResult,
    completeTutorialBattleResult,
    lastPatrolRewards,
    playCyberSe,
    handleFirstUserInteraction,
    playSe,
    preloadAudio
  } = useGame();
  const isTutorialBattle = battleMode === "PATROL" && tutorialBattleActive;

  // SETUP画面でカードタップ時に開く閲覧専用詳細ポップアップ
  const [selectedCharDetail, setSelectedCharDetail] = useState<any | null>(null);
  const [setupLaunching, setSetupLaunching] = useState(false);

  const battleLaunchRef = useRef(false);

  useEffect(() => {
    preloadBattleEffects();
    preloadAudio({
      scene: "BATTLE",
      events: ["BATTLE_START", "BATTLE_ATTACK", "BATTLE_SLASH", "BATTLE_GUN", "BATTLE_SKILL", "BATTLE_DAMAGE", "BATTLE_CRITICAL", "BATTLE_WEAK", "VICTORY", "DEFEAT"],
    });
  }, [preloadAudio]);

  useEffect(() => {
    if (battleState === "SETUP") {
      battleLaunchRef.current = false;
      requestAnimationFrame(() => {
        setSetupLaunching(false);
        requestAnimationFrame(() => {
          const setup = document.querySelector<HTMLElement>(".tutorial-battle-setup");
          setup?.scrollTo({ top: 0 });
          setup?.querySelector<HTMLElement>(".setup-scroll-area")?.scrollTo({ top: 0 });
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
      });
    }
  }, [battleState]);

  useEffect(() => {
    if (isTutorialBattle && battleState === "RESULT") {
      void preloadTutorialCompletionAssets();
    }
  }, [battleState, isTutorialBattle]);

  const launchBattleOnce = () => {
    if (battleLaunchRef.current) return;
    battleLaunchRef.current = true;
    setSetupLaunching(true);
    playSe("BATTLE_START");
    window.setTimeout(() => launchBattlePlaying(), 1000);
  };

  const launchRegularBattle = () => {
    if (battleLaunchRef.current) return;
    battleLaunchRef.current = true;
    setSetupLaunching(true);
    playSe("BATTLE_START");
    window.setTimeout(() => launchBattlePlaying(), 1000);
  };

  if (!battleMode || !battleState) return null;
  const getBattleCharacterImage = (characterId: string | undefined) => {
    const master = CHARACTERS_MASTER.find((character: any) => character.id === characterId || character.name === characterId);
    return master ? getCharacterTransparentImg(master.name) : undefined;
  };

  if (battleState === "ENDING" || battleState === "OUTCOME" || battleState === "RESULT") {
    const victory = battleOutcome === "VICTORY";
    return (
      <div className={`battle-screen battle-ending-screen is-${battleState.toLowerCase()}`} data-battle-outcome={battleOutcome || "PENDING"} data-acceptance-state={battleState === "ENDING" ? "B5" : battleState === "RESULT" ? "B6" : undefined}>
        <div className="battle-ending-backdrop" aria-hidden="true" />
        {battleState === "ENDING" ? (
          <div className="battle-ending-hold" role="status" aria-label="バトル終了演出">
            <span>FINAL</span>
            <i />
          </div>
        ) : battleState === "OUTCOME" ? (
          <div className={`battle-outcome-mark ${victory ? "is-victory" : "is-defeat"}`} role="status">
            <span>バトル結果</span>
            <strong>{victory ? "WIN" : "LOSE"}</strong>
          </div>
        ) : (
          <BattleResultSummary
            victory={victory}
            tutorial={isTutorialBattle}
            rewards={battleMode === "PATROL" ? lastPatrolRewards : null}
            replayEvents={battleResultReplayEvents}
            playerParticipants={playerPartyStates}
            enemyParticipants={enemyPartyStates}
            presentationContext={battlePresentationContext}
            modeResult={battleModeResultDetail}
            onContinue={isTutorialBattle ? completeTutorialBattleResult : completeBattleResult}
          />
        )}
      </div>
    );
  }

  // 1. SETUP 出撃準備画面
  if (battleState === "SETUP") {
    const isPvP = battleMode === "PVP" || battleMode === "PVP_PRACTICE" || battleMode === "GVG";
    const enemyPower = enemyPartyStates.reduce((total: number, enemy: any) => {
      const stats = enemy.stats || {};
      return total + Number(enemy.maxHp || 0) + Number(stats.atk || 0) + Number(stats.def || 0);
    }, 0);
    const enemySkills = enemyPartyStates.flatMap((enemy: any) => enemy.skills || []);
    const playerPower = playerPartyStates.reduce((total: number, player: any) => total + Number(player.maxHp || 0) + Number(player.stats?.atk || 0) + Number(player.stats?.def || 0), 0);

    if (setupLaunching) {
      return <BattleMatchupPresentation
        playerLeader={playerPartyStates[0]}
        opponentLeader={enemyPartyStates[0]}
        context={battlePresentationContext}
        imageFor={getBattleCharacterImage}
        acceptanceState={isTutorialBattle ? "B2" : undefined}
      />;
    }

    if (isTutorialBattle) {
      const playerLeader = playerPartyStates[0];
      const enemyLeader = enemyPartyStates[0];
      return <div className="battle-screen tutorial-battle-briefing" data-acceptance-state="B1" onClick={handleFirstUserInteraction}>
        <div className="tutorial-battle-location"><span>新宿・初級</span><small>QUEST BATTLE</small></div>
        <div className="tutorial-battle-versus">
          <article className="tutorial-battle-leader is-player" data-character-id={playerLeader?.characterId}><CharacterPresentation src={getBattleCharacterImage(playerLeader?.characterId)} alt={playerLeader?.name || "PLAYER"} variant="battle-leader" /><div><small>PLAYER</small><b>{playerLeader?.name}</b><strong>{playerPower.toLocaleString()}</strong></div></article>
          <div className="tutorial-battle-vs">VS</div>
          <article className="tutorial-battle-leader is-enemy"><CharacterPresentation src={getBattleCharacterImage(enemyLeader?.characterId)} alt={enemyLeader?.name || battleOpponentName} variant="battle-leader" /><div><small>ENEMY</small><b>{enemyLeader?.name || battleOpponentName}</b><strong>{enemyPower.toLocaleString()}</strong></div></article>
        </div>
        <div className="tutorial-battle-party-icons" aria-label="出撃パーティ">{playerPartyStates.map((member: any) => <CharacterPresentation key={member.id} src={getBattleCharacterImage(member.characterId)} alt={member.name} variant="battle" className="character-presentation-battle-party" />)}</div>
        <div className="tutorial-battle-strategy"><small>STRATEGY</small><b>{tactic === "ATTACK_PRIORITY" ? "攻撃優先" : tactic === "HEAL_PRIORITY" ? "回復優先" : tactic === "SKILL_PRIORITY" ? "スキル優先" : tactic === "WEAKNESS_FOCUS" ? "弱点集中" : "バランス"}</b></div>
        <button className="start-battle-btn semantic-cta semantic-cta--primary active-scale-effect tutorial-primary-target" onClick={launchBattleOnce}>バトルスタート</button>
      </div>;
    }

    return (
      <div className="battle-screen" onClick={handleFirstUserInteraction}>
        <div className={`setup-container scroll-container ${isTutorialBattle ? "tutorial-battle-setup" : ""}`}>
          <div className="setup-title-bar">
            {isTutorialBattle ? "初回バトル準備" : "バトル準備"}
          </div>

          <div className="setup-match-heading" aria-label="battle briefing">
            <span className="setup-mode-stamp">
              {battleMode === "GVG" ? "抗争" : battleMode === "PVP_PRACTICE" ? "模擬戦" : battleMode === "PVP" ? "対決" : battleMode === "RAID" ? "討伐" : "出撃"}
            </span>
            <span className="setup-match-copy">対戦情報</span>
          </div>

          <div className="setup-scroll-area">
            {/* 上段：エネミー情報 */}
            <div className="setup-enemy-wrapper">
              <div className="setup-enemy-title">対戦相手</div>
              {isPvP ? (
                <div className="setup-enemy-cards-row">
                  {enemyPartyStates.map((enemy: any, idx: number) => (
                    <div key={idx} className="setup-enemy-mini-card">
                      <CharacterPresentation src={getBattleCharacterImage(enemy.characterId)} alt={enemy.name} variant="thumbnail" />
                      <div className="setup-card-name">{enemy.name}</div>
                      <div className="setup-card-lv">Lv.{enemy.level}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="setup-enemy-spec">
                  <div className="setup-enemy-threat">
                    <CharacterPresentation src={getBattleCharacterImage(enemyPartyStates[0]?.characterId)} alt={battleOpponentName} variant="thumbnail" />
                  </div>
                  <div className="setup-enemy-detail-list">
                    <span className="font-size-9 font-weight-bold text-white">{battleOpponentName}</span>
                    <span className="font-size-7 text-secondary">遭遇エネミー</span>
                    <span className="font-size-7 text-secondary">総合力 {enemyPower.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {!isTutorialBattle && <div className="setup-enemy-detail-list mt-2">
                <span className="font-size-7 text-secondary">戦力 {enemyPower.toLocaleString()}</span>
                <span className="font-size-7 text-secondary">
                  攻撃 {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.atk || 0), 0).toLocaleString()}
                  {" ｜ "}防御 {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.def || 0), 0).toLocaleString()}
                  {" ｜ "}速度 {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.spd || 0), 0).toLocaleString()}
                </span>
                {enemySkills.length > 0 && (
                  <span className="font-size-7 text-secondary">スキル {enemySkills.map((skill: any) => skill.name).join("、")}</span>
                )}
              </div>}
            </div>

            {/* 下段：自部隊カード編成 */}
            <div className="setup-versus-marker" aria-hidden="true"><span>VS</span></div>

            <div className="setup-player-wrapper">
              <div className="setup-player-title">
                <span>自軍メンバー</span>
                <span className="text-secondary font-size-6">タップで詳細</span>
              </div>
              <div className="setup-cards-row gap-2 justify-between">
                {playerPartyStates.map((charState: any, idx: number) => {
                  const hpPercent = (charState.hp / charState.maxHp) * 100;
                  const masterData = CHARACTERS_MASTER.find(m => m.id === charState.characterId || m.name === charState.characterId);
                  const rarity = (masterData as any)?.rarity || "R";

                  return (
                    <div 
                      key={idx} 
                      className={`setup-char-card ${idx === 0 ? "is-leader" : ""} flex-col items-center cursor-pointer active-scale-effect`}
                      onClick={() => { if (!isTutorialBattle) { setSelectedCharDetail(charState); playCyberSe("click"); } }}
                    >
                      <CharacterPresentation
                        rarity={rarity}
                        src={masterData ? getCharacterTransparentImg(masterData.name) : undefined}
                        alt={charState.name}
                        variant="thumbnail"
                      />
                      <div className="setup-card-name truncate mt-1 font-size-6">{charState.name}</div>
                      <div className="setup-card-lv font-size-6 text-amber-300">Lv.{charState.level}</div>
                      <div className="setup-card-hp-bar w-full mt-1">
                        <div className="setup-card-hp-fill" style={{ width: `${hpPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 作戦AI設定 */}
            <div className="setup-tactic-wrapper">
              <div className="font-size-8 font-weight-bold text-white mb-1">
                作戦
              </div>
              <div className="tactic-grid">
                {[
                  { id: "ATTACK_PRIORITY", label: "攻撃優先" },
                  { id: "HEAL_PRIORITY", label: "回復優先" },
                  { id: "SKILL_PRIORITY", label: "スキル優先" },
                  { id: "BALANCED", label: "バランス" },
                  { id: "WEAKNESS_FOCUS", label: "弱点集中" }
                ].filter(t => !isTutorialBattle || t.id === tactic).map(t => (
                  <button
                    key={t.id}
                    className={`tactic-btn active-scale-effect ${tactic === t.id ? "active" : ""}`}
                    disabled={battleMode === "PATROL"}
                    onClick={() => { setTactic(t.id as any); playCyberSe("click"); }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {battleMode === "PATROL" && (
                <div className="font-size-6 text-secondary mt-1">派遣時に選んだ作戦で自動戦闘します。</div>
              )}
            </div>
          </div>

          {/* 出撃開始ボタン */}
          <button 
            className={`start-battle-btn semantic-cta semantic-cta--primary active-scale-effect ${isTutorialBattle ? "tutorial-primary-target" : ""}`}
            onClick={isTutorialBattle ? launchBattleOnce : launchRegularBattle}
            disabled={setupLaunching}
            aria-busy={setupLaunching}
          >
            {setupLaunching ? "BATTLE START" : battleMode === "PVP_PRACTICE" ? "模擬戦開始" : isTutorialBattle ? "BATTLE START" : battleMode === "PVP" ? "対戦開始" : battleMode === "GVG" ? "抗争開始" : battleMode === "RAID" ? "討伐開始" : "出撃開始"}
          </button>
        </div>

        {/* 閲覧用詳細ポップアップ */}
        {selectedCharDetail && (
          <div className="read-only-detail-modal" onClick={() => setSelectedCharDetail(null)}>
            <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="detail-modal-header">
                <span className="font-size-9 font-weight-bold text-white">{selectedCharDetail.name}</span>
                <button 
                  className="sub-btn font-size-6 px-2 py-0.5 active-scale-effect"
                  onClick={() => { setSelectedCharDetail(null); playCyberSe("click"); }}
                >
                  閉じる
                </button>
              </div>

              <div className="detail-modal-body">
                <div>
                  <div className="detail-modal-section-title">ステータス</div>
                  <div className="detail-modal-row"><span>レベル:</span><span className="val">Lv.{selectedCharDetail.level}</span></div>
                  <div className="detail-modal-row"><span>HP上限:</span><span className="val">{selectedCharDetail.maxHp}</span></div>
                  <div className="detail-modal-row"><span>ATK (攻撃力):</span><span className="val">{selectedCharDetail.stats.atk}</span></div>
                  <div className="detail-modal-row"><span>DEF (防御力):</span><span className="val">{selectedCharDetail.stats.def}</span></div>
                  <div className="detail-modal-row"><span>SPD (速度):</span><span className="val">{selectedCharDetail.stats.spd}</span></div>
                  <div className="detail-modal-row"><span>LUK (運):</span><span className="val">{selectedCharDetail.stats.luk}</span></div>
                </div>

                <div>
                  <div className="detail-modal-section-title">装備スキル</div>
                  {selectedCharDetail.skills.length > 0 ? (
                    selectedCharDetail.skills.map((sk: any, idx: number) => {
                      return (
                        <div key={idx} className="detail-modal-row mb-1">
                          <span className="text-white">
                            {sk.name}
                          </span>
                          <span className="val">倍率: {sk.power}%</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="font-size-7 text-secondary">装備スキルなし (通常スキルのみ発動)</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. PLAYING オート戦闘中画面
  return (
    <div className="battle-screen">
      <QuestBattleViewer
        battleMode={battleMode}
        opponentName={battleOpponentName}
        playerParty={playerPartyStates}
        enemyParty={enemyPartyStates}
        timeline={timeline}
        timelineIndex={timelineIndex}
        authoritativeTimeline={authoritativeTimeline}
        presentationPhase={presentationPhase}
        round={battleRound}
        skillCutIn={activeSkillCutIn}
        targetLine={targetLine}
        shakingId={activeShakingCharId}
        damagePopup={damagePopup}
        tactic={tactic}
        speed={battleSpeed}
        monthlyPassActive={monthlyPassActive}
        paused={isAutoPaused}
        tutorial={isTutorialBattle}
        onSpeedChange={setBattleSpeed}
        onPauseChange={setIsAutoPaused}
        canSkip={!isTutorialBattle && ["PATROL", "PVP", "PVP_PRACTICE", "RAID"].includes(battleMode)}
        skipPending={battleSkipPending}
        onSkip={skipBattlePresentation}
        onSound={() => playCyberSe("click")}
        onRetreat={() => {
          setConfirmDialogConfig({
            isOpen: true,
            title: "撤退確認",
            message: "バトルから撤退しますか？（敗北扱いとなります）",
            onConfirm: () => { setConfirmDialogConfig(null); endBattleSession("DEFEAT"); },
            onCancel: () => setConfirmDialogConfig(null),
          });
        }}
      />
    </div>
  );

}
