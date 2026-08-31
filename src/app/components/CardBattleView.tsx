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
import { CANONICAL_SKILL_VIEW } from "@/utils/skills_master_data";
import { parseCanonicalEffects } from "@/domain/battle/canonical_effects";
import PvpDeckPresentation, { PvpPowerSummary, canonicalPvpCharacter } from "./pvp/PvpDeckPresentation";
import { SkillDetailDialog, SkillIconGrid } from "./skill/SkillPresentation";
import "./CardBattleView.css";

const TACTIC_OPTIONS = [
  { id: "ATTACK_PRIORITY", icon: "⚔", label: "攻撃優先", description: "攻撃スキルを優先" },
  { id: "HEAL_PRIORITY", icon: "✚", label: "回復優先", description: "HPの低い味方を優先" },
  { id: "SKILL_PRIORITY", icon: "◆", label: "スキル優先", description: "使用可能なスキルを優先" },
  { id: "BALANCED", icon: "◎", label: "バランス", description: "攻撃と回復を状況判断" },
  { id: "WEAKNESS_FOCUS", icon: "⌖", label: "弱点集中", description: "有利属性の敵を集中" },
] as const;

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
    actionPresentation,
    authoritativeTimeline,
    launchBattlePlaying,
    confirmPreparedPvpBattle,
    cancelPreparedPvpBattle,
    confirmPreparedRaidBattle,
    cancelPreparedRaidBattle,
    raidPoints,
    raidFirstEntryFree,
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
  const [selectedOpponentSkill, setSelectedOpponentSkill] = useState<any | null>(null);
  const [tacticDialogOpen, setTacticDialogOpen] = useState(false);
  const [setupLaunching, setSetupLaunching] = useState(false);

  const battleLaunchRef = useRef(false);

  useEffect(() => {
    preloadBattleEffects();
    preloadAudio({
      scene: "BATTLE",
      events: ["BATTLE_START", "BATTLE_ATTACK", "BATTLE_SLASH", "BATTLE_GUN", "BATTLE_SKILL", "BATTLE_DAMAGE", "BATTLE_CRITICAL", "BATTLE_WEAK", "BATTLE_BUFF", "BATTLE_DEBUFF", "VICTORY", "DEFEAT"],
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

  const launchRegularBattle = async () => {
    if (battleLaunchRef.current) return;
    battleLaunchRef.current = true;
    setSetupLaunching(true);
    if (battleMode === "PVP") {
      const committed = await confirmPreparedPvpBattle();
      if (!committed) {
        battleLaunchRef.current = false;
        setSetupLaunching(false);
        return;
      }
    } else if (battleMode === "RAID") {
      const committed = await confirmPreparedRaidBattle();
      if (!committed) {
        battleLaunchRef.current = false;
        setSetupLaunching(false);
        return;
      }
    }
    playSe("BATTLE_START");
    window.setTimeout(() => launchBattlePlaying(), 1000);
  };

  if (!battleMode || !battleState) return null;
  const battleBackgroundStyle = battlePresentationContext?.backgroundPath
    ? { "--battle-background-image": `url(${battlePresentationContext.backgroundPath})` } as React.CSSProperties
    : undefined;
  const getBattleCharacterImage = (characterId: string | undefined) => {
    const master = CHARACTERS_MASTER.find((character: any) => character.id === characterId || character.name === characterId);
    return master ? getCharacterTransparentImg(master.name) : undefined;
  };

  if (battleState === "ENDING" || battleState === "OUTCOME" || battleState === "RESULT") {
    const victory = battleOutcome === "VICTORY";
    return (
      <div className={`battle-screen battle-ending-screen is-${battleState.toLowerCase()}`} style={battleBackgroundStyle} data-battle-outcome={battleOutcome || "PENDING"} data-acceptance-state={battleState === "ENDING" ? "B5" : battleState === "RESULT" ? "B6" : undefined}>
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
            displayedRound={battleRound}
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
    const canonicalEnemySkills = Array.from(new Map(enemySkills
      .map((skill: any) => CANONICAL_SKILL_VIEW.find((master) => master.id === skill.skill_card_id))
      .filter(Boolean)
      .map((skill: any) => [skill.id, skill])).values()) as any[];
    const canonicalRaidBossSkills = (battlePresentationContext?.opponentSkills || []).slice(0, 6).map((skill: NonNullable<typeof battlePresentationContext>["opponentSkills"][number]) => {
      const sharedMaster = CANONICAL_SKILL_VIEW.find((entry) => entry.id === skill.id);
      if (sharedMaster) return sharedMaster;
      const effects = parseCanonicalEffects(skill.effects || []);
      const damage = effects.find((effect) => effect.type === "DAMAGE");
      const effectType = damage ? "ATTACK" : effects.some((effect) => effect.type === "HEAL" || effect.type === "REGEN") ? "HEAL"
        : effects.some((effect) => effect.type === "DEBUFF" || ["BLIND", "SILENCE", "STUN", "POISON", "BLEED", "TAUNT"].includes(effect.type)) ? "DEBUFF" : "BUFF";
      return {
        id: skill.id, name: skill.name, rarity: "N", alignment: "NONE" as const,
        power: Number(damage?.powerBp || 0) / 100, effect_type: effectType,
        is_exclusive: false, exclusive_character_id: null,
        description: (skill.effects || []).join(" / "), is_obtainable: true as const,
        activationType: (skill.activationType || "ACTIVE") as "ACTIVE",
        cooldown: skill.cooldown ?? null, availableFromRound: skill.availableFromRound ?? 1,
        target: skill.target || "ENEMY_SINGLE", effects,
      };
    });
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

    if (battleMode === "RAID") {
      const boss = enemyPartyStates[0];
      return <><div className="battle-screen" onClick={handleFirstUserInteraction}>
        <div className="raid-battle-setup scroll-container" style={battleBackgroundStyle}>
          <header className="raid-battle-setup__header">
            <small>RAID BRIEFING</small>
            <strong>BATTLE READY</strong>
          </header>
          <main className="raid-battle-setup__body">
            <section className="raid-battle-target" aria-label="レイド対象">
              <div className="raid-battle-boss-visual" role="img" aria-label={`${battleOpponentName} 画像準備中`}><span aria-hidden="true" /></div>
              <div><small>RAID BOSS</small><strong>{battleOpponentName}</strong><span>Lv.{boss?.level || 1}</span></div>
              <dl><div><dt>HP</dt><dd>{Number(boss?.hp || 0).toLocaleString()} / {Number(boss?.maxHp || 0).toLocaleString()}</dd></div><div><dt>ATK</dt><dd>{Number(boss?.stats?.atk || 0).toLocaleString()}</dd></div><div><dt>DEF</dt><dd>{Number(boss?.stats?.def || 0).toLocaleString()}</dd></div></dl>
              {canonicalRaidBossSkills.length > 0 && <div className="raid-battle-boss-skills"><strong>ボススキル</strong><SkillIconGrid skills={canonicalRaidBossSkills} onSelect={setSelectedOpponentSkill} /></div>}
            </section>
            <section className="raid-battle-deck" aria-label="自分のデッキ">
              <header><strong>MY DECK</strong><span>総合力 {playerPower.toLocaleString()}</span></header>
              <PvpDeckPresentation ariaLabel="自分のデッキ" members={playerPartyStates.map((member: any, index: number) => ({
                key: member.id || `raid-player-${index}`,
                characterId: member.characterId,
                name: member.name,
                level: member.level,
              }))} />
            </section>
            <section className="raid-battle-resource" aria-label="レイド挑戦資源">
              <div><small>RAID POINT</small><strong>{raidFirstEntryFree ? "初回無料" : `${raidPoints} / 5`}</strong></div>
              <span>{raidFirstEntryFree ? "この挑戦ではRPを消費しません" : "討伐開始時にRPを1消費"}</span>
            </section>
          </main>
          <footer className="raid-battle-setup__actions">
            <button type="button" className="start-battle-btn semantic-cta semantic-cta--primary active-scale-effect" onClick={launchRegularBattle} disabled={setupLaunching} aria-busy={setupLaunching}>{setupLaunching ? "BATTLE START" : "討伐開始"}</button>
            <button type="button" className="cancel-battle-btn semantic-cta semantic-cta--secondary" disabled={setupLaunching} onClick={() => { if (cancelPreparedRaidBattle()) playSe("UI_BACK"); }}>レイドへ戻る</button>
          </footer>
        </div>
      </div>{selectedOpponentSkill && <SkillDetailDialog skill={selectedOpponentSkill} onClose={() => setSelectedOpponentSkill(null)} />}</>;
    }

    return (
      <div className="battle-screen" onClick={handleFirstUserInteraction}>
        <div className={`setup-container scroll-container ${isTutorialBattle ? "tutorial-battle-setup" : ""}`} style={battleBackgroundStyle}>
          <div className="setup-title-bar">
            {isTutorialBattle ? "初回バトル準備" : "バトル準備"}
          </div>

          {isPvP && <div className="setup-cta-area is-briefing-cta">
            <button
              className="start-battle-btn semantic-cta semantic-cta--primary active-scale-effect"
              onClick={launchRegularBattle}
              disabled={setupLaunching}
              aria-busy={setupLaunching}
            >{setupLaunching ? "BATTLE START" : "対戦開始"}</button>
            <button
              type="button"
              className="cancel-battle-btn semantic-cta semantic-cta--secondary"
              disabled={setupLaunching}
              onClick={() => { if (cancelPreparedPvpBattle()) playSe("UI_BACK"); }}
            >対戦をやめる</button>
          </div>}

          <div className="setup-scroll-area">
            {/* 上段：エネミー情報 */}
            <div className="setup-enemy-wrapper">
              <div className="setup-enemy-title">対戦相手</div>
              {isPvP ? (
                <>
                  <PvpPowerSummary className="is-opponent" totalPower={enemyPower} atk={enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.atk || 0), 0)} def={enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.def || 0), 0)} spd={enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.spd || 0), 0)} />
                  <PvpDeckPresentation className="setup-pvp-deck" ariaLabel="対戦相手のデッキ" members={enemyPartyStates.map((enemy: any, idx: number) => ({ key: enemy.id || `enemy-${idx}`, characterId: enemy.characterId, name: enemy.name, level: enemy.level }))} />
                  <SkillIconGrid className="setup-enemy-skill-grid" skills={canonicalEnemySkills} onSelect={setSelectedOpponentSkill} />
                </>
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
              {!isTutorialBattle && !isPvP && <div className="setup-stat-summary mt-2" aria-label="対戦相手ステータス">
                <strong>総合力 <b>{enemyPower.toLocaleString()}</b></strong>
                <div><span>ATK <b>{enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.atk || 0), 0).toLocaleString()}</b></span><span>DEF <b>{enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.def || 0), 0).toLocaleString()}</b></span><span>SPD <b>{enemyPartyStates.reduce((total: number, enemy: any) => total + Number(enemy.stats?.spd || 0), 0).toLocaleString()}</b></span></div>
              </div>}
            </div>

            {/* 下段：自部隊カード編成 */}
            <div className="setup-versus-marker" aria-hidden="true"><span>VS</span></div>

            <div className="setup-player-wrapper">
              <div className="setup-player-title">
                <span>自軍メンバー</span>
              </div>
              {isPvP ? <PvpDeckPresentation className="setup-pvp-deck" ariaLabel="自分のデッキ" showSkills onSkillSelect={setSelectedOpponentSkill} members={playerPartyStates.map((charState: any, idx: number) => {
                const canonical = canonicalPvpCharacter(charState.characterId);
                const equipped = (charState.skills || []).map((skill: any) => skill.skill_card_id || skill.skillId || skill.id).filter((skillId: string) => skillId && skillId !== "BASIC_ATTACK").slice(0, 6);
                return { key: charState.id || `player-${idx}`, characterId: canonical?.id || charState.characterId, name: charState.name, level: charState.level, skillIds: equipped };
              })} /> : <div className="setup-cards-row gap-2 justify-between">
                {playerPartyStates.map((charState: any, idx: number) => {
                  const hpPercent = (charState.hp / charState.maxHp) * 100;
                  const masterData = CHARACTERS_MASTER.find(m => m.id === charState.characterId || m.name === charState.characterId);
                  const rarity = (masterData as any)?.rarity || "R";

                  return (
                    <div 
                      key={charState.id || idx}
                      className={`setup-char-card ${idx === 0 ? "is-leader" : ""} flex-col items-center cursor-pointer active-scale-effect`}
                      data-character-id={charState.characterId}
                      onClick={() => { if (!isTutorialBattle) { setSelectedCharDetail(charState); playCyberSe("click"); } }}
                    >
                      <CharacterPresentation
                        rarity={rarity}
                        src={masterData ? getCharacterTransparentImg(masterData.name) : undefined}
                        alt={charState.name}
                        variant="thumbnail"
                        frameKind="character"
                        metadata={false}
                      />
                      <div className="setup-card-name truncate mt-1 font-size-6">{charState.name}</div>
                      <div className="setup-card-lv font-size-6 text-amber-300">Lv.{charState.level}</div>
                      <div className="setup-card-hp-bar w-full mt-1">
                        <div className="setup-card-hp-fill" style={{ width: `${hpPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>}
              {!isTutorialBattle && (isPvP ? <PvpPowerSummary className="is-player" totalPower={playerPower} atk={playerPartyStates.reduce((total: number, player: any) => total + Number(player.stats?.atk || 0), 0)} def={playerPartyStates.reduce((total: number, player: any) => total + Number(player.stats?.def || 0), 0)} spd={playerPartyStates.reduce((total: number, player: any) => total + Number(player.stats?.spd || 0), 0)} /> : <div className="setup-stat-summary is-player" aria-label="自軍ステータス">
                <strong>総合力 <b>{playerPower.toLocaleString()}</b></strong>
                <div><span>ATK <b>{playerPartyStates.reduce((total: number, player: any) => total + Number(player.stats?.atk || 0), 0).toLocaleString()}</b></span><span>DEF <b>{playerPartyStates.reduce((total: number, player: any) => total + Number(player.stats?.def || 0), 0).toLocaleString()}</b></span><span>SPD <b>{playerPartyStates.reduce((total: number, player: any) => total + Number(player.stats?.spd || 0), 0).toLocaleString()}</b></span></div>
              </div>)}
            </div>

            {/* 作戦AI設定 */}
            <div className="setup-tactic-wrapper">
              <div className="font-size-8 font-weight-bold text-white mb-1">
                作戦
              </div>
              <div className="setup-tactic-current">
                <span>現在：<strong>{TACTIC_OPTIONS.find((entry) => entry.id === tactic)?.label || "バランス"}</strong></span>
                <button type="button" disabled={battleMode === "PATROL"} onClick={() => setTacticDialogOpen(true)}>変更</button>
              </div>
              {battleMode === "PATROL" && (
                <div className="font-size-6 text-secondary mt-1">派遣時に選んだ作戦で自動戦闘します。</div>
              )}
            </div>
          </div>

          {/* 出撃開始ボタン */}
          {!isPvP && <div className="setup-cta-area">
            <button
              className={`start-battle-btn semantic-cta semantic-cta--primary active-scale-effect ${isTutorialBattle ? "tutorial-primary-target" : ""}`}
              onClick={isTutorialBattle ? launchBattleOnce : launchRegularBattle}
              disabled={setupLaunching}
              aria-busy={setupLaunching}
            >
              {setupLaunching ? "BATTLE START" : battleMode === "PVP_PRACTICE" ? "模擬戦開始" : isTutorialBattle ? "BATTLE START" : battleMode === "PVP" ? "対戦開始" : battleMode === "GVG" ? "GvG開始" : battleMode === "RAID" ? "討伐開始" : "出撃開始"}
            </button>
          </div>}
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
        {selectedOpponentSkill && <SkillDetailDialog skill={selectedOpponentSkill} onClose={() => setSelectedOpponentSkill(null)} />}
        {tacticDialogOpen && <div className="read-only-detail-modal" onClick={() => setTacticDialogOpen(false)}>
          <div className="detail-modal-card tactic-dialog-card" onClick={(event) => event.stopPropagation()}>
            <div className="detail-modal-header"><span>作戦を変更</span><button className="sub-btn" onClick={() => setTacticDialogOpen(false)}>閉じる</button></div>
            <div className="tactic-dialog-options">{TACTIC_OPTIONS.map((entry) => <button
              type="button"
              key={entry.id}
              className={`tactic-btn ${tactic === entry.id ? "active" : ""}`}
              onClick={() => { setTactic(entry.id as any); setTacticDialogOpen(false); playCyberSe("click"); }}
            ><i aria-hidden="true">{entry.icon}</i><span><strong>{entry.label}</strong><small>{entry.description}</small></span></button>)}</div>
          </div>
        </div>}
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
        actionPresentation={actionPresentation}
        round={battleRound}
        roundLimit={battlePresentationContext?.roundLimit}
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
        backgroundPath={battlePresentationContext?.backgroundPath}
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
