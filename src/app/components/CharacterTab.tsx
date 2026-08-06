"use client";

import React, { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import {
  CHARACTERS_MASTER,
  GEAR_SLOTS_MASTER,
  PROFILE_BACKGROUNDS,
  getCharacterTransparentImg,
  getAlignmentShortJp
} from "@/utils/game_constants";
import { SKILLS_MASTER_DATA } from "@/utils/skills_master_data";
import { EQUIPMENTS_MASTER_DATA } from "@/utils/equipments_master_data";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import { useImagePreloader } from "../hooks/useImagePreloader";
import "./CharacterTab.css";

export default function CharacterTab() {
  // アセット事前自動メモリプリロード
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
    setActiveGearSlot,
    handleEquipGear,
    handleUnequipGear,
    handleEquipGearBulkRecommended,
    handleUnequipGearBulk,
    setActiveSkillSlot,
    handleEquipSkill,
    handleUnequipSkill,
    handleEquipSkillBulkRecommended,
    handleUnequipSkillBulk,
    handleAutoFormation,
    playCyberSe,
    equippedBackground,
    setEquippedBackground,
    setSelectedBgMode
  } = useGame();

  // ボトムシートモーダル状態: null (閉じ) | "STATUS" | "SKILL" | "GEAR"
  const [bottomModalTab, setBottomModalTab] = useState<"STATUS" | "SKILL" | "GEAR" | null>(null);

  // モーダル内部でのインライン選択中スロット枠 index (0~6: 装備, 0~5: スキル)
  const [selectedEquipSlotIdx, setSelectedEquipSlotIdx] = useState<number | null>(null);
  const [selectedSkillSlotIdx, setSelectedSkillSlotIdx] = useState<number | null>(null);

  // 選択中キャラクター情報の取得
  const ownedCharIds = useMemo(() => {
    const ids = (userCharactersDbList || []).map((uc: any) => uc.character_id);
    return ids.length > 0 ? ids : ["reiji"];
  }, [userCharactersDbList]);

  const activeCharRecord = useMemo(() => {
    return (userCharactersDbList || []).find((c: any) => c.character_id === upgradeSelectedCharId) || userCharactersDbList?.[0];
  }, [userCharactersDbList, upgradeSelectedCharId]);

  const activeCharMaster = useMemo(() => {
    const charId = activeCharRecord?.character_id || upgradeSelectedCharId || "reiji";
    return CHARACTERS_MASTER.find((c: any) => c.id === charId) || CHARACTERS_MASTER[0];
  }, [activeCharRecord, upgradeSelectedCharId]);

  // キャラクター総ステータス算出 (stats_calculator.ts 準拠)
  const charStats = useMemo(() => {
    if (!activeCharRecord) return { hp: 0, atk: 0, def: 0, spd: 0, luk: 0 };
    return getCharacterTotalStats(activeCharRecord, userEquipmentsList);
  }, [activeCharRecord, userEquipmentsList]);

  const alignInfo = getAlignmentShortJp(activeCharMaster?.alignment || "");
  const awakeningLevel = activeCharRecord?.awakening_level || 0;
  const characterRarity = (activeCharMaster?.rarity || "N").toLowerCase();
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

  // 背景画像URL (実在確認済みのデフォルト背景を自動フォールバック)
  const bgData = PROFILE_BACKGROUNDS.find(bg => bg.id === equippedBackground);
  const bgImgUrl = bgData?.img || "/bg/bg_base_neontower.png";

  // --------------------------------------------------------------------------
  // 装備スロット レンダリング補助 (左右 7スロット)
  // --------------------------------------------------------------------------
  const renderEquipSlot = (slotDef: any) => {
    // 比較には DBレコードの UUID (activeCharRecord.id) を使用
    const activeDbUuid = activeCharRecord?.id;

    const equippedGear = activeDbUuid
      ? (userEquipmentsList || []).find(
          (e: any) => e.equipped_character_id === activeDbUuid && e.slot_index === slotDef.index
        )
      : null;

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
          setBottomModalTab("GEAR");
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
            <div className="slot-footer-row">
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

  const leftSlots = GEAR_SLOTS_MASTER.slice(0, 3);
  const rightSlots = GEAR_SLOTS_MASTER.slice(3, 7);
  const maxSkillSlots = Math.min(6, 3 + awakeningLevel);

  return (
    <div className="char-tab-container">
      <div className="flex justify-end mb-2">
        <button className="sub-btn border-cyan-subtle font-size-8 height-26 px-3 active-scale-effect" onClick={() => void handleAutoFormation()}>
          AUTO FORMATION
        </button>
      </div>
      {/* 1. 上部: 所持キャラクター丸型スライダー */}
      <div className="char-slider-header">
        <button className="char-slider-arrow" onClick={handlePrevChar}>◀</button>
        <div className="char-slider-track">
          {((userCharactersDbList && userCharactersDbList.length > 0)
            ? userCharactersDbList
            : [{ character_id: "reiji", id: "demo_reiji" }]
          ).map((uc: any) => {
            const master = CHARACTERS_MASTER.find(m => m.id === uc.character_id) || CHARACTERS_MASTER[0];
            const isSelected = uc.character_id === activeCharMaster.id;
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

      {/* 2. 中央: 大画面5層レイヤーキャンバス (高さ360px絶対固定) */}
      <div className={`char-main-stage char-rarity-${characterRarity}`}>
        {/* Z-10: 背景 */}
        <div className="char-layer-bg" style={{ backgroundImage: `url(${bgImgUrl})` }}>
          <div className="char-layer-bg-overlay" />
        </div>

        {/* Z-20: 足元覚醒オーラ */}
        {awakeningLevel > 0 && (
          <div className={`char-layer-aura ${awakeningLevel >= 5 ? "char-aura-max" : "char-aura-small"}`} />
        )}

        {/* Z-30: メインキャラクター透過立ち絵 (サイズ固定) */}
        <div className="char-layer-character">
          <img
            src={getCharacterTransparentImg(activeCharMaster.name)}
            alt={activeCharMaster.jpName}
            className="char-character-img"
            onError={(e) => { (e.target as HTMLImageElement).src = "/reiji_transparent_asset.png"; }}
          />
        </div>

        {/* Z-40: 前面エフェクト */}
        <div className="char-layer-front-effect" />

        {/* Z-50: 最前面1行コンパクトHUD (被り100%排除) */}
        <div className="char-hud-header-single">
          <div className="char-hud-left-group">
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
            className={`char-leader-set-btn-small ${isCurrentLeader ? "is-active" : ""} active-scale-effect`}
            onClick={() => {
              setSelectedLeader(activeCharMaster.id);
              playCyberSe("click");
            }}
          >
            {isCurrentLeader ? "★ リーダー設定中" : "リーダー設定"}
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

        {/* 背景変更ボタン (ステージ右下) */}
        <button
          className="char-bg-change-btn active-scale-effect"
          onClick={() => {
            setBottomModalTab("GEAR");
            playCyberSe("click");
          }}
          title="背景変更"
        >
          BG
        </button>
      </div>

      {/* 3. メイン画面直下: 1行コンパクトステータスサマリー */}
      <div className="char-summary-bar">
        <div className="char-summary-item">
          <span className="char-summary-label">HP</span>
          <span className="char-summary-val">{charStats.hp.toLocaleString()}</span>
        </div>
        <div className="char-summary-item">
          <span className="char-summary-label">ATK</span>
          <span className="char-summary-val">{charStats.atk.toLocaleString()}</span>
        </div>
        <div className="char-summary-item">
          <span className="char-summary-label">DEF</span>
          <span className="char-summary-val">{charStats.def.toLocaleString()}</span>
        </div>
        <div className="char-summary-item">
          <span className="char-summary-label">SPD</span>
          <span className="char-summary-val">{charStats.spd.toLocaleString()}</span>
        </div>
      </div>

      {/* 4. メイン画面最下部: 3アクションボタン (タップでボトムシートモーダル起動) */}
      <div className="char-main-actions">
        <button
          className={`char-main-action-btn ${bottomModalTab === "STATUS" ? "active" : ""} active-scale-effect`}
          onClick={() => {
            setBottomModalTab("STATUS");
            playCyberSe("click");
          }}
        >
          育成・強化
        </button>
        <button
          className={`char-main-action-btn ${bottomModalTab === "SKILL" ? "active" : ""} active-scale-effect`}
          onClick={() => {
            setBottomModalTab("SKILL");
            playCyberSe("click");
          }}
        >
          スキル編成
        </button>
        <button
          className={`char-main-action-btn ${bottomModalTab === "GEAR" ? "active" : ""} active-scale-effect`}
          onClick={() => {
            setBottomModalTab("GEAR");
            playCyberSe("click");
          }}
        >
          装備変更
        </button>
      </div>

      {/* 5. ボトムシートモーダル (画面見切れ100%防止 ＆ モーダル内インライン4列グリッド) */}
      {bottomModalTab !== null && (
        <div className="char-bottom-modal-backdrop" onClick={() => setBottomModalTab(null)}>
          <div className="char-bottom-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="char-modal-header">
              <div className="char-modal-title-tabs">
                <button
                  className={`char-modal-tab-btn ${bottomModalTab === "STATUS" ? "active" : ""}`}
                  onClick={() => { setBottomModalTab("STATUS"); playCyberSe("click"); }}
                >
                  育成
                </button>
                <button
                  className={`char-modal-tab-btn ${bottomModalTab === "SKILL" ? "active" : ""}`}
                  onClick={() => { setBottomModalTab("SKILL"); playCyberSe("click"); }}
                >
                  スキル
                </button>
                <button
                  className={`char-modal-tab-btn ${bottomModalTab === "GEAR" ? "active" : ""}`}
                  onClick={() => { setBottomModalTab("GEAR"); playCyberSe("click"); }}
                >
                  装備
                </button>
              </div>

              <button
                className="char-modal-close-btn active-scale-effect"
                onClick={() => setBottomModalTab(null)}
              >
                閉じる ✕
              </button>
            </div>

            {/* モーダルコンテンツ: タブA 育成 */}
            {bottomModalTab === "STATUS" && (
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
                    <span className="char-upgrade-sub">教本・キャッシュ消費</span>
                  </button>
                  <button
                    className="char-upgrade-btn awaken active-scale-effect"
                    onClick={() => {
                      if (activeCharRecord) handleCharacterAwaken(activeCharRecord.id);
                      playCyberSe("click");
                    }}
                  >
                    <span>覚醒限界突破</span>
                    <span className="char-upgrade-sub">掟消費 (+{awakeningLevel} → +{Math.min(5, awakeningLevel + 1)})</span>
                  </button>
                </div>
              </div>
            )}

            {/* モーダルコンテンツ: タブB スキルデッキ */}
            {bottomModalTab === "SKILL" && (
              <div>
                <div className="char-skills-grid">
                  {Array.from({ length: 6 }).map((_, slotIdx) => {
                    const isUnlocked = slotIdx < maxSkillSlots;
                    const activeDbUuid = activeCharRecord?.id;
                    const equippedSkillRecord = activeDbUuid
                      ? (userSkillsList || []).find(
                          (s: any) => s.equipped_character_id === activeDbUuid && s.slot_index === slotIdx
                        )
                      : null;
                    const skillMaster = equippedSkillRecord ? SKILLS_MASTER_DATA.find((m: any) => m.id === equippedSkillRecord.skill_id) : null;
                    const skillRarity = (skillMaster?.rarity || "N").toLowerCase();
                    
                    const isSynergy = skillMaster && (skillMaster as any).exclusive_character_id === activeCharMaster.id;
                    const limitBreakPlus = equippedSkillRecord?.plus_val || 0;

                    let tierClass = "";
                    if (limitBreakPlus >= 10) tierClass = "skill-tier-max";
                    else if (limitBreakPlus >= 6) tierClass = "skill-tier-gold";
                    else if (limitBreakPlus >= 3) tierClass = "skill-tier-silver";

                    return (
                      <div
                        key={slotIdx}
                        className={`char-skill-card skill-rarity-${skillRarity} ${isSynergy ? "synergy-ap-reduced" : ""} ${tierClass} ${!isUnlocked ? "char-skill-locked" : ""} active-scale-effect`}
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
                            <div className="char-skill-empty-label">未装着</div>
                          )
                        ) : (
                          <div className="char-skill-lock-label">ロック</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* モーダル内部でインライン展開する 4列グリッドアイコンリスト */}
                {selectedSkillSlotIdx !== null && (
                  <div className="char-inline-selector">
                    <div className="char-inline-header">
                      <span className="char-inline-title">スキル選択 (枠 {selectedSkillSlotIdx + 1})</span>
                      <button
                        className="char-inline-close-btn active-scale-effect"
                        onClick={() => setSelectedSkillSlotIdx(null)}
                      >
                        閉じる
                      </button>
                    </div>
                    <div className="char-inline-grid">
                      <div
                        className="char-tile-item active-scale-effect"
                        onClick={() => {
                          const activeDbUuid = activeCharRecord?.id;
                          const currSkill = activeDbUuid
                            ? (userSkillsList || []).find(
                                (s: any) => s.equipped_character_id === activeDbUuid && s.slot_index === selectedSkillSlotIdx
                              )
                            : null;
                          if (currSkill) handleUnequipSkill(currSkill.id);
                          setSelectedSkillSlotIdx(null);
                        }}
                      >
                        <span className="char-tile-remove-label">外す</span>
                      </div>
                      {(userSkillsList || [])
                        .filter((s: any) => !s.equipped_character_id || s.equipped_character_id === activeCharRecord?.id)
                        .map((sk: any) => {
                          const mData = SKILLS_MASTER_DATA.find((m: any) => m.id === sk.skill_id);
                          const isOwnerMatch = mData && (mData as any).exclusive_character_id === activeCharMaster.id;
                          return (
                            <div
                              key={sk.id}
                              className="char-tile-item active-scale-effect"
                              onClick={() => {
                                // 正規フロー: まずContextのactiveSkillSlotを設定してから1引数で呼び出し
                                setActiveSkillSlot(selectedSkillSlotIdx);
                                handleEquipSkill(sk.id);
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

                <div className="char-action-bar">
                  <button
                    className="char-action-btn recommend active-scale-effect"
                    onClick={() => {
                      if (activeCharRecord) handleEquipSkillBulkRecommended(activeCharRecord.id);
                      playCyberSe("click");
                    }}
                  >
                    一括推奨スキル
                  </button>
                  <button
                    className="char-action-btn active-scale-effect"
                    onClick={() => {
                      if (activeCharRecord) handleUnequipSkillBulk(activeCharRecord.id);
                      playCyberSe("click");
                    }}
                  >
                    一括解除
                  </button>
                </div>
              </div>
            )}

            {/* モーダルコンテンツ: タブC 装備詳細 */}
            {bottomModalTab === "GEAR" && (
              <div>
                {selectedEquipSlotIdx !== null ? (
                  <div className="char-inline-selector">
                    <div className="char-inline-header">
                      <span className="char-inline-title">
                        {GEAR_SLOTS_MASTER[selectedEquipSlotIdx]?.label || "装備"}選択
                      </span>
                      <button
                        className="char-inline-close-btn active-scale-effect"
                        onClick={() => setSelectedEquipSlotIdx(null)}
                      >
                        閉じる
                      </button>
                    </div>

                    <div className="char-inline-grid">
                      <div
                        className="char-tile-item active-scale-effect"
                        onClick={() => {
                          const activeDbUuid = activeCharRecord?.id;
                          const currGear = activeDbUuid
                            ? (userEquipmentsList || []).find(
                                (e: any) => e.equipped_character_id === activeDbUuid && e.slot_index === selectedEquipSlotIdx
                              )
                            : null;
                          if (currGear) handleUnequipGear(currGear.id);
                          setSelectedEquipSlotIdx(null);
                        }}
                      >
                        <span className="char-tile-remove-label">外す</span>
                      </div>
                      {(userEquipmentsList || [])
                        .filter((e: any) => !e.equipped_character_id || e.equipped_character_id === activeCharRecord?.id)
                        .map((eq: any) => {
                          const gearMaster = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === eq.equipment_id);
                          return (
                            <div
                              key={eq.id}
                              className="char-tile-item active-scale-effect"
                              onClick={() => {
                                // 正規フロー: まずContextのactiveGearSlotを設定してから1引数で呼び出し
                                setActiveGearSlot(selectedEquipSlotIdx);
                                handleEquipGear(eq.id);
                                setSelectedEquipSlotIdx(null);
                              }}
                            >
                              <span className="char-tile-name">{gearMaster?.name || eq.equipment_id}</span>
                              <span className="char-tile-lv-label">Lv.{eq.level}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="char-gear-placeholder-text">
                    左右の装備スロットをタップすると装備選択メニューが開きます。
                  </div>
                )}

                <div className="char-action-bar">
                  <button
                    className="char-action-btn recommend active-scale-effect"
                    onClick={() => {
                      if (activeCharRecord) handleEquipGearBulkRecommended(activeCharRecord.id);
                      playCyberSe("click");
                    }}
                  >
                    一括推奨装備
                  </button>
                  <button
                    className="char-action-btn active-scale-effect"
                    onClick={() => {
                      if (activeCharRecord) handleUnequipGearBulk(activeCharRecord.id);
                      playCyberSe("click");
                    }}
                  >
                    一括解除
                  </button>
                </div>

                {/* 背景選択グリッド */}
                <div className="char-bg-section-title">背景変更</div>
                <div className="char-bg-grid">
                  {PROFILE_BACKGROUNDS.map((bg: any) => (
                    <div
                      key={bg.id}
                      className={`char-bg-tile ${equippedBackground === bg.id ? "selected" : ""} active-scale-effect`}
                      style={{ backgroundImage: `url(${bg.img})` }}
                      onClick={() => {
                        setEquippedBackground(bg.id);
                        setSelectedBgMode(bg.id);
                        playCyberSe("click");
                      }}
                    >
                      <span className="char-bg-tile-label">{bg.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
