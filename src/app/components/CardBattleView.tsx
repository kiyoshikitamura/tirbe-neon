"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import CardIcon from "./CardIcon";
import TutorialNavigator from "./TutorialNavigator";
import "./CardBattleView.css";

export default function CardBattleView() {
  const {
    battleMode,
    battleOpponentName,
    battleState,
    setBattleState,
    battleLog,
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
    userEquipmentsList,
    userSkillsList,
    playCyberSe,
    handleFirstUserInteraction,
    setShowFriendPanel,
    onboardingState
  } = useGame();
  const isTutorialBattle = battleMode === "PATROL" && onboardingState?.tutorial_step === "TUTORIAL_BATTLE";

  // SETUP画面でカードタップ時に開く閲覧専用詳細ポップアップ
  const [selectedCharDetail, setSelectedCharDetail] = useState<any | null>(null);

  // レーザー座標
  const [laserCoords, setLaserCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tutorialLaunchRef = useRef(false);

  useEffect(() => {
    if (battleState === "SETUP") {
      tutorialLaunchRef.current = false;
      requestAnimationFrame(() => {
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
    if (tutorialLaunchRef.current) return;
    tutorialLaunchRef.current = true;
    launchBattlePlaying();
  };

  useEffect(() => {
    if (targetLine && containerRef.current) {
      const fromEl = document.getElementById(targetLine.fromId);
      const toEl = document.getElementById(targetLine.toId);
      if (fromEl && toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const parentRect = containerRef.current.getBoundingClientRect();

        setLaserCoords({
          x1: fromRect.left + fromRect.width / 2 - parentRect.left,
          y1: fromRect.top + fromRect.height / 2 - parentRect.top,
          x2: toRect.left + toRect.width / 2 - parentRect.left,
          y2: toRect.top + toRect.height / 2 - parentRect.top,
        });
      }
    } else {
      setLaserCoords(null);
    }
  }, [targetLine]);

  if (!battleMode || !battleState) return null;

  // 1. SETUP 出撃準備画面
  if (battleState === "SETUP") {
    const isPvP = battleMode === "PVP" || battleMode === "GVG";
    const enemyPower = enemyPartyStates.reduce((total: number, enemy: any) => {
      const stats = enemy.stats || {};
      return total + Number(enemy.maxHp || 0) + Number(stats.atk || 0) + Number(stats.def || 0);
    }, 0);
    const enemySkills = enemyPartyStates.flatMap((enemy: any) => enemy.skills || []);

    return (
      <div className="battle-screen" onClick={handleFirstUserInteraction}>
        <div className={`setup-container scroll-container ${isTutorialBattle ? "tutorial-battle-setup" : ""}`}>
          <div className="setup-title-bar">
            {isTutorialBattle ? "初回バトル準備" : "抗争準備フェーズ (SETUP)"}
          </div>

          {isTutorialBattle && (
            <TutorialNavigator message="編成と敵を確認したら、「バトル開始」を押してね。戦闘は自動で進むよ。" />
          )}

          <div className="setup-match-heading" aria-label="battle briefing">
            <span className="setup-mode-stamp">
              {battleMode === "GVG" ? "抗争" : battleMode === "PVP" ? "対決" : battleMode === "RAID" ? "討伐" : "出撃"}
            </span>
            <span className="setup-match-copy">AUTO BATTLE BRIEFING</span>
          </div>

          <div className="setup-scroll-area">
            {/* 上段：エネミー情報 */}
            <div className="setup-enemy-wrapper">
              <div className="setup-enemy-title">対戦相手 (敵部隊状況)</div>
              {isPvP ? (
                <div className="setup-enemy-cards-row">
                  {enemyPartyStates.map((enemy: any, idx: number) => (
                    <div key={idx} className="setup-enemy-mini-card">
                      <img 
                        src={`/characters/char_dummy_enemy_${idx}.png`} 
                        onError={(e) => { (e.target as HTMLImageElement).src = "/characters/reiji_transparent_asset.png"; }}
                        alt={enemy.name} 
                      />
                      <div className="setup-card-name">{enemy.name}</div>
                      <div className="setup-card-lv">Lv.{enemy.level}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="setup-enemy-spec">
                  <img 
                    src="/characters/char_boss_shinjuku.png" 
                    onError={(e) => { (e.target as HTMLImageElement).src = "/characters/reiji_transparent_asset.png"; }}
                    className="setup-enemy-avatar" 
                    alt={battleOpponentName} 
                  />
                  <div className="setup-enemy-detail-list">
                    <span className="font-size-9 font-weight-bold text-white">{battleOpponentName}</span>
                    <span className="font-size-7 text-secondary">勢力ボス級エネミー</span>
                    <span className="font-size-7 text-secondary">HP: {enemyPartyStates[0]?.maxHp}</span>
                  </div>
                </div>
              )}
              <div className="setup-enemy-detail-list mt-2">
                <span className="font-size-7 text-secondary">POWER: {enemyPower.toLocaleString()}</span>
                <span className="font-size-7 text-secondary">
                  STATS: ATK {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.atk || 0), 0).toLocaleString()}
                  {" / "}DEF {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.def || 0), 0).toLocaleString()}
                  {" / "}SPD {enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.spd || 0), 0).toLocaleString()}
                </span>
                {enemySkills.length > 0 && (
                  <span className="font-size-7 text-secondary">SKILLS: {enemySkills.map((skill: any) => skill.name).join(", ")}</span>
                )}
              </div>
            </div>

            {/* 下段：自部隊カード編成 */}
            <div className="setup-versus-marker" aria-hidden="true"><span>VS</span></div>

            <div className="setup-player-wrapper">
              <div className="setup-player-title">
                <span>自連合部隊 (編成キャラ)</span>
                <span className="text-secondary font-size-6">※タップして詳細確認</span>
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
                      {/* 本番縦型スリムトレカ枠 CardIcon */}
                      <CardIcon
                        rarity={rarity}
                        img={getCharacterTransparentImg(masterData?.name || "reiji")}
                        jpName={charState.name}
                        alignment={masterData?.alignment}
                        size={56}
                        mode="battle_slim"
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
                オートバトル作戦AI設定:
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
                <div className="font-size-6 text-secondary mt-1">派遣開始時に確定した作戦でサーバー記録を再生します。</div>
              )}
            </div>
          </div>

          {/* 出撃開始ボタン */}
          <button 
            className={`start-battle-btn active-scale-effect ${isTutorialBattle ? "tutorial-primary-target" : ""}`}
            onClick={isTutorialBattle ? launchBattleOnce : launchBattlePlaying}
          >
            {isTutorialBattle ? "バトル開始" : "抗争開始"}
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
  const isPvPPlaying = battleMode === "PVP" || battleMode === "GVG";
  const activeTimelineNode = timeline[timelineIndex] || { id: "UNKNOWN" };

  return (
    <div className="battle-screen" ref={containerRef}>
      <div className="playing-container">

        {/* 上段：敵エリア */}
        <div className="playing-enemy-side">
          {isPvPPlaying ? (
            <div className="enemy-5v5-row">
              {enemyPartyStates.map((enemy: any, idx: number) => {
                const hpPercent = (enemy.hp / enemy.maxHp) * 100;
                const isShaking = activeShakingCharId === enemy.id;
                const isActiveTurn = activeTimelineNode.id === enemy.id;

                return (
                  <div 
                    key={idx} 
                    id={enemy.id}
                    className={`enemy-playing-card ${enemy.isDead ? "dead" : ""} ${isActiveTurn ? "active-turn" : ""} ${isShaking ? "shake" : ""}`}
                  >
                    <img 
                      src={`/characters/char_dummy_enemy_${idx}.png`} 
                      onError={(e) => { (e.target as HTMLImageElement).src = "/characters/reiji_transparent_asset.png"; }}
                      alt={enemy.name} 
                    />
                    <div className="enemy-card-name">{enemy.name}</div>
                    {!enemy.isDead && (
                      <div className="playing-stats-overlay">
                        <div className="mini-hp-bar enemy-color">
                          <div className="mini-hp-fill enemy-color" style={{ width: `${hpPercent}%` }} />
                        </div>
                      </div>
                    )}
                    {enemy.isDead && <span className="dead-badge">戦闘不能</span>}

                    {/* ダメージポップアップの個別アバター位置配置 */}
                    {damagePopup && damagePopup.charId === enemy.id && (
                      <div className="damage-popup-container">
                        {damagePopup.isCritical && (
                          <div className="critical-badge-overlay pop-in">CRITICAL!</div>
                        )}
                        <div className={`damage-popup-widget pop-in ${damagePopup.type} ${damagePopup.isCritical ? "critical" : ""}`}>
                          {damagePopup.type === "dmg" ? `-${damagePopup.val.toLocaleString()}` : `+${damagePopup.val.toLocaleString()}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // NPCレイド戦巨大ボス表示
            <div className="single-enemy-boss-container" id={enemyPartyStates[0]?.id || "ENEMY"}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-size-9 font-weight-bold text-color-magenta">{battleOpponentName}</span>
                <span className="font-size-8 font-weight-bold text-white">HP: {enemyPartyStates[0]?.hp.toLocaleString()} / {enemyPartyStates[0]?.maxHp.toLocaleString()}</span>
              </div>
              <div className="boss-hp-bar-bg">
                <div 
                  className="boss-hp-bar-fill" 
                  style={{ width: `${(enemyPartyStates[0]?.hp / enemyPartyStates[0]?.maxHp) * 100}%` }} 
                />
              </div>

              {/* ダメージポップアップ */}
              {damagePopup && damagePopup.charId === enemyPartyStates[0]?.id && (
                <div className="damage-popup-container" style={{ top: "10px" }}>
                  {damagePopup.isCritical && (
                    <div className="critical-badge-overlay pop-in">CRITICAL!</div>
                  )}
                  <div className={`damage-popup-widget pop-in ${damagePopup.type} ${damagePopup.isCritical ? "critical" : ""}`}>
                    {damagePopup.type === "dmg" ? `-${damagePopup.val.toLocaleString()}` : `+${damagePopup.val.toLocaleString()}`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 中段：タイムライン ＆ レーザーライン ＆ カットイン */}
        <div className="playing-middle-stage">
          {/* 行動順タイムライン */}
          <div className="timeline-bar">
            <div className="timeline-flow-layout scroll-container">
              {timeline.map((char: any, idx: number) => {
                const isActive = timelineIndex === idx;
                const isNodeDead = char.isEnemy 
                  ? enemyPartyStates.find((e: any) => e.id === char.id)?.isDead
                  : playerPartyStates.find((p: any) => p.id === char.id)?.isDead;

                if (isNodeDead) return null;

                return (
                  <div 
                    key={idx} 
                    className={`timeline-node ${char.isEnemy ? "enemy" : "player"} ${isActive ? "active" : ""}`}
                  >
                    <span>{char.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 動的ターゲットレーザーラインの描画 */}
          {laserCoords && (
            <svg className="laser-overlay">
              <line 
                x1={laserCoords.x1} 
                y1={laserCoords.y1} 
                x2={laserCoords.x2} 
                y2={laserCoords.y2} 
                stroke={activeTimelineNode.isEnemy ? "var(--text-color-magenta)" : "var(--text-color-cyan)"}
                strokeWidth="2.5"
                className="laser-path"
              />
            </svg>
          )}

          {/* スキル発動時のカットイン */}
          {activeSkillCutIn && (
            <div className="skill-cutin-banner">
              <div className="cutin-char-name">{activeSkillCutIn.charName}</div>
              <div className="cutin-skill-name">{activeSkillCutIn.skillName}</div>
            </div>
          )}
        </div>

        {/* 下段：プレイヤー(味方5名個別HP/バリア) */}
        <div className="playing-player-side">
          <div className="player-5v5-row">
            {playerPartyStates.map((player: any, idx: number) => {
              const hpPercent = (player.hp / player.maxHp) * 100;
              const shieldPercent = player.maxHp > 0 ? (player.shield / player.maxHp) * 100 : 0;
              const isShaking = activeShakingCharId === player.id;
              const isActiveTurn = activeTimelineNode.id === player.id;

              return (
                <div 
                  key={idx} 
                  id={player.id}
                  className={`player-playing-card ${player.isDead ? "dead" : ""} ${isActiveTurn ? "active-turn" : ""} ${isShaking ? "shake" : ""}`}
                >
                  <img 
                    src={`/characters/${player.characterId}.png`} 
                    onError={(e) => { (e.target as HTMLImageElement).src = "/characters/reiji_transparent_asset.png"; }}
                    alt={player.name} 
                  />
                  <div className="player-card-name">{player.name}</div>
                  {!player.isDead && (
                    <div className="playing-stats-overlay">
                      {/* HPゲージ */}
                      <div className="mini-hp-bar">
                        <div className="mini-hp-fill" style={{ width: `${hpPercent}%` }} />
                      </div>
                      {/* バリアシールドゲージ */}
                      {player.shield > 0 && (
                        <div className="mini-shield-bar">
                          <div className="mini-shield-fill" style={{ width: `${Math.min(shieldPercent, 100)}%` }} />
                        </div>
                      )}
                    </div>
                  )}
                  {player.isDead && <span className="dead-badge">戦闘不能</span>}

                  {/* ダメージ・回復ポップアップの個別アバター位置配置 */}
                  {damagePopup && damagePopup.charId === player.id && (
                    <div className="damage-popup-container">
                      {damagePopup.isCritical && (
                        <div className="critical-badge-overlay pop-in">CRITICAL!</div>
                      )}
                      <div className={`damage-popup-widget pop-in ${damagePopup.type} ${damagePopup.isCritical ? "critical" : ""}`}>
                        {damagePopup.type === "dmg" ? `-${damagePopup.val.toLocaleString()}` : `+${damagePopup.val.toLocaleString()}`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 最下部：AP、作戦表示、戦闘ログ、制御ボタン */}
        <div className="battle-controls-layout">
          <div className="battle-control-hud-row">
            <span className="font-size-7 text-secondary">フルオート進行</span>
            <div className="flex items-center gap-1.5">
              <span className="font-size-6 text-secondary">現在の作戦:</span>
              <span className="font-size-7 font-weight-bold text-white bg-black-40 px-2 py-0.5 border border-white-08 rounded">
                {tactic === "ATTACK_PRIORITY" ? "攻撃優先" :
                 tactic === "HEAL_PRIORITY" ? "回復優先" :
                 tactic === "SKILL_PRIORITY" ? "スキル優先" :
                 tactic === "WEAKNESS_FOCUS" ? "弱点集中" : "バランス"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-size-7 font-weight-bold text-white bg-black-40 px-2 py-0.5 border border-white-08 rounded">
                Round {battleRound}/{battleMode === "RAID" ? 30 : battleMode === "PVP" || battleMode === "GVG" ? 20 : 15}
              </span>
              <button 
                className={`speed-toggle-btn active-scale-effect ${battleSpeed > 1 ? "active" : ""}`}
                onClick={() => {
                  const nextSpeed = battleSpeed === 1 ? 2 : battleSpeed === 2 && monthlyPassActive ? 3 : 1;
                  setBattleSpeed(nextSpeed);
                  playCyberSe("click");
                }}
                title={monthlyPassActive ? "1倍・2倍・3倍速を切替" : "通常は1倍・2倍速。3倍速はVIPパス限定"}
              >
                {battleSpeed}x速
              </button>
              <button 
                className="pause-toggle-btn active-scale-effect"
                onClick={() => { setIsAutoPaused(!isAutoPaused); playCyberSe("click"); }}
              >
                {isAutoPaused ? "再開" : "一時停止"}
              </button>
            </div>
          </div>

          {/* 戦闘ログ */}
          <div className="battle-log-box scroll-container">
            {battleLog.map((log: string, idx: number) => (
              <div key={idx} className="pb-1">{log}</div>
            ))}
          </div>

          {/* 撤退（強制敗北） */}
          {!isTutorialBattle && <button
            className="sub-btn border-red text-color-red font-size-8 py-2 rounded active-scale-effect text-center"
            onClick={() => {
              setConfirmDialogConfig({
                isOpen: true,
                title: "撤退確認",
                message: "抗争から撤退しますか？（敗北扱いとなります）",
                onConfirm: () => {
                  setConfirmDialogConfig(null);
                  endBattleSession("DEFEAT");
                },
                onCancel: () => setConfirmDialogConfig(null)
              });
            }}
          >
            撤退する
          </button>}
        </div>

      </div>
    </div>
  );
}
