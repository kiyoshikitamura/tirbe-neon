"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
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
    showImportantModal,
    setShowImportantModal,
    errorMessage,
    setErrorMessage,
    playCyberSe,
    activePlayerDetail,
    setActivePlayerDetail,
    activeGuildDetail,
    setActiveGuildDetail
  } = useGame();

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
        <div className="modal-overlay background-black-95">
          {scoutAnimationState === "FLASHING" ? (
            <div className="flex-col-center justify-center h-full w-full relative">
              {/* 発光フラッシュエフェクト */}
              <div className={`gacha-flash-effect flash-${scoutFlashingColor.toLowerCase()}`} />
              <div className="gacha-flash-text font-size-14 font-weight-bold blink">
                SYNDICATE NETWORK SCANNING...
              </div>
            </div>
          ) : (
            <div className="modal-card border-cyan shadow-cyan-20 max-w-lg w-full p-6 text-center select-modal-layout scroll-container">
              <h3 className="font-size-14 text-color-cyan font-weight-bold mb-4 tracking-wider">
                スカウト獲得結果一覧
              </h3>
              
              <div className="list-container max-h-240 scroll-container mb-4">
                {scoutResults.map((res: any, idx: number) => (
                  <div key={idx} className="list-item border-bottom-subtle pb-2">
                    <div className="item-left">
                      <span className="item-title flex items-center gap-2">
                        {res.name}
                        <span className={`rarity-badge font-size-6 px-1.5 py-0.5 rounded rarity-${res.rarity.toLowerCase()}`}>
                          {res.rarity}
                        </span>
                      </span>
                      <span className="font-size-7 text-secondary mt-0.5 block">
                        {res.type === "SKILL" ? "スキルカード" : res.type === "CHARACTER" ? "構成員" : res.type === "ITEM" ? "アイテム" : "ハクスラ装備"}
                      </span>
                    </div>
                    <span className="font-size-8 text-color-cyan font-weight-bold">{res.convertReward}</span>
                  </div>
                ))}
              </div>

              <button 
                className="claim-reward-btn font-weight-bold py-2 width-100 active-scale-effect"
                onClick={() => { setScoutAnimationState(null); playCyberSe("click"); }}
              >
                閉じる
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🔔 初回起動時・重要なお知らせモーダル */}
      {showImportantModal && (
        <div className="modal-overlay">
          <div className="modal-card border-magenta shadow-magenta-10 p-5 max-w-sm w-full mx-4 my-6">
            <div className="modal-title text-color-magenta">セキュリティ認証完了</div>
            <div className="modal-desc font-size-8 text-secondary mb-4 line-height-14">
              東京サイバーフロントへの安全な接続を確認しました。現在、新宿南部連合との模擬戦（チュートリアル）を含む全ての抗争機能が解放されています。
            </div>
            <button 
              className="modal-close-btn background-magenta active-scale-effect width-100 py-2 font-weight-bold font-size-9"
              onClick={() => { setShowImportantModal(false); playCyberSe("click"); }}
            >
              抗争に参入する
            </button>
          </div>
        </div>
      )}

      {/* ❌ 汎用エラーモーダル */}
      {errorMessage && (
        <div className="modal-overlay">
          <div className="modal-card border-danger">
            <div className="modal-title text-color-danger">エラー</div>
            <div className="modal-desc">{errorMessage}</div>
            <button className="modal-close-btn background-danger active-scale-effect" onClick={() => setErrorMessage(null)}>
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
                <div className="font-size-9 font-weight-bold text-white">{activePlayerDetail.username}</div>
                <div className="font-size-7 text-secondary mt-1">プレイヤーレベル: Lv.{activePlayerDetail.level}</div>
              </div>

              <div className="bio-section steel-tray p-2.5 mb-3 font-size-8 text-white line-height-14">
                {activePlayerDetail.bio}
              </div>

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
                    <div className="font-size-7 text-secondary text-center py-2">編成された構成員がいません。</div>
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
              {/* 将来用のギルド称号プレースホルダー */}
              <div className="guild-title-placeholder-box mb-3 p-1 text-center font-size-7 text-secondary font-weight-bold">
                新宿の覇者 (将来用ギルド称号枠)
              </div>

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

              <div className="guild-desc-box steel-tray p-2.5 mb-3 font-size-8 text-white line-height-14">
                新宿エリアを拠点とする同盟。新規メンバー募集中。
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
