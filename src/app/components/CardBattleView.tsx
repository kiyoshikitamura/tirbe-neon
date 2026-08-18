"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import TutorialNavigator from "./TutorialNavigator";
import CharacterPresentation from "./character/CharacterPresentation";
import QuestBattleViewer from "./battle/QuestBattleViewer";
import { preloadBattleEffects } from "./battle/BattleEffectPresentation";
import "./CardBattleView.css";

export default function CardBattleView() {
  const {
    battleMode,
    battleOpponentName,
    battleState,
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
    launchBattlePlaying,
    endBattleSession,
    playCyberSe,
    handleFirstUserInteraction,
    setShowFriendPanel,
    onboardingState
    , playSe
    , preloadAudio
  } = useGame();
  const isTutorialBattle = battleMode === "PATROL" && onboardingState?.tutorial_step === "TUTORIAL_BATTLE";

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

  const launchBattleOnce = () => {
    if (battleLaunchRef.current) return;
    battleLaunchRef.current = true;
    setSetupLaunching(true);
    playSe("BATTLE_START");
    launchBattlePlaying();
  };

  const launchRegularBattle = () => {
    if (battleLaunchRef.current) return;
    battleLaunchRef.current = true;
    setSetupLaunching(true);
    playSe("BATTLE_START");
    launchBattlePlaying();
  };

  if (!battleMode || !battleState) return null;
  const getBattleCharacterImage = (characterId: string | undefined, fallbackName = "reiji") => {
    const master = CHARACTERS_MASTER.find((character: any) => character.id === characterId || character.name === characterId);
    return getCharacterTransparentImg(master?.name || fallbackName);
  };

  // 1. SETUP 出撃準備画面
  if (battleState === "SETUP") {
    const isPvP = battleMode === "PVP" || battleMode === "PVP_PRACTICE" || battleMode === "GVG";
    const enemyPower = enemyPartyStates.reduce((total: number, enemy: any) => {
      const stats = enemy.stats || {};
      return total + Number(enemy.maxHp || 0) + Number(stats.atk || 0) + Number(stats.def || 0);
    }, 0);
    const enemySkills = enemyPartyStates.flatMap((enemy: any) => enemy.skills || []);

    return (
      <div className="battle-screen" onClick={handleFirstUserInteraction}>
        <div className={`setup-container scroll-container ${isTutorialBattle ? "tutorial-battle-setup" : ""}`}>
          <div className="setup-title-bar">
            {isTutorialBattle ? "初回バトル準備" : "バトル準備"}
          </div>

          {isTutorialBattle && (
            <TutorialNavigator message="編成と敵を確認したら、「バトル開始」を押してね。戦闘は自動で進むよ。" />
          )}

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
                  <div className="setup-enemy-threat" aria-hidden="true"><span>ENEMY</span><strong>!</strong></div>
                  <div className="setup-enemy-detail-list">
                    <span className="font-size-9 font-weight-bold text-white">{battleOpponentName}</span>
                    <span className="font-size-7 text-secondary">遭遇エネミー</span>
                    <span className="font-size-7 text-secondary">HP {Number(enemyPartyStates[0]?.maxHp || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="setup-enemy-detail-list mt-2">
                <span className="font-size-7 text-secondary">戦力 {enemyPower.toLocaleString()}</span>
                <span className="font-size-7 text-secondary">
                  攻撃 {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.atk || 0), 0).toLocaleString()}
                  {" ｜ "}防御 {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.def || 0), 0).toLocaleString()}
                  {" ｜ "}速度 {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.spd || 0), 0).toLocaleString()}
                </span>
                {enemySkills.length > 0 && (
                  <span className="font-size-7 text-secondary">スキル {enemySkills.map((skill: any) => skill.name).join("、")}</span>
                )}
              </div>
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
                      className="setup-char-card flex-col items-center cursor-pointer active-scale-effect"
                      onClick={() => { setSelectedCharDetail(charState); playCyberSe("click"); }}
                    >
                      <CharacterPresentation
                        rarity={rarity}
                        src={getCharacterTransparentImg(masterData?.name || "reiji")}
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
                {!isPvP && !isTutorialBattle && playerPartyStates.length < 6 && (
                  <div 
                    className="setup-char-card flex-col items-center justify-center cursor-pointer active-scale-effect border-subtle bg-black-60"
                    onClick={() => { playCyberSe("click"); setShowFriendPanel(true); }}
                    style={{ minHeight: "100px" }}
                  >
                    <span className="text-color-cyan font-size-8 font-weight-bold">+</span>
                    <span className="font-size-6 text-secondary mt-1">助っ人</span>
                  </div>
                )}
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
                ].map(t => (
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
            {setupLaunching ? "バトル準備中..." : battleMode === "PVP_PRACTICE" ? "模擬戦開始" : isTutorialBattle ? "バトル開始" : "抗争開始"}
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
                  <div className="detail-modal-section-title">ステータス (Stats)</div>
                  <div className="detail-modal-row"><span>レベル:</span><span className="val">Lv.{selectedCharDetail.level}</span></div>
                  <div className="detail-modal-row"><span>HP上限:</span><span className="val">{selectedCharDetail.maxHp}</span></div>
                  <div className="detail-modal-row"><span>ATK (攻撃力):</span><span className="val">{selectedCharDetail.stats.atk}</span></div>
                  <div className="detail-modal-row"><span>DEF (防御力):</span><span className="val">{selectedCharDetail.stats.def}</span></div>
                  <div className="detail-modal-row"><span>SPD (速度):</span><span className="val">{selectedCharDetail.stats.spd}</span></div>
                  <div className="detail-modal-row"><span>LUK (運):</span><span className="val">{selectedCharDetail.stats.luk}</span></div>
                </div>

                <div>
                  <div className="detail-modal-section-title">装備スキル (Skills)</div>
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
