"use client";

import React, { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import {
  CHARACTERS_MASTER,
  GEAR_SLOTS_MASTER,
  PROFILE_BACKGROUNDS,
  PROFILE_TITLES,
  getCharacterTransparentImg,
  getAlignmentShortJp
} from "@/utils/game_constants";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import { useImagePreloader } from "../hooks/useImagePreloader";
import "./CharacterTab.css";

export default function CharacterTab() {
  // アセット事前自動メモリプリロード (チラつき完全排除)
  useImagePreloader();

  const {
    upgradeSelectedCharId,
    setUpgradeSelectedCharId,
    selectedMembers,
    userCharactersDbList,
    userEquipmentsList,
    userSkillsList,
    selectedLeader,
    setSelectedLeader,
    handleCharacterLevelUp,
    handleCharacterAwaken,
    handleEquipGear,
    handleUnequipGear,
    handleEquipGearBulkRecommended,
    handleUnequipGearBulk,
    handleEquipSkill,
    handleUnequipSkill,
    handleEquipSkillBulkRecommended,
    handleUnequipSkillBulk,
    playCyberSe,
    equippedBackground
  } = useGame();

  // 下部パネル タブ状態: "STATUS" (ステータス・育成) | "SKILL" (スキルデッキ) | "GEAR" (装備詳細)
  const [activeBottomTab, setActiveBottomTab] = useState<"STATUS" | "SKILL" | "GEAR">("STATUS");

  // インライン・選択中スロット枠 (0~6: 装備, 0~5: スキル)
  const [selectedEquipSlotIdx, setSelectedEquipSlotIdx] = useState<number | null>(null);
  const [selectedSkillSlotIdx, setSelectedSkillSlotIdx] = useState<number | null>(null);

  // 選択中キャラクター情報の取得
  const ownedCharIds = useMemo(() => {
    return (userCharactersDbList || []).map((uc: any) => uc.character_id);
  }, [userCharactersDbList]);

  const activeCharRecord = useMemo(() => {
    return (userCharactersDbList || []).find((c: any) => c.character_id === upgradeSelectedCharId) || userCharactersDbList?.[0];
  }, [userCharactersDbList, upgradeSelectedCharId]);

  const activeCharMaster = useMemo(() => {
    if (!activeCharRecord) return CHARACTERS_MASTER[0];
    return CHARACTERS_MASTER.find((c: any) => c.id === activeCharRecord.character_id) || CHARACTERS_MASTER[0];
  }, [activeCharRecord]);

  // キャラクター総ステータス算出 (stats_calculator.ts 準拠)
  const charStats = useMemo(() => {
    if (!activeCharRecord) return { hp: 0, atk: 0, def: 0, spd: 0, luk: 0 };
    return getCharacterTotalStats(activeCharRecord, userEquipmentsList);
  }, [activeCharRecord, userEquipmentsList]);

  const alignInfo = getAlignmentShortJp(activeCharMaster?.alignment || "");
  const awakeningLevel = activeCharRecord?.awakening_level || 0;
  const isCurrentLeader = selectedLeader === activeCharMaster.id;

  // 上部カルーセル スライド操作
  const activeCharIndex = ownedCharIds.indexOf(upgradeSelectedCharId);

  const handlePrevChar = () => {
    if (ownedCharIds.length <= 1) return;
    const prevIndex = (activeCharIndex - 1 + ownedCharIds.length) % ownedCharIds.length;
    setUpgradeSelectedCharId(ownedCharIds[prevIndex]);
    playCyberSe("click");
  };

  const handleNextChar = () => {
    if (ownedCharIds.length <= 1) return;
    const nextIndex = (activeCharIndex + 1) % ownedCharIds.length;
    setUpgradeSelectedCharId(ownedCharIds[nextIndex]);
    playCyberSe("click");
  };

  // 背景画像URL
  const bgData = PROFILE_BACKGROUNDS.find(bg => bg.id === equippedBackground);
  const bgImgUrl = bgData?.img || "/shinjuku_neon_icon_1783765789862.png";

  // --------------------------------------------------------------------------
  // 装備スロット レンダリング補助 (左右 7スロット)
  // --------------------------------------------------------------------------
  const renderEquipSlot = (slotDef: any) => {
    if (!activeCharRecord) return null;

    const equippedGear = (userEquipmentsList || []).find(
      (e: any) => e.equipped_character_id === activeCharRecord.character_id && e.slot_index === slotDef.index
    );

    const gearMaster = equippedGear ? EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === equippedGear.equipment_id) : null;
    const rarity = (gearMaster?.rarity || "N").toUpperCase();

    let rarityClass = "slot-n";
    let ribbonClass = "ribbon-n";

    if (rarity === "SSR") { rarityClass = "slot-ssr"; ribbonClass = "ribbon-ssr"; }
    else if (rarity === "SR") { rarityClass = "slot-sr"; ribbonClass = "ribbon-sr"; }
    else if (rarity === "R") { rarityClass = "slot-r"; ribbonClass = "ribbon-r"; }

    return (
      <div
        key={slotDef.index}
        className={`char-equip-slot ${equippedGear ? rarityClass : "slot-empty"} active-scale-effect`}
        onClick={() => {
          setSelectedEquipSlotIdx(slotDef.index);
          setActiveBottomTab("GEAR");
          playCyberSe("click");
        }}
      >
        <div className="slot-header-row">
          <span className="slot-label">{slotDef.label}</span>
          {equippedGear && (
            <span className={`slot-rarity-ribbon ${ribbonClass}`}>{rarity}</span>
          )}
        </div>

        {equippedGear ? (
          <>
            <div className="slot-gear-name">{gearMaster?.name || equippedGear.equipment_id}</div>
            <div className="flex justify-between items-center w-full">
              <span className="slot-gear-lv">Lv.{equippedGear.level}</span>
              {equippedGear.plus_val > 0 && (
                <span className="slot-plus-badge">+{equippedGear.plus_val}</span>
              )}
            </div>
          </>
        ) : (
          <div className="slot-empty-icon">＋</div>
        )}
      </div>
    );
  };

  // 左側スロット 3枠: 0(武器1), 1(武器2), 2(頭)
  // 右側スロット 4枠: 3(胴), 4(脚), 5(アクセ1), 6(アクセ2)
  const leftSlots = GEAR_SLOTS_MASTER.slice(0, 3);
  const rightSlots = GEAR_SLOTS_MASTER.slice(3, 7);

  // --------------------------------------------------------------------------
  // 解放スキルスロット数計算 (初期3枠 + 覚醒+1毎に1枠解放、最大6枠)
  // --------------------------------------------------------------------------
  const maxSkillSlots = Math.min(6, 3 + awakeningLevel);

  return (
    <div className="char-tab-container">
      {/* 1. 上部: 所持キャラクター丸型スライダー */}
      <div className="char-slider-header">
        <button className="char-slider-arrow" onClick={handlePrevChar}>◀</button>
        <div className="char-slider-track">
          {(userCharactersDbList || []).map((uc: any) => {
            const master = CHARACTERS_MASTER.find(m => m.id === uc.character_id);
            if (!master) return null;

            const isSelected = uc.character_id === activeCharRecord?.character_id;
            const deckIndex = selectedMembers.indexOf(uc.character_id);
            const isInDeck = deckIndex !== -1;
            const isLeader = deckIndex === 0;

            return (
              <div
                key={uc.id || uc.character_id}
                className={`char-slider-item ${isInDeck ? "in-deck" : ""} ${isSelected ? "active" : ""}`}
                onClick={() => {
                  setUpgradeSelectedCharId(uc.character_id);
                  playCyberSe("click");
                }}
              >
                <img
                  src={getCharacterTransparentImg(master.name)}
                  alt={master.jpName}
                  className="char-slider-avatar"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/reiji_transparent_asset.png"; }}
                />
                {isLeader && <span className="char-slider-badge-leader">リーダー</span>}
                {isInDeck && !isLeader && <span className="char-slider-badge-deck">出撃</span>}
              </div>
            );
          })}
        </div>
        <button className="char-slider-arrow" onClick={handleNextChar}>▶</button>
      </div>

      {/* 2. 中央: 大画面5層レイヤーキャンバス & 左右装備7スロット */}
      <div className="char-main-stage">
        {/* Z-10: 背景 */}
        <div className="char-layer-bg" style={{ backgroundImage: `url(${bgImgUrl})` }}>
          <div className="char-layer-bg-overlay" />
        </div>

        {/* Z-20: 足元覚醒オーラ */}
        {awakeningLevel > 0 && (
          <div className={`char-layer-aura ${awakeningLevel >= 5 ? "char-aura-max" : "char-aura-small"}`} />
        )}

        {/* Z-30: メインキャラクター透過立ち絵 */}
        <div className="char-layer-character">
          <img
            src={getCharacterTransparentImg(activeCharMaster.name)}
            alt={activeCharMaster.jpName}
            className="char-character-img"
            onError={(e) => { (e.target as HTMLImageElement).src = "/reiji_transparent_asset.png"; }}
          />
        </div>

        {/* Z-40: 前面エフェクト (フィルタ/パーティクル) */}
        <div className="char-layer-front-effect" />

        {/* Z-50: 最前面頭上HUD (キャラクター名・アライメント・覚醒・マイページリーダー設定) */}
        <div className="char-hud-header">
          <div className="char-hud-title-bar">
            <span className={`char-hud-align-badge char-hud-align-${alignInfo.colorClass}`}>
              {alignInfo.label}
            </span>
            <span className="char-hud-name">{activeCharMaster.jpName}</span>
            {awakeningLevel > 0 && (
              <span className="char-hud-awaken">+{awakeningLevel}</span>
            )}
            <span className="char-hud-level">Lv.{activeCharRecord?.level || 1}</span>
          </div>

          <button
            className={`char-leader-set-btn ${isCurrentLeader ? "is-active" : ""} active-scale-effect`}
            onClick={() => {
              setSelectedLeader(activeCharMaster.id);
              playCyberSe("click");
            }}
          >
            {isCurrentLeader ? "★ マイページリーダー設定中" : "マイページリーダーに設定"}
          </button>
        </div>

        {/* 左側 装備スロット 3枠 */}
        <div className="char-equip-column char-equip-column-left">
          {leftSlots.map(slot => renderEquipSlot(slot))}
        </div>

        {/* 右側 装備スロット 4枠 */}
        <div className="char-equip-column char-equip-column-right">
          {rightSlots.map(slot => renderEquipSlot(slot))}
        </div>
      </div>

      {/* 3. 下部: 3タブ切替パネル */}
      <div className="char-bottom-panel">
        <div className="char-tab-bar">
          <button
            className={`char-tab-btn ${activeBottomTab === "STATUS" ? "active" : ""}`}
            onClick={() => { setActiveBottomTab("STATUS"); playCyberSe("click"); }}
          >
            ステータス・育成
          </button>
          <button
            className={`char-tab-btn ${activeBottomTab === "SKILL" ? "active" : ""}`}
            onClick={() => { setActiveBottomTab("SKILL"); playCyberSe("click"); }}
          >
            スキルデッキ
          </button>
          <button
            className={`char-tab-btn ${activeBottomTab === "GEAR" ? "active" : ""}`}
            onClick={() => { setActiveBottomTab("GEAR"); playCyberSe("click"); }}
          >
            装備詳細
          </button>
        </div>

        {/* タブA: ステータス・育成 */}
        {activeBottomTab === "STATUS" && (
          <div>
            <div className="char-status-grid">
              <div className="char-status-card">
                <span className="char-status-label">HP</span>
                <span className="char-status-val">{charStats.hp.toLocaleString()}</span>
              </div>
              <div className="char-status-card">
                <span className="char-status-label">攻撃力 (ATK)</span>
                <span className="char-status-val">{charStats.atk.toLocaleString()}</span>
              </div>
              <div className="char-status-card">
                <span className="char-status-label">防御力 (DEF)</span>
                <span className="char-status-val">{charStats.def.toLocaleString()}</span>
              </div>
              <div className="char-status-card">
                <span className="char-status-label">素早さ (SPD)</span>
                <span className="char-status-val">{charStats.spd.toLocaleString()}</span>
              </div>
            </div>

            <div className="char-upgrade-actions">
              <button
                className="char-upgrade-btn active-scale-effect"
                onClick={() => {
                  if (activeCharRecord) handleCharacterLevelUp(activeCharRecord.id);
                  playCyberSe("click");
                }}
              >
                <span>レベルアップ</span>
                <span className="char-upgrade-sub">トレーニング教本消費</span>
              </button>
              <button
                className="char-upgrade-btn awaken active-scale-effect"
                onClick={() => {
                  if (activeCharRecord) handleCharacterAwaken(activeCharRecord.id);
                  playCyberSe("click");
                }}
              >
                <span>覚醒限界突破</span>
                <span className="char-upgrade-sub">抗争の掟消費 (+{awakeningLevel} → +{Math.min(5, awakeningLevel + 1)})</span>
              </button>
            </div>
          </div>
        )}

        {/* タブB: スキルデッキ (最大6枠 & 得意スキルAP-1バッジ) */}
        {activeBottomTab === "SKILL" && (
          <div>
            <div className="char-skills-grid">
              {Array.from({ length: 6 }).map((_, slotIdx) => {
                const isUnlocked = slotIdx < maxSkillSlots;
                const equippedSkillRecord = (userSkillsList || []).find(
                  (s: any) => s.equipped_character_id === activeCharRecord?.character_id && s.slot_index === slotIdx
                );
                const skillMaster = equippedSkillRecord ? SKILLS_MASTER_DATA.find((m: any) => m.id === equippedSkillRecord.skill_id) : null;
                
                // 得意スキル（シナジー）判定: exclusive_character_id == キャラID
                const isSynergy = skillMaster && (skillMaster as any).exclusive_character_id === activeCharMaster.id;
                const limitBreakPlus = equippedSkillRecord?.plus_val || 0;

                let tierClass = "";
                if (limitBreakPlus >= 10) tierClass = "skill-tier-max";
                else if (limitBreakPlus >= 6) tierClass = "skill-tier-gold";
                else if (limitBreakPlus >= 3) tierClass = "skill-tier-silver";

                return (
                  <div
                    key={slotIdx}
                    className={`char-skill-card ${isSynergy ? "synergy-ap-reduced" : ""} ${tierClass} ${!isUnlocked ? "opacity-40" : ""} active-scale-effect`}
                    onClick={() => {
                      if (isUnlocked) {
                        setSelectedSkillSlotIdx(slotIdx);
                        playCyberSe("click");
                      }
                    }}
                  >
                    {isSynergy && <span className="char-synergy-badge">AP-1</span>}
                    {isUnlocked ? (
                      equippedSkillRecord && skillMaster ? (
                        <>
                          <div className="char-skill-name">{skillMaster.name}</div>
                          <div className="char-skill-cost">AP: {Math.max(1, (skillMaster.ap_cost || 2) - (isSynergy ? 1 : 0))}</div>
                        </>
                      ) : (
                        <div className="text-gray-500 font-size-7 text-center py-2">未装着</div>
                      )
                    ) : (
                      <div className="text-gray-500 font-size-6 text-center py-2">ロック</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* インライン スキル選択 4列グリッドアイコンリスト (モーダル完全排除・visual_concept.md §5②) */}
            {selectedSkillSlotIdx !== null && (
              <div className="char-inline-selector">
                <div className="char-inline-header">
                  <span className="char-inline-title">スキル選択 (枠 {selectedSkillSlotIdx + 1})</span>
                  <button
                    className="text-gray-400 font-size-7 active-scale-effect"
                    onClick={() => setSelectedSkillSlotIdx(null)}
                  >
                    閉じる
                  </button>
                </div>
                <div className="char-inline-grid">
                  <div
                    className="char-tile-item active-scale-effect"
                    onClick={() => {
                      const currSkill = (userSkillsList || []).find(
                        (s: any) => s.equipped_character_id === activeCharRecord?.character_id && s.slot_index === selectedSkillSlotIdx
                      );
                      if (currSkill) handleUnequipSkill(currSkill.id);
                      setSelectedSkillSlotIdx(null);
                    }}
                  >
                    <span className="text-red-400 font-size-7 font-bold">外す</span>
                  </div>
                  {(userSkillsList || [])
                    .filter((s: any) => !s.equipped_character_id || s.equipped_character_id === activeCharRecord?.character_id)
                    .map((sk: any) => {
                      const mData = SKILLS_MASTER_DATA.find((m: any) => m.id === sk.skill_id);
                      const isOwnerMatch = mData && (mData as any).exclusive_character_id === activeCharMaster.id;
                      return (
                        <div
                          key={sk.id}
                          className="char-tile-item active-scale-effect"
                          onClick={() => {
                            handleEquipSkill(sk.id, activeCharRecord.character_id, selectedSkillSlotIdx);
                            setSelectedSkillSlotIdx(null);
                          }}
                        >
                          {isOwnerMatch && <span className="char-synergy-badge">AP-1</span>}
                          <span className="char-tile-name">{mData?.name || sk.skill_id}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* タブC: 装備詳細 & インライン装備選択 */}
        {activeBottomTab === "GEAR" && (
          <div>
            {selectedEquipSlotIdx !== null ? (
              <div className="char-inline-selector">
                <div className="char-inline-header">
                  <span className="char-inline-title">
                    {GEAR_SLOTS_MASTER[selectedEquipSlotIdx]?.label || "装備"}選択
                  </span>
                  <button
                    className="text-gray-400 font-size-7 active-scale-effect"
                    onClick={() => setSelectedEquipSlotIdx(null)}
                  >
                    閉じる
                  </button>
                </div>

                {/* 4列 インライン グリッド タイルリスト */}
                <div className="char-inline-grid">
                  <div
                    className="char-tile-item active-scale-effect"
                    onClick={() => {
                      const currGear = (userEquipmentsList || []).find(
                        (e: any) => e.equipped_character_id === activeCharRecord?.character_id && e.slot_index === selectedEquipSlotIdx
                      );
                      if (currGear) handleUnequipGear(currGear.id);
                      setSelectedEquipSlotIdx(null);
                    }}
                  >
                    <span className="text-red-400 font-size-7 font-bold">外す</span>
                  </div>
                  {(userEquipmentsList || [])
                    .filter((e: any) => !e.equipped_character_id || e.equipped_character_id === activeCharRecord?.character_id)
                    .map((eq: any) => {
                      const gearMaster = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === eq.equipment_id);
                      return (
                        <div
                          key={eq.id}
                          className="char-tile-item active-scale-effect"
                          onClick={() => {
                            handleEquipGear(eq.id, activeCharRecord.character_id, selectedEquipSlotIdx);
                            setSelectedEquipSlotIdx(null);
                          }}
                        >
                          <span className="char-tile-name">{gearMaster?.name || eq.equipment_id}</span>
                          <span className="text-cyan-400 font-size-6">Lv.{eq.level}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="text-secondary font-size-8 text-center py-4">
                左右の装備スロットをタップすると装備変更メニューが開きます。
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. 最下部: 一括操作アクションバー */}
      <div className="char-action-bar">
        <button
          className="char-action-btn recommend active-scale-effect"
          onClick={() => {
            if (activeCharRecord) handleEquipGearBulkRecommended(activeCharRecord.character_id);
            playCyberSe("click");
          }}
        >
          一括推奨装備
        </button>
        <button
          className="char-action-btn active-scale-effect"
          onClick={() => {
            if (activeCharRecord) handleUnequipGearBulk(activeCharRecord.character_id);
            playCyberSe("click");
          }}
        >
          一括解除
        </button>
        <button
          className="char-action-btn recommend active-scale-effect"
          onClick={() => {
            if (activeCharRecord) handleEquipSkillBulkRecommended(activeCharRecord.character_id);
            playCyberSe("click");
          }}
        >
          一括推奨スキル
        </button>
      </div>
    </div>
  );
}
