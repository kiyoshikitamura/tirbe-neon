"use client";

import React, { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
import CharacterPresentation from "./character/CharacterPresentation";
import OutlawButton from "./ui/OutlawButton";
import "./CommonModals.css";

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
    handleDemoJoinGuild,
    fetchGuildDetail,
    playSe,
  } = useGame();
  const announcedScoutResultRef = useRef<any[] | null>(null);
  const [tutorialRevealIndex, setTutorialRevealIndex] = React.useState(0);
  const isTutorialTenReveal = onboardingState?.tutorial_step === "AUTO_FORMATION" && scoutResults.length === 10;

  useEffect(() => {
    if (scoutAnimationState !== "SHOW_RESULTS" || announcedScoutResultRef.current === scoutResults) return;
    announcedScoutResultRef.current = scoutResults;
    playSe("GACHA_REVEAL");
    const rarities = scoutResults.map((result: any) => String(result.rarity || "").toUpperCase());
    if (rarities.includes("SSR")) playSe("GACHA_SSR");
    else if (rarities.includes("SR")) playSe("GACHA_SR");
  }, [playSe, scoutAnimationState, scoutResults]);

  useEffect(() => {
    if (scoutAnimationState === null) announcedScoutResultRef.current = null;
  }, [scoutAnimationState]);

  useEffect(() => {
    if (scoutAnimationState === "SHOW_RESULTS") setTutorialRevealIndex(0);
  }, [scoutAnimationState, scoutResults]);

  const compactGachaOutcome = (result: any) => {
    const outcome = String(result.convertReward || "");
    if (outcome === "新規獲得") return "NEW";
    if (outcome.includes("覚醒")) return outcome.replace("段階", " ");
    if (result.converted || outcome.includes("抗争の掟")) return "重複 / 掟+1";
    if (outcome.includes("限界突破")) return outcome;
    return outcome || "獲得";
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
                  const master = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === eq.equipment_id);
                  return (
                    <div key={eq.id} className="list-item">
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
                  const master = SKILLS_MASTER_DATA.find((s: any) => s.id === us.skill_card_id);
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
        <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
          {scoutAnimationState === "FLASHING" ? (
            <div className={`gacha-presentation-stage gacha-presentation-${scoutFlashingColor.toLowerCase()}`}>
              <div className={`gacha-flash-effect flash-${scoutFlashingColor.toLowerCase()}`} />
              <div className="gacha-presentation-rings" aria-hidden="true"><i /><i /><i /></div>
              <div className="gacha-presentation-copy">
                <span>NEON SIGNAL DETECTED</span>
                <strong>新しい仲間の気配――</strong>
                <small>ガチャ実行中...</small>
              </div>
            </div>
          ) : isTutorialTenReveal && tutorialRevealIndex < scoutResults.length ? (
            <button
              type="button"
              className={`tutorial-gacha-reveal rarity-${String(scoutResults[tutorialRevealIndex]?.rarity || "N").toLowerCase()} ${tutorialRevealIndex === 9 ? "is-guaranteed" : ""}`}
              onClick={() => { playCyberSe("click"); setTutorialRevealIndex(value => Math.min(scoutResults.length, value + 1)); }}
              aria-label={`${tutorialRevealIndex + 1}人目を確認`}
            >
              <span className="tutorial-gacha-count">REVEAL {tutorialRevealIndex + 1} / 10</span>
              {tutorialRevealIndex === 9 && <strong className="tutorial-gacha-guaranteed">SSR GUARANTEED</strong>}
              {scoutResults[tutorialRevealIndex]?.imageUrl && <CharacterPresentation src={scoutResults[tutorialRevealIndex].imageUrl} alt={scoutResults[tutorialRevealIndex].name} variant="card" rarity={scoutResults[tutorialRevealIndex].rarity} />}
              <div className="tutorial-gacha-reveal-copy"><b>{scoutResults[tutorialRevealIndex]?.rarity}</b><h3>{scoutResults[tutorialRevealIndex]?.name}</h3><small>タップして次へ</small></div>
            </button>
          ) : (
            <div className="gacha-result-panel">
              <header className="gacha-result-heading">
                <span>SCOUT COMPLETE</span>
                <h3>ガチャ結果</h3>
                <p>{scoutResults.length}件の獲得結果</p>
              </header>

              <div className={`gacha-result-grid ${scoutResults.length >= 10 ? "is-ten-pull" : ""}`}>
                {scoutResults.map((res: any, idx: number) => (
                  <article key={`${res.name}-${idx}`} className={`gacha-result-card rarity-${String(res.rarity).toLowerCase()}`}>
                    {res.imageUrl ? (
                      <CharacterPresentation
                        src={res.imageUrl}
                        alt={res.name}
                        variant={scoutResults.length >= 10 ? "thumbnail" : "card"}
                        rarity={res.rarity}
                        name={res.name}
                        badge={res.convertReward === "新規獲得" ? "NEW" : undefined}
                      />
                    ) : (
                      <div className="gacha-result-asset-placeholder"><span>{res.type === "SKILL" ? "SKILL" : "GEAR"}</span><strong>{res.name}</strong></div>
                    )}
                    <div className={`gacha-result-outcome ${res.convertReward === "新規獲得" ? "is-new" : "is-duplicate"}`}>{compactGachaOutcome(res)}</div>
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
                {onboardingState?.tutorial_step === "AUTO_FORMATION" ? "編成へ進む" : "閉じる"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ❌ 汎用エラーモーダル */}
      {errorMessage && (
        <div className="modal-overlay">
          <div className="modal-card border-danger">
            <div className="modal-title text-color-danger">エラー</div>
            <div className="modal-desc">{errorMessage}</div>
            <button className="semantic-cta semantic-cta--danger width-100 active-scale-effect" onClick={() => setErrorMessage(null)}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 👤 プレイヤー自己紹介ポップアップ */}
      {activePlayerDetail && (
        <div className="modal-overlay">
          <div className="modal-card detail-modal-layout border-silver shadow-silver-10 max-w-sm w-full mx-4 my-6">
            <div className="modal-title border-bottom-subtle pb-2 flex items-center justify-between">
              <span className="font-weight-bold text-white">プレイヤープロフィール</span>
              <button 
                className="sub-btn font-size-7 py-0.5 active-scale-effect"
                onClick={() => { setActivePlayerDetail(null); playCyberSe("click"); }}
              >
                閉じる
              </button>
            </div>
            
            <div className="modal-body-content mt-3">
              <div className="profile-section mb-3">
                <img
                  src={activePlayerDetail.avatarUrl || "/reiji_transparent_asset.png"}
                  alt=""
                  className="modal-profile-img mb-2"
                />
                <div className="font-size-9 font-weight-bold text-white">{activePlayerDetail.username}</div>
                <div className="font-size-7 text-color-cyan mt-1">称号: {activePlayerDetail.titleName || "称号なし"}</div>
                <div className="font-size-7 text-secondary mt-1">プレイヤーレベル: Lv.{activePlayerDetail.level}</div>
                <div className="font-size-7 text-secondary mt-1">ユーザー経験値: {Number(activePlayerDetail.xp || 0).toLocaleString()}</div>
                {activePlayerDetail.guildId ? (
                  <button className="sub-btn font-size-7 mt-1" onClick={() => {
                    void import("../../utils/supabase").then(({ supabase }) => supabase.rpc("record_client_funnel_event", {
                      p_event_name: "ranking_guild_detail", p_source_screen: "player_detail", p_source_cta: "player_guild",
                      p_object_id: activePlayerDetail.guildId, p_metadata: {}
                    }));
                    fetchGuildDetail(activePlayerDetail.guildId);
                  }}>所属TRIBE: {activePlayerDetail.guildName}</button>
                ) : <div className="font-size-7 text-secondary mt-1">所属TRIBE: 未所属</div>}
              </div>

              <div className="bio-section steel-tray p-2.5 mb-3 font-size-8 text-white line-height-14">
                {activePlayerDetail.bio}
              </div>

              {activePlayerDetail.id && activePlayerDetail.id !== session?.user?.id && (
                <button
                  className="action-btn claim active-scale-effect font-size-8 px-3 mb-3"
                  onClick={() => {
                    setDmRecipientId(activePlayerDetail.id);
                    setActivePlayerDetail(null);
                    setChatChannel("DM");
                    setShowTribeChatPanel(true);
                    playCyberSe("click");
                  }}
                >
                  DMを送る
                </button>
              )}

              <div className="party-section">
                <span className="section-subtitle font-size-7 text-secondary block mb-2">出撃パーティ</span>
                <div className="flex-col-gap-2">
                  {activePlayerDetail.party && activePlayerDetail.party.length > 0 ? (
                    activePlayerDetail.party.map((char: any, idx: number) => (
                      <div key={idx} className="party-member-card steel-tray p-2 flex justify-between items-center">
                        <div className="char-info flex items-center gap-2">
                          <div className="char-name-lv">
                            <span className="font-size-8 font-weight-bold text-white block">{char.name}</span>
                            <span className="font-size-7 text-secondary block">Lv.{char.level} (★{char.plus_val})</span>
                          </div>
                        </div>
                        <div className="char-stats font-size-7 text-secondary text-right">
                          <div>HP: <span className="text-white font-weight-bold">{char.stats.hp}</span> ｜ ATK: <span className="text-white font-weight-bold">{char.stats.atk}</span></div>
                          <div>DEF: <span className="text-white font-weight-bold">{char.stats.def}</span> ｜ SPD: <span className="text-white font-weight-bold">{char.stats.spd}</span> ｜ LUK: <span className="text-white font-weight-bold">{char.stats.luk}</span></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="font-size-7 text-secondary text-center py-2">編成されたキャラクターがいません。</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🏢 ギルド紹介ポップアップ */}
      {activeGuildDetail && (
        <div className="modal-overlay">
          <div className="modal-card detail-modal-layout border-silver shadow-silver-10 max-w-sm w-full mx-4 my-6">
            <div className="modal-title border-bottom-subtle pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="guild-emblem-placeholder flex items-center justify-center font-weight-bold">
                  {activeGuildDetail.name.charAt(0)}
                </div>
                <span className="font-weight-bold text-white">{activeGuildDetail.name}</span>
              </div>
              <button 
                className="sub-btn font-size-7 py-0.5 active-scale-effect"
                onClick={() => { setActiveGuildDetail(null); playCyberSe("click"); }}
              >
                閉じる
              </button>
            </div>
            
            <div className="modal-body-content mt-3">
              <div className="guild-meta-section flex justify-between mb-3">
                <div className="guild-info">
                  <div className="font-size-8 text-white">代表者: <span className="font-weight-bold">{activeGuildDetail.leaderName}</span></div>
                  <div className="font-size-7 text-secondary mt-0.5">レベル: Lv.{activeGuildDetail.level} (XP: {activeGuildDetail.xp})</div>
                  <div className="font-size-7 text-secondary mt-0.5">メンバー数: {activeGuildDetail.member_count} / {activeGuildDetail.member_limit} 人</div>
                </div>
                <div className="guild-alignment text-right">
                  <span className="alignment-badge main font-size-7 px-1.5 py-0.5 font-weight-bold text-white rounded">
                    メイン: {activeGuildDetail.main_alignment}
                  </span>
                  {activeGuildDetail.sub_alignment && (
                    <span className="alignment-badge sub font-size-7 px-1.5 py-0.5 font-weight-bold text-white rounded block mt-1">
                      サブ: {activeGuildDetail.sub_alignment}
                    </span>
                  )}
                </div>
              </div>

              <div className="guild-public-status-grid">
                <span><small>RECRUITMENT</small><strong>{Number(activeGuildDetail.member_count || 0) >= Number(activeGuildDetail.member_limit || 0) ? "満員" : activeGuildDetail.approval_required ? "承認制・募集中" : "即時加入可能"}</strong></span>
                <span><small>OPEN SLOTS</small><strong>{Math.max(0, Number(activeGuildDetail.member_limit || 0) - Number(activeGuildDetail.member_count || 0))}枠</strong></span>
                <span><small>GvG</small><strong>{activeGuildDetail.controlledBases?.length ? `${activeGuildDetail.controlledBases.length}拠点制圧` : "参戦可能"}</strong></span>
                <span><small>ACTIVE / 7D</small><strong>{Number(activeGuildDetail.active_members_7d || 0)}人</strong></span>
                <span><small>RAID / 7D</small><strong>{Number(activeGuildDetail.raid_contribution_7d || 0).toLocaleString()}</strong></span>
                <span><small>POWER</small><strong>{Number(activeGuildDetail.guild_power || 0).toLocaleString()}</strong></span>
              </div>

              <div className="guild-desc-box steel-tray p-2.5 mb-3 font-size-8 text-white line-height-14">
                {activeGuildDetail.description}
              </div>

              <div className="guild-control-section">
                <span className="section-subtitle font-size-7 text-secondary block mb-1">支配エリア</span>
                <div className="flex-row-gap-2 flex-wrap">
                  {activeGuildDetail.controlledBases && activeGuildDetail.controlledBases.length > 0 ? (
                    activeGuildDetail.controlledBases.map((baseName: string, idx: number) => (
                      <span key={idx} className="base-control-badge font-size-7 px-2 py-0.5 font-weight-bold text-color-cyan rounded">
                        {baseName}
                      </span>
                    ))
                  ) : (
                    <span className="font-size-7 text-secondary block py-1">支配中のエリアはありません。</span>
                  )}
                </div>
              </div>
              {!userGuildMember && (
                <OutlawButton variant="primary" fullWidth className="mt-3" disabled={Number(activeGuildDetail.member_count || 0) >= Number(activeGuildDetail.member_limit || 0)} onClick={() => {
                  void import("../../utils/supabase").then(({ supabase }) => supabase.rpc("record_client_funnel_event", {
                    p_event_name: "guild_detail_join_click", p_source_screen: "guild_detail",
                    p_source_cta: activeGuildDetail.approval_required ? "apply" : "join",
                    p_object_id: activeGuildDetail.id, p_metadata: {}
                  }));
                  void handleDemoJoinGuild(activeGuildDetail.id, activeGuildDetail.name, activeGuildDetail.approval_required);
                }}>
                  {activeGuildDetail.approval_required ? "加入申請する" : "このTRIBEに加入する"}
                </OutlawButton>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
