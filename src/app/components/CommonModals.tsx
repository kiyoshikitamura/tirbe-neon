"use client";

import React, { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { CANONICAL_EQUIPMENT_VIEW } from "@/utils/equipments_master_data";
import { CANONICAL_SKILL_VIEW } from "@/utils/skills_master_data";
import { CHARACTERS_MASTER } from "@/utils/game_constants";
import CharacterPresentation from "./character/CharacterPresentation";
import OutlawButton from "./ui/OutlawButton";
import TutorialNavigator from "./TutorialNavigator";
import { getAcquisitionBadgeAsset, getAwakeningBadgeAsset, getRarityFrameAsset } from "@/utils/rarityAssets";
import { GACHA_RARITY_ASSETS } from "../lib/screenManifests";
import { preloadAssetManifest } from "../lib/screenAssets";
import { getCharacterLocationBackground } from "@/utils/characterVisualAssets";
import "./CommonModals.css";
import { userFacingErrorMessage } from "../lib/userFacingError";
import { resolveSsrGachaQuote } from "@/domain/presentation/ssrGachaQuotes";
import TypewriterText from "./tutorial/TypewriterText";
import CanonicalDialog from "./ui/CanonicalDialog";
import PublicUserProfile from "./profile/PublicUserProfile";
import UserIdentityRow from "./profile/UserIdentityRow";

function gachaLocationBackground(result: any): string {
  const master = CHARACTERS_MASTER.find((character: any) => character.id === result?.characterId);
  return getCharacterLocationBackground(master?.homeTown);
}

const guildAlignmentLabel = (value?: string | null) => ({
  JUSTICE: "正義", EVIL: "悪", ORDER: "秩序", CHAOS: "混沌",
}[String(value || "").toUpperCase()] || "未設定");

const guildRoleLabel = (role?: string | null) => {
  if (role === "MASTER") return "ギルドマスター";
  if (role === "SUB_MASTER" || role === "SUBMASTER") return "副団長";
  return "メンバー";
};

export default function CommonModals() {
  const {
    showGearModal,
    setShowGearModal,
    activeGearSlot,
    userEquipmentsList,
    handleEquipGear,
    showSkillModal,
    setShowSkillModal,
    activeSkillSlot,
    userSkillsList,
    handleEquipSkill,
    scoutAnimationState,
    setScoutAnimationState,
    scoutFlashingColor,
    scoutResults,
    errorMessage,
    setErrorMessage,
    playCyberSe,
    activePlayerDetail,
    setActivePlayerDetail,
    session,
    setDmRecipientId,
    setShowTribeChatPanel,
    setChatChannel,
    activeGuildDetail,
    setActiveGuildDetail,
    onboardingState,
    navigateTab,
    userGuildMember,
    pendingGuildJoinRequests,
    handleDemoJoinGuild,
    fetchGuildDetail,
    fetchPlayerDetail,
    playSe,
  } = useGame();
  const announcedScoutResultRef = useRef<any[] | null>(null);
  const [tutorialRevealIndex, setTutorialRevealIndex] = React.useState(0);
  const [tutorialSsrStage, setTutorialSsrStage] = React.useState<"STANDARD" | "QUOTE" | "FLASH" | "REVEAL">("STANDARD");
  const [tutorialRevealAdvancing, setTutorialRevealAdvancing] = React.useState(false);
  const [tutorialRevealCanAdvance, setTutorialRevealCanAdvance] = React.useState(false);
  const [tutorialPullStarted, setTutorialPullStarted] = React.useState(false);
  const [tutorialPullBurst, setTutorialPullBurst] = React.useState(false);
  const tutorialRevealAdvanceRef = useRef(false);
  const isCharacterReveal = scoutResults.length > 0
    && scoutResults.every((result: any) => result?.type === "CHARACTER" && result?.characterId);
  const tutorialRevealResult = scoutResults[tutorialRevealIndex];
  const tutorialRevealRarity = String(tutorialRevealResult?.rarity || "N").toUpperCase();
  const tutorialRevealQuote = tutorialRevealRarity === "SSR"
    ? resolveSsrGachaQuote(tutorialRevealResult?.characterId)
    : null;

  useEffect(() => {
    if (scoutAnimationState !== "SHOW_RESULTS" || announcedScoutResultRef.current === scoutResults) return;
    announcedScoutResultRef.current = scoutResults;
    playSe("GACHA_REVEAL");
    const rarities = scoutResults.map((result: any) => String(result.rarity || "").toUpperCase());
    if (!rarities.includes("SSR") && rarities.includes("SR")) playSe("GACHA_SR");
  }, [playSe, scoutAnimationState, scoutResults]);

  useEffect(() => {
    if (scoutAnimationState === null) {
      announcedScoutResultRef.current = null;
      setTutorialPullStarted(false);
      setTutorialPullBurst(false);
    }
  }, [scoutAnimationState]);

  useEffect(() => {
    if (scoutAnimationState === null) return;
    void preloadAssetManifest(GACHA_RARITY_ASSETS.map((src) => ({ src, required: false })));
  }, [scoutAnimationState]);

  useEffect(() => {
    if (scoutAnimationState !== "READY" || !tutorialPullStarted) return;
    setTutorialPullBurst(true);
    const timer = window.setTimeout(() => setScoutAnimationState("SHOW_RESULTS"), 620);
    return () => window.clearTimeout(timer);
  }, [scoutAnimationState, setScoutAnimationState, tutorialPullStarted]);

  useEffect(() => {
    if (scoutAnimationState === "SHOW_RESULTS") {
      setTutorialRevealIndex(0);
      setTutorialSsrStage("STANDARD");
      setTutorialRevealAdvancing(false);
      tutorialRevealAdvanceRef.current = false;
    }
  }, [scoutAnimationState, scoutResults]);

  useEffect(() => {
    if (!isCharacterReveal || scoutAnimationState !== "SHOW_RESULTS") return;
    setTutorialSsrStage(tutorialRevealRarity === "SSR" ? "QUOTE" : "STANDARD");
  }, [isCharacterReveal, scoutAnimationState, tutorialRevealIndex, tutorialRevealRarity]);

  useEffect(() => {
    if (!isCharacterReveal || scoutAnimationState !== "SHOW_RESULTS") return;
    setTutorialRevealCanAdvance(false);
    if (tutorialSsrStage === "QUOTE" || tutorialSsrStage === "FLASH") return;
    const dwellMs = tutorialRevealRarity === "SSR" ? 900 : tutorialRevealRarity === "SR" ? 1600 : tutorialRevealRarity === "R" ? 1100 : 650;
    const timer = window.setTimeout(() => setTutorialRevealCanAdvance(true), dwellMs);
    return () => window.clearTimeout(timer);
  }, [isCharacterReveal, scoutAnimationState, tutorialRevealIndex, tutorialRevealRarity, tutorialSsrStage]);

  useEffect(() => {
    if (tutorialSsrStage !== "FLASH") return;
    const timer = window.setTimeout(() => setTutorialSsrStage("REVEAL"), 420);
    return () => window.clearTimeout(timer);
  }, [tutorialSsrStage]);

  const compactGachaOutcome = (result: any) => {
    const outcome = String(result.convertReward || "");
    if (outcome === "新規獲得") return "NEW";
    if (outcome.includes("覚醒")) return outcome.replace("段階", " ");
    if (result.converted || outcome.includes("抗争の掟")) return "重複 / 掟+1";
    if (outcome.includes("限界突破")) return outcome;
    return outcome || "獲得";
  };
  const assetProgressionLevel = (result: any) => {
    const projectedLevel = Math.trunc(Number(result.progressionLevel));
    if (Number.isFinite(projectedLevel) && projectedLevel > 0) return projectedLevel;
    const match = String(result.convertReward || "").match(/限界突破\s*\+(\d+)/);
    return match ? Number(match[1]) : null;
  };
  const formatRevealParameter = (value: unknown) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString() : "—";
  };

  return (
    <>
      {/* 🛡️ 装備選択モーダル */}
      {showGearModal && activeGearSlot !== null && (
        <div className="modal-overlay">
          <div className="modal-card select-modal-layout">
            <div className="modal-title flex items-center justify-between pb-2 border-bottom-subtle">
              <span>装備カード選択 (スロット {activeGearSlot})</span>
              <button 
                className="sub-btn font-size-7 py-0.5 active-scale-effect"
                onClick={() => { setShowGearModal(false); playCyberSe("click"); }}
              >
                閉じる
              </button>
            </div>
            
            <div className="list-container scroll-container max-h-300 mt-2">
              {userEquipmentsList
                .filter((eq: any) => eq.equipped_character_id === null)
                .map((eq: any) => {
                  const master = CANONICAL_EQUIPMENT_VIEW.find((m: any) => m.id === eq.equipment_id);
                  return (
                    <div key={eq.id} className="list-item">
                      {master && <img className="equipment-list-art" src={master.assetPath} alt="" aria-hidden="true" />}
                      <div className="item-left">
                        <span className="item-title">{master?.name || eq.equipment_id}</span>
                        <span className="item-desc">Lv.{eq.level} ｜ Rarity: {master?.rarity}</span>
                      </div>
                      <button 
                        className="action-btn claim active-scale-effect font-size-8 px-3"
                        onClick={() => handleEquipGear(eq.id)}
                      >
                        装備
                      </button>
                    </div>
                  );
                })}
              {userEquipmentsList.filter((eq: any) => eq.equipped_character_id === null).length === 0 && (
                <div className="font-size-8 text-secondary text-center py-4">未装備の装備品がありません。</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎴 スキルカード選択モーダル */}
      {showSkillModal && activeSkillSlot !== null && (
        <div className="modal-overlay">
          <div className="modal-card select-modal-layout">
            <div className="modal-title flex items-center justify-between pb-2 border-bottom-subtle">
              <span>スキルカード選択 (スロット {activeSkillSlot+1})</span>
              <button 
                className="sub-btn font-size-7 py-0.5 active-scale-effect"
                onClick={() => { setShowSkillModal(false); playCyberSe("click"); }}
              >
                閉じる
              </button>
            </div>

            <div className="list-container scroll-container max-h-300 mt-2">
              {userSkillsList
                .filter((us: any) => us.equipped_character_id === null)
                .map((us: any) => {
                  const master = CANONICAL_SKILL_VIEW.find((s: any) => s.id === us.skill_card_id);
                  return (
                    <div key={us.id} className="list-item">
                      <div className="item-left">
                        <span className="item-title">{master?.name || us.skill_card_id}</span>
                        <span className="item-desc">Rarity: {master?.rarity} ｜ 突破: +{us.plus_val}</span>
                      </div>
                      <button 
                        className="action-btn claim active-scale-effect font-size-8 px-3"
                        onClick={() => handleEquipSkill(us.id)}
                      >
                        装備
                      </button>
                    </div>
                  );
                })}
              {userSkillsList.filter((us: any) => us.equipped_character_id === null).length === 0 && (
                <div className="font-size-8 text-secondary text-center py-4">未装備のスキルカードがありません。</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎰 ガチャ演出モーダル (FLASHING / SHOW_RESULTS) */}
      {scoutAnimationState !== null && (
        <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }} data-gacha-transition-state={scoutAnimationState.toLowerCase()}>
          {scoutAnimationState === "PROCESSING" || scoutAnimationState === "FLASHING" || scoutAnimationState === "READY" ? (
            <div className={`gacha-presentation-stage gacha-presentation-${scoutFlashingColor.toLowerCase()} ${tutorialPullStarted ? "is-pull-started" : "is-awaiting-pull"} ${scoutAnimationState === "FLASHING" && scoutFlashingColor === "GOLD" && !isCharacterReveal ? "is-ssr-presence" : ""}`}>
              <div className={`gacha-flash-effect flash-${scoutFlashingColor.toLowerCase()}`} />
              <div className="gacha-presentation-rings" aria-hidden="true"><i /><i /><i /></div>
              {!isCharacterReveal ? (
                <div className={`gacha-asset-short-effect ${scoutFlashingColor === "GOLD" ? "has-ssr" : ""}`} role="status" aria-live="polite" aria-label="スキル・装備ガチャ抽選中" data-gacha-short-effect>
                  <strong>{scoutFlashingColor === "GOLD" ? "SSR" : "DRAW"}</strong>
                  <span>{scoutFlashingColor === "GOLD" ? "レアリティ反応" : "抽選中…"}</span>
                </div>
              ) : !tutorialPullStarted ? (
                <button
                  type="button"
                  className="gacha-pull-gate"
                  onClick={() => {
                    setTutorialPullStarted(true);
                    playCyberSe("click");
                  }}
                >
                  <strong>10 PLAYERS</strong>
                  <span>TAP TO START</span>
                </button>
              ) : (
                <div className={`gacha-pull-burst ${tutorialPullBurst ? "is-ready" : ""}`} role="status" aria-label="ガチャ演出中">
                  <strong>PULL!</strong>
                </div>
              )}
            </div>
          ) : isCharacterReveal && tutorialRevealIndex < scoutResults.length ? (
            <button
              type="button"
              className={`tutorial-gacha-reveal rarity-${String(tutorialRevealResult?.rarity || "N").toLowerCase()} ${tutorialRevealResult?.convertReward === "新規獲得" ? "acquisition-new" : "acquisition-duplicate"} ${tutorialRevealAdvancing ? "is-advancing" : ""} ${tutorialRevealIndex === 9 ? "is-guaranteed" : ""} ${tutorialSsrStage === "QUOTE" ? "is-ssr-quote" : ""} ${tutorialSsrStage === "FLASH" ? "is-ssr-flash" : ""} ${tutorialSsrStage === "REVEAL" ? "is-ssr-reveal" : ""}`}
              onClick={() => {
                if (tutorialRevealAdvanceRef.current || !tutorialRevealCanAdvance) return;
                if (tutorialSsrStage === "QUOTE") {
                  playSe("GACHA_SSR");
                  setTutorialSsrStage("FLASH");
                  return;
                }
                if (tutorialSsrStage === "FLASH") return;
                tutorialRevealAdvanceRef.current = true;
                setTutorialRevealAdvancing(true);
                playCyberSe("click");
                window.setTimeout(() => {
                  setTutorialRevealIndex(value => Math.min(scoutResults.length, value + 1));
                  tutorialRevealAdvanceRef.current = false;
                  setTutorialRevealAdvancing(false);
                }, 280);
              }}
              disabled={tutorialRevealAdvancing}
              aria-disabled={!tutorialRevealCanAdvance}
              aria-busy={tutorialRevealAdvancing}
              data-can-advance={tutorialRevealCanAdvance}
              aria-label={tutorialSsrStage === "QUOTE" || tutorialSsrStage === "FLASH" ? "特別紹介を確認" : `${tutorialRevealIndex + 1}人目を確認`}
              data-character-id={tutorialSsrStage === "QUOTE" || tutorialSsrStage === "FLASH" ? undefined : tutorialRevealResult?.characterId || undefined}
              data-presentation-state={tutorialRevealRarity === "SSR" ? `SSR_${tutorialSsrStage}` : "STANDARD_REVEAL"}
            >
              <span className="tutorial-gacha-count">{tutorialRevealIndex + 1} / {scoutResults.length}</span>
              {tutorialSsrStage === "QUOTE" ? (
                <div className="tutorial-ssr-quote" role="status">
                  <blockquote><TypewriterText text={tutorialRevealQuote || ""} speedMs={38} onComplete={() => setTutorialRevealCanAdvance(true)} /></blockquote>
                  <small>{tutorialRevealCanAdvance ? "TAP" : "…"}</small>
                </div>
              ) : tutorialSsrStage === "FLASH" ? (
                <div className="tutorial-ssr-flash" role="status" aria-label="キャラクター登場演出中"><i /></div>
              ) : (
                <div key={`${tutorialRevealIndex}-${tutorialRevealResult?.name || "character"}`} className="tutorial-gacha-reveal-body">
                  {tutorialRevealResult?.imageUrl && <CharacterPresentation src={tutorialRevealResult.imageUrl} alt={tutorialRevealResult.name} variant="reveal" rarity={tutorialRevealResult.rarity} attribute={tutorialRevealResult.attributeKey} backgroundSrc={gachaLocationBackground(tutorialRevealResult)} frameKind="reveal" rarityBadge attributeBadge />}
                  {getAcquisitionBadgeAsset(tutorialRevealResult?.convertReward === "新規獲得" ? "NEW" : "AWAKENING", tutorialRevealResult?.awakeningLevel) && (
                    <img className="tutorial-gacha-acquisition-badge" src={getAcquisitionBadgeAsset(tutorialRevealResult?.convertReward === "新規獲得" ? "NEW" : "AWAKENING", tutorialRevealResult?.awakeningLevel) || ""} alt={compactGachaOutcome(tutorialRevealResult)} />
                  )}
                  <div className="tutorial-gacha-reveal-copy">
                    <h3>{tutorialRevealResult?.name}</h3>
                    <div className="tutorial-gacha-reveal-stats">
                      <span>{tutorialRevealResult?.role || "バランス"}</span>
                      <span>{tutorialRevealResult?.attribute || "無所属"}</span>
                    </div>
                    <dl className="tutorial-gacha-reveal-parameters" aria-label="初期パラメータ">
                      <div><dt>HP</dt><dd>{formatRevealParameter(tutorialRevealResult?.hp)}</dd></div>
                      <div><dt>ATK</dt><dd>{formatRevealParameter(tutorialRevealResult?.atk)}</dd></div>
                      <div><dt>DEF</dt><dd>{formatRevealParameter(tutorialRevealResult?.def)}</dd></div>
                    </dl>
                    <small>タップして次へ</small>
                  </div>
                </div>
              )}
            </button>
          ) : (
            <div className="gacha-result-panel">
              {onboardingState?.tutorial_step === "AUTO_FORMATION" && (
                <TutorialNavigator message="いいじゃん。じゃ、この中から一緒に動くメンバーを決めよ。" />
              )}
              <header className="gacha-result-heading">
                <h3>ガチャ結果</h3>
                <p>{scoutResults.length}件の獲得結果</p>
              </header>

              <div className={`gacha-result-grid ${isCharacterReveal ? "is-character-results" : "is-asset-results"} ${scoutResults.length >= 10 ? "is-ten-pull" : ""}`}>
                {scoutResults.map((res: any, idx: number) => (
                  <article
                    key={`${res.name}-${idx}`}
                    data-acquisition={res.convertReward === "新規獲得" ? "NEW" : "DUPLICATE"}
                    data-ssr-glint={String(res.rarity).toUpperCase() === "SSR" ? "enabled" : undefined}
                    style={{ "--gacha-result-glint-delay": `${(idx % 5) * -0.17}s` } as React.CSSProperties}
                    className={`gacha-result-card rarity-${String(res.rarity).toLowerCase()} ${res.convertReward === "新規獲得" ? "is-new" : "is-duplicate"}`}
                  >
                    {res.type === "CHARACTER" && res.imageUrl ? (
                      <CharacterPresentation
                        src={res.imageUrl}
                        alt={res.name}
                        variant="gacha-result-compact"
                        rarity={res.rarity}
                        attribute={res.attributeKey}
                        backgroundSrc={gachaLocationBackground(res)}
                        frameKind="character"
                        rarityBadge
                        attributeBadge
                      />
                    ) : (
                      res.assetPath || (res.type === "EQUIPMENT" && CANONICAL_EQUIPMENT_VIEW.find((item) => item.id === (res.equipmentId || res.itemId))) ? (
                        <div className={`gacha-result-asset-art is-${String(res.type).toLowerCase()}`}>
                          <img className="gacha-result-item-asset" src={res.assetPath || CANONICAL_EQUIPMENT_VIEW.find((item) => item.id === (res.equipmentId || res.itemId))?.assetPath} alt={res.name} />
                          <img
                            className="gacha-result-rarity-frame"
                            src={getRarityFrameAsset(res.type === "SKILL" ? "skill" : "equipment", res.rarity)}
                            alt={`${res.rarity}レアリティフレーム`}
                          />
                          {res.convertReward === "新規獲得" ? (
                            <img className="gacha-result-asset-badge is-new" src={getAcquisitionBadgeAsset("NEW") || ""} alt="NEW" />
                          ) : assetProgressionLevel(res) ? (
                            <span className="gacha-result-asset-badge is-progression" aria-label={`限界突破 +${assetProgressionLevel(res)}`}>
                              {getAwakeningBadgeAsset(assetProgressionLevel(res)) ? (
                                <img src={getAwakeningBadgeAsset(assetProgressionLevel(res)) || ""} alt="" aria-hidden="true" />
                              ) : (
                                <b>+{assetProgressionLevel(res)}</b>
                              )}
                            </span>
                          ) : null}
                        </div>
                      ) : <div className="gacha-result-asset-placeholder"><span>{res.type === "SKILL" ? "スキル" : "装備"}</span><strong>{res.name}</strong></div>
                    )}
                    {res.type !== "CHARACTER" && <div className="gacha-result-name" title={res.name}>{res.name}</div>}
                    {res.type === "CHARACTER" && getAcquisitionBadgeAsset(res.convertReward === "新規獲得" ? "NEW" : "AWAKENING", res.awakeningLevel) && (
                      <img className="gacha-result-acquisition-badge" src={getAcquisitionBadgeAsset(res.convertReward === "新規獲得" ? "NEW" : "AWAKENING", res.awakeningLevel) || ""} alt={compactGachaOutcome(res)} />
                    )}
                  </article>
                ))}
              </div>

              <button 
                className="gacha-result-next semantic-cta semantic-cta--primary active-scale-effect"
                onClick={() => {
                  setScoutAnimationState(null);
                  playCyberSe("click");
                  if (onboardingState?.tutorial_step === "AUTO_FORMATION") {
                    navigateTab("character");
                  }
                }}
              >
                {onboardingState?.tutorial_step === "AUTO_FORMATION" ? "編成へ進む" : "ガチャへ戻る"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ❌ 汎用エラーモーダル */}
      {errorMessage && (
        <CanonicalDialog title="エラー" onClose={() => setErrorMessage(null)} actions={[{ label: "閉じる", semantic: "secondary", onClick: () => setErrorMessage(null) }]}>
          {userFacingErrorMessage(errorMessage)}
        </CanonicalDialog>
      )}

      {/* 👤 プレイヤー自己紹介ポップアップ */}
      {activePlayerDetail && (
        <PublicUserProfile
          profile={activePlayerDetail}
          currentUserId={session?.user?.id}
          onClose={() => { setActivePlayerDetail(null); playCyberSe("click"); }}
          onRetry={() => void fetchPlayerDetail(activePlayerDetail.id)}
          onGuild={(guildId) => fetchGuildDetail(guildId)}
          onDm={(userId) => {
            setDmRecipientId(userId);
            setActivePlayerDetail(null);
            setChatChannel("DM");
            setShowTribeChatPanel(true);
            playCyberSe("click");
          }}
        />
      )}

      {/* 🏢 ギルド紹介ポップアップ */}
      {activeGuildDetail && (
        <CanonicalDialog
          title={activeGuildDetail.name}
          size="large"
          ariaLabel={`${activeGuildDetail.name}の詳細`}
          onClose={() => { setActiveGuildDetail(null); playCyberSe("click"); }}
        >
            <div className="guild-public-detail">
              <div className="guild-public-identity">
                {activeGuildDetail.emblem_url
                  ? <img className="guild-emblem-placeholder" src={activeGuildDetail.emblem_url} alt="" />
                  : <div className="guild-emblem-placeholder is-placeholder" aria-hidden="true" />}
                <div><strong>{activeGuildDetail.name}</strong><span>Lv.{activeGuildDetail.level} ・ {activeGuildDetail.member_count}/{activeGuildDetail.member_limit}名</span></div>
              </div>
              <div className="guild-meta-section flex justify-between mb-3">
                <div className="guild-public-master">
                  <small>ギルドマスター</small>
                  <UserIdentityRow
                    userName={activeGuildDetail.leaderName}
                    guildName={activeGuildDetail.name}
                    leaderCharacterId={activeGuildDetail.leaderCharacterId}
                    onOpen={activeGuildDetail.leaderUserId ? () => fetchPlayerDetail(activeGuildDetail.leaderUserId) : undefined}
                    variant="compact"
                  />
                </div>
                <div className="guild-alignment text-right">
                  <span className="alignment-badge main font-size-7 px-1.5 py-0.5 font-weight-bold text-white rounded">
                    メイン属性: {guildAlignmentLabel(activeGuildDetail.main_alignment)}
                  </span>
                  <span className="alignment-badge sub font-size-7 px-1.5 py-0.5 font-weight-bold text-white rounded block mt-1">
                    サブ属性: {guildAlignmentLabel(activeGuildDetail.sub_alignment)}
                  </span>
                </div>
              </div>

              <div className="guild-public-status-grid">
                <span><small>参加方法</small><strong>{Number(activeGuildDetail.member_count || 0) >= Number(activeGuildDetail.member_limit || 0) ? "満員" : activeGuildDetail.recruitment_mode === "CLOSED" ? "募集停止" : activeGuildDetail.recruitment_mode === "APPLICATION_REQUIRED" || activeGuildDetail.approval_required ? "承認制" : "自由加入"}</strong></span>
                <span><small>空き枠</small><strong>{Math.max(0, Number(activeGuildDetail.member_limit || 0) - Number(activeGuildDetail.member_count || 0))}枠</strong></span>
                <span><small>直近7日アクティブ</small><strong>{Number(activeGuildDetail.active_members_7d || 0)}人</strong></span>
                <span><small>レイド貢献</small><strong>{Number(activeGuildDetail.raid_contribution_7d || 0).toLocaleString()}</strong></span>
                <span><small>総合力</small><strong>{Number(activeGuildDetail.guild_power || 0).toLocaleString()}</strong></span>
              </div>

              <div className="guild-desc-box steel-tray p-2.5 mb-3 font-size-8 text-white line-height-14">
                {activeGuildDetail.description}
              </div>

              <section className="guild-public-members" aria-label="メンバー">
                <div className="guild-public-section-title"><strong>メンバー</strong><small>{activeGuildDetail.members?.length || 0}名</small></div>
                <div className="guild-public-member-list">
                  {(activeGuildDetail.members || []).map((member: any) => (
                    <div className="guild-public-member-row" key={member.user_id}>
                      <UserIdentityRow
                        userName={member.username}
                        guildName={activeGuildDetail.name}
                        leaderCharacterId={member.favorite_character_id || null}
                        onOpen={() => fetchPlayerDetail(member.user_id)}
                        variant="compact"
                      />
                      <span>{guildRoleLabel(member.role)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {!userGuildMember && (() => {
                const pendingRequest = pendingGuildJoinRequests?.find((request: any) => request.guild_id === activeGuildDetail.id && request.status === "PENDING");
                const unavailable = activeGuildDetail.recruitment_mode === "CLOSED" || Number(activeGuildDetail.member_count || 0) >= Number(activeGuildDetail.member_limit || 0);
                return <OutlawButton variant="primary" fullWidth className="mt-3" disabled={Boolean(pendingRequest) || unavailable} onClick={async () => {
                  const targetGuild = activeGuildDetail;
                  setActiveGuildDetail(null);
                  void import("../../utils/supabase").then(({ supabase }) => supabase.rpc("record_client_funnel_event", {
                    p_event_name: "guild_detail_join_click", p_source_screen: "guild_detail",
                    p_source_cta: targetGuild.recruitment_mode === "APPLICATION_REQUIRED" || targetGuild.approval_required ? "apply" : "join",
                    p_object_id: targetGuild.id, p_metadata: {}
                  }));
                  await handleDemoJoinGuild(targetGuild.id, targetGuild.name, targetGuild.recruitment_mode === "APPLICATION_REQUIRED" || targetGuild.approval_required);
                }}>
                  {pendingRequest ? "申請中" : activeGuildDetail.recruitment_mode === "CLOSED" ? "募集停止" : Number(activeGuildDetail.member_count || 0) >= Number(activeGuildDetail.member_limit || 0) ? "満員" : activeGuildDetail.recruitment_mode === "APPLICATION_REQUIRED" || activeGuildDetail.approval_required ? "加入申請する" : "このギルドに加入する"}
                </OutlawButton>;
              })()}
            </div>
        </CanonicalDialog>
      )}
    </>
  );
}
