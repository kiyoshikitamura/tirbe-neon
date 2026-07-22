"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { CHARACTERS_MASTER } from "@/utils/game_constants";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import "./CardBattleView.css";

export default function CardBattleView() {
  const {
    battleMode,
    battleOpponentName,
    battleState,
    setBattleState,
    battleLog,
    ap,
    maxAp,
    tactic,
    setTactic,
    battleSpeed,
    setBattleSpeed,
    isAutoPaused,
    setIsAutoPaused,
    playerPartyStates,
    enemyPartyStates,
    timeline,
    timelineIndex,
    activeSkillCutIn,
    targetLine,
    activeShakingCharId,
    damagePopup,
    launchBattlePlaying,
    endBattleSession,
    userEquipmentsList,
    userSkillsList,
    playCyberSe,
    handleFirstUserInteraction
  } = useGame();

  // SETUP画面でカードタップ時に開く閲覧専用詳細ポップアップ
  const [selectedCharDetail, setSelectedCharDetail] = useState<any | null>(null);

  // レーザー座標
  const [laserCoords, setLaserCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    return (
      <div className="battle-screen" onClick={handleFirstUserInteraction}>
        <div className="setup-container scroll-container">
          <div className="setup-title-bar">
            抗争準備フェーズ (SETUP)
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
                        src={`/char/char_dummy_enemy_${idx}.png`} 
                        onError={(e) => { (e.target as HTMLImageElement).src = "/char/char_fallback.png"; }}
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
                    src="/char/char_boss_shinjuku.png" 
                    onError={(e) => { (e.target as HTMLImageElement).src = "/char/char_fallback.png"; }}
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
            </div>

            {/* 下段：自部隊カード編成 */}
            <div className="setup-player-wrapper">
              <div className="setup-player-title">
                <span>自連合部隊 (編成キャラ)</span>
                <span className="text-secondary font-size-6">※タップして詳細確認</span>
              </div>
              <div className="setup-cards-row">
                {playerPartyStates.map((charState: any, idx: number) => {
                  const hpPercent = (charState.hp / charState.maxHp) * 100;
                  return (
                    <div 
                      key={idx} 
                      className="setup-char-card"
                      onClick={() => { setSelectedCharDetail(charState); playCyberSe("click"); }}
                    >
                      <img 
                        src={`/char/${charState.characterId}.png`} 
                        onError={(e) => { (e.target as HTMLImageElement).src = "/char/char_fallback.png"; }}
                        alt={charState.name} 
                      />
                      <div className="setup-card-name truncate">{charState.name}</div>
                      <div className="setup-card-lv">Lv.{charState.level}</div>
                      <div className="setup-card-hp-bar">
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
                オートバトル作戦AI設定:
              </div>
              <div className="tactic-grid">
                {[
                  { id: "OFFENSIVE", label: "攻撃重視" },
                  { id: "DEFENSIVE", label: "防御重視" },
                  { id: "HEALING", label: "回復重視" },
                  { id: "BALANCED", label: "バランス" },
                  { id: "AP_CONSERVING", label: "速攻/AP温存" },
                  { id: "TACTICAL", label: "支援/妨害重視" }
                ].map(t => (
                  <button
                    key={t.id}
                    className={`tactic-btn active-scale-effect ${tactic === t.id ? "active" : ""}`}
                    onClick={() => { setTactic(t.id as any); playCyberSe("click"); }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 出撃開始ボタン */}
          <button 
            className="start-battle-btn active-scale-effect"
            onClick={launchBattlePlaying}
          >
            抗争開始
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
                      const isSynergy = sk.ownerId && sk.ownerId === selectedCharDetail.characterId;
                      const displayCost = isSynergy ? Math.max(sk.ap_cost - 1, 1) : sk.ap_cost;
                      return (
                        <div key={idx} className="detail-modal-row mb-1">
                          <span className="text-white">
                            {sk.name}
                            {isSynergy && <span className="synergy-badge">得意</span>}
                          </span>
                          <span className="val">Cost:{displayCost} ｜ Pwr:{sk.power}</span>
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
                      src={`/char/char_dummy_enemy_${idx}.png`} 
                      onError={(e) => { (e.target as HTMLImageElement).src = "/char/char_fallback.png"; }}
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
            <div className="single-enemy-boss-container" id="ENEMY">
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
              {damagePopup && damagePopup.charId === "ENEMY" && (
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
                    src={`/char/${player.characterId}.png`} 
                    onError={(e) => { (e.target as HTMLImageElement).src = "/char/char_fallback.png"; }}
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
            <div className="flex items-center gap-2">
              <span className="font-size-7 text-secondary">部隊AP:</span>
              <span className="font-size-12 font-bold text-color-cyan">{ap} / {maxAp}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-size-6 text-secondary">現在の作戦:</span>
              <span className="font-size-7 font-weight-bold text-white bg-black-40 px-2 py-0.5 border border-white-08 rounded">
                {tactic === "OFFENSIVE" ? "攻撃重視" :
                 tactic === "DEFENSIVE" ? "防御重視" :
                 tactic === "HEALING" ? "回復重視" :
                 tactic === "BALANCED" ? "バランス" :
                 tactic === "AP_CONSERVING" ? "速攻/AP温存" : "支援/妨害重視"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className={`speed-toggle-btn active-scale-effect ${battleSpeed === 2 ? "active" : ""}`}
                onClick={() => { setBattleSpeed(battleSpeed === 1 ? 2 : 1); playCyberSe("click"); }}
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
          <button 
            className="sub-btn border-red text-color-red font-size-8 py-2 rounded active-scale-effect text-center"
            onClick={() => {
              if (confirm("抗争から撤退しますか？（敗北扱いとなります）")) {
                endBattleSession("DEFEAT");
              }
            }}
          >
            撤退する
          </button>
        </div>

      </div>
    </div>
  );
}
