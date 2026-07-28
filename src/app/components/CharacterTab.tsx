"use client";

import React from "react";
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
import CardIcon from "./CardIcon";
import { useImagePreloader } from "../hooks/useImagePreloader";
import "./CharacterTab.css";

export default function CharacterTab() {
  // アセット事前自動メモリプリロード (チラつき完全排除)
  useImagePreloader();
  const {
    upgradeSelectedCharId,
    setUpgradeSelectedCharId,
    selectedMembers,
    upgradeSubTab,
    setUpgradeSubTab,
    userCharactersDbList,
    userEquipmentsList,
    handleTogglePartyMember,
    characterLevel,
    characterAwaken,
    lawsOfStrife,
    trainingManuals,
    polishingStones,
    cash,
    handleCharacterLevelUp,
    handleCharacterAwaken,
    upgradeLoading,
    userSkillsList,
    handleUnequipSkill,
    setActiveSkillSlot,
    setShowSkillModal,
    handleSkillUpgrade,
    selectedSkill,
    setSelectedSkill,
    skillLimitBreakMaster,
    exclusiveContracts,
    handleEquipGear,
    handleUnequipGear,
    handleUnequipGearBulk,
    handleEquipGearBulkRecommended,
    handleEquipSkill,
    handleUnequipSkillBulk,
    handleEquipSkillBulkRecommended,
    handleSellGearBulk,
    setActiveGearSlot,
    setShowGearModal,
    selectedEquipment,
    selectUpgradeEquipment,
    equipmentLevel,
    equipmentLimitBreak,
    handleEquipmentLevelUp,
    handleEquipmentLimitBreak,
    playCyberSe,
    equippedBackground,
    equippedFrontEffect,
    titleEquipped,
    equipmentLevelUpMaster,
    equipmentLimitBreakMaster,
    subOptions
  } = useGame();

  // 画面モード: デッキ編成一覧("DECK") OR キャラ詳細・装備/スキル("DETAIL")
  const [mainViewMode, setMainViewMode] = React.useState<"DECK" | "DETAIL">("DECK");

  // 操作モード: カードタップで編成("DECK") OR カードタップで詳細("DETAIL")
  const [opMode, setOpMode] = React.useState<"DECK" | "DETAIL">("DECK");

  // ソート・フィルタ状態
  const [charSortKey, setCharSortKey] = React.useState<"rarity" | "level" | "power" | "alignment">("rarity");
  const [charFilterAlign, setCharFilterAlign] = React.useState<"ALL" | "ORDER" | "JUSTICE" | "CHAOS" | "EVIL">("ALL");

  // 装備一括売却モード＆選択リスト
  const [isSellMode, setIsSellMode] = React.useState(false);
  const [selectedSellGearIds, setSelectedSellGearIds] = React.useState<string[]>([]);
  
  // 装備・スキルソート状態
  const [gearSortKey, setGearSortKey] = React.useState<"rarity" | "level" | "slot">("rarity");
  const [skillSortKey, setSkillSortKey] = React.useState<"rarity" | "lb" | "synergy">("synergy");

  // ポップアップ詳細モーダル状態
  const [detailModalGear, setDetailModalGear] = React.useState<any | null>(null);
  const [detailModalSkill, setDetailModalSkill] = React.useState<any | null>(null);

  const activeChar = userCharactersDbList.find((c: any) => c.character_id === upgradeSelectedCharId);
  const activeCharMaster = CHARACTERS_MASTER.find((c: any) => c.id === upgradeSelectedCharId);
  const charStats = activeChar ? getCharacterTotalStats(activeChar, userEquipmentsList) : { hp: 0, atk: 0, def: 0, spd: 0, luk: 0 };

  // 出撃デッキ（5体）の総合力計算
  const totalPartyPower = React.useMemo(() => {
    let total = 0;
    selectedMembers.forEach((masterId: string) => {
      const charRec = userCharactersDbList.find((c: any) => c.character_id === masterId || c.id === masterId);
      if (charRec) {
        const stats = getCharacterTotalStats(charRec, userEquipmentsList);
        total += stats.hp + stats.atk + stats.def + stats.spd + stats.luk;
      }
    });
    return total;
  }, [selectedMembers, userCharactersDbList, userEquipmentsList]);

  // フィルタリング ＆ ソートされたキャラクターリスト
  const filteredSortedCharList = React.useMemo(() => {
    let list = (userCharactersDbList || []).slice();
    
    if (charFilterAlign !== "ALL") {
      list = list.filter((c: any) => {
        const master = CHARACTERS_MASTER.find(m => m.id === c.character_id);
        return master?.alignment === charFilterAlign;
      });
    }

    const rarityOrder: { [key: string]: number } = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

    list.sort((a: any, b: any) => {
      const masterA = CHARACTERS_MASTER.find(m => m.id === a.character_id);
      const masterB = CHARACTERS_MASTER.find(m => m.id === b.character_id);

      if (charSortKey === "rarity") {
        const rA = rarityOrder[(masterA as any)?.rarity || "R"] || 0;
        const rB = rarityOrder[(masterB as any)?.rarity || "R"] || 0;
        if (rB !== rA) return rB - rA;
      } else if (charSortKey === "level") {
        if (b.level !== a.level) return b.level - a.level;
      } else if (charSortKey === "power") {
        const statsA = getCharacterTotalStats(a, userEquipmentsList);
        const statsB = getCharacterTotalStats(b, userEquipmentsList);
        const powerA = statsA.hp + statsA.atk + statsA.def + statsA.spd + statsA.luk;
        const powerB = statsB.hp + statsB.atk + statsB.def + statsB.spd + statsB.luk;
        if (powerB !== powerA) return powerB - powerA;
      } else if (charSortKey === "alignment") {
        const alignA = masterA?.alignment || "";
        const alignB = masterB?.alignment || "";
        if (alignA !== alignB) return alignA.localeCompare(alignB);
      }
      return (b.awakening_level || 0) - (a.awakening_level || 0);
    });

    return list;
  }, [userCharactersDbList, charFilterAlign, charSortKey, userEquipmentsList]);


  // カルーセル切り替えロジック
  const ownedCharIds = userCharactersDbList.map((uc: any) => uc.character_id);
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

  // 背景画像URLの解決
  const bgData = PROFILE_BACKGROUNDS.find(bg => bg.id === equippedBackground);
  const bgImgUrl = bgData?.img || "/shinjuku_neon_icon_1783765789862.png";

  // 称号名の解決
  const titleData = PROFILE_TITLES.find(t => t.id === titleEquipped);
  const titleName = titleData && titleData.id !== "title_none" ? titleData.name : "";

  // 装備スロットの個別レンダリング (放置少女風リッチスロット)
  const renderGearSlot = (slot: any) => {
    if (!activeChar) return null;
    const equippedGear = userEquipmentsList.find((e: any) => e.equipped_character_id === activeChar.id && e.slot_index === slot.index);
    const gearMaster = equippedGear ? EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === equippedGear.equipment_id) : null;
    const rarity = gearMaster?.rarity || "N";
    const slotRarityClass = `slot-rarity-${rarity.toLowerCase()}`;
    const rarityClass = `rarity-${rarity.toLowerCase()}`;

    return (
      <div 
        key={slot.index} 
        onClick={() => {
          if (equippedGear) {
            selectUpgradeEquipment(equippedGear);
            setUpgradeSubTab("equipment");
            playCyberSe("click");
          } else {
            setUpgradeSubTab("equipment");
          }
        }}
        className={`char-equipment-slot-box cursor-pointer flex flex-col justify-between p-1.5 ${slotRarityClass} ${selectedEquipment?.id === equippedGear?.id ? "active-border-cyan" : ""}`}
      >
        <div className="flex justify-between items-center w-full">
          <span className="slot-label-text">{slot.label}</span>
          {equippedGear && equippedGear.plus_val > 0 && (
            <span className="font-size-6 font-bold text-amber-400">+{equippedGear.plus_val}</span>
          )}
        </div>
        {equippedGear ? (
          <div className="equipped-gear-info">
            <span className={`gear-name-text truncate ${rarityClass}`}>
              {gearMaster?.name || equippedGear.equipment_id}
            </span>
            <div className="gear-action-row">
              <span className="gear-lv-badge">Lv.{equippedGear.level}</span>
              <button 
                className="gear-unequip-btn font-size-6 px-1 active-scale-effect"
                onClick={(e) => { e.stopPropagation(); handleUnequipGear(equippedGear.id); }}
              >
                外す
              </button>
            </div>
          </div>
        ) : (
          <span className="font-size-6 text-gray-500 text-center py-1">未装着</span>
        )}
      </div>
    );
  };

  // --------------------------------------------------------
  // メイン画面①: キャラ編成画面 (出撃デッキ5枠 + 5列カード一覧)
  // --------------------------------------------------------
  if (mainViewMode === "DECK") {
    return (
      <div className="view-container">
        {/* ヘッダー & ソート */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="view-title mb-0">キャラ編成</h2>
          <div className="flex items-center gap-2">
            <span className="font-size-7 text-gray-400">ソート:</span>
            <select
              value={charSortKey}
              onChange={(e: any) => setCharSortKey(e.target.value)}
              className="bg-gray-900 text-white font-size-7 p-1 rounded border border-gray-700 cursor-pointer"
            >
              <option value="rarity">レアリティ順</option>
              <option value="level">レベル順</option>
              <option value="power">総合力順</option>
              <option value="alignment">属性順</option>
            </select>
          </div>
        </div>

        {/* 案内ラベル */}
        <div className="text-center font-size-8 text-cyan-400 font-bold mb-2 tracking-wider">
          編成したいキャラを選べ!!
        </div>

        {/* 上部: 出撃デッキ編成スロット (5枠) */}
        <div className="upgrade-card mb-2 p-2 background-black-90 border-cyan">
          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {Array.from({ length: 5 }).map((_, idx) => {
              const masterId = selectedMembers[idx];
              const charRec = masterId ? userCharactersDbList.find((c: any) => c.character_id === masterId || c.id === masterId) : null;
              const masterData = masterId ? CHARACTERS_MASTER.find(m => m.id === masterId) : null;
              const isLeader = idx === 0;

              const rarity = (masterData as any)?.rarity || "N";
              const alignInfo = getAlignmentShortJp(masterData?.alignment || "");

              return (
                <div
                  key={idx}
                  className={`deck-slot-item ${charRec ? "filled" : ""} rarity-frame-${rarity.toLowerCase()}`}
                  onClick={() => {
                    if (masterId) {
                      handleTogglePartyMember(masterId);
                      playCyberSe("click");
                    }
                  }}
                >
                  {isLeader && (
                    <div className="leader-badge-label">リーダー</div>
                  )}

                  {masterData && charRec ? (
                    <>
                      <div className={`align-badge ${alignInfo.colorClass}`}>
                        {alignInfo.label}
                      </div>
                      <img
                        src={getCharacterTransparentImg(masterData.name)}
                        alt={masterData.jpName}
                        className="char-card-avatar"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/reiji_transparent_asset.png"; }}
                      />
                      <div className="char-card-lv-text">
                        Lv.{charRec.level}
                      </div>
                    </>
                  ) : (
                    <span className="font-size-6 text-gray-500">枠 {idx + 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* パーティ総合力表示 */}
          <div className="flex items-center justify-between px-2 pt-1 border-top-subtle">
            <span className="font-size-8 text-secondary font-bold">パーティ総合力</span>
            <span className="font-size-10 font-bold text-amber-400 font-mono tracking-wider">
              {totalPartyPower.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 操作モード切替 ＆ 属性絞り込みツールバー */}
        <div className="char-mode-bar">
          {/* ラジオボタン風モード切替 */}
          <div className="mode-toggle-group">
            <label className={`mode-radio-label ${opMode === "DECK" ? "active text-color-cyan" : ""}`}>
              <input
                type="radio"
                name="opMode"
                value="DECK"
                checked={opMode === "DECK"}
                onChange={() => setOpMode("DECK")}
              />
              デッキ編成
            </label>
            <label className={`mode-radio-label ${opMode === "DETAIL" ? "active text-color-magenta" : ""}`}>
              <input
                type="radio"
                name="opMode"
                value="DETAIL"
                checked={opMode === "DETAIL"}
                onChange={() => setOpMode("DETAIL")}
              />
              詳細・育成
            </label>
          </div>

          {/* 属性絞り込み */}
          <div className="filter-btn-group">
            {[
              { id: "ALL", label: "全" },
              { id: "ORDER", label: "秩" },
              { id: "JUSTICE", label: "正" },
              { id: "CHAOS", label: "混" },
              { id: "EVIL", label: "悪" }
            ].map(f => (
              <button
                key={f.id}
                className={`filter-chip-btn ${charFilterAlign === f.id ? "active" : ""}`}
                onClick={() => setCharFilterAlign(f.id as any)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 下部: 所持キャラクター 5列カードグリッド (本番 CardIcon 適用) */}
        <div className="scroll-container flex-1">
          <div className="char-card-grid-5 gap-2 p-2">
            {filteredSortedCharList.map((charRec: any) => {
              const masterData = CHARACTERS_MASTER.find(m => m.id === charRec.character_id);
              if (!masterData) return null;

              const partyIndex = selectedMembers.indexOf(masterData.id);
              const isInParty = partyIndex !== -1;
              const rarity = (masterData as any).rarity || "R";

              return (
                <div
                  key={charRec.id}
                  className="relative flex-col items-center justify-center cursor-pointer active-scale-effect group mb-2"
                  onClick={() => {
                    playCyberSe("click");
                    if (opMode === "DECK") {
                      handleTogglePartyMember(masterData.id);
                    } else {
                      setUpgradeSelectedCharId(masterData.id);
                      setMainViewMode("DETAIL");
                    }
                  }}
                >
                  {/* 新本番 CardIcon (顔アップ ＋ レアリティ枠 ＋ 左上属性オーブ) */}
                  <CardIcon
                    rarity={rarity}
                    img={getCharacterTransparentImg(masterData.name)}
                    jpName={masterData.jpName}
                    alignment={masterData.alignment}
                    size={68}
                    mode="square"
                  />

                  {/* 編成中オーバーレイバッジ */}
                  {isInParty && (
                    <div className="absolute inset-0 bg-black-60 rounded flex items-center justify-center z-30 pointer-events-none">
                      <span className="bg-cyan-600 text-white font-size-6 font-bold px-1 py-0.5 rounded shadow">
                        出撃{partyIndex + 1}
                      </span>
                    </div>
                  )}

                  {/* レベル ＆ キャラクター名 */}
                  <div className="text-center mt-1 w-full overflow-hidden">
                    <div className="font-size-6 text-amber-300 font-mono font-bold">Lv.{charRec.level}</div>
                    <div className="font-size-6 text-gray-300 font-bold truncate">{masterData.jpName}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // サブ画面②: キャラクター詳細・装備/スキル 画面 (既存画面)
  // --------------------------------------------------------
  return (
    <div className="view-container">
      <div className="flex items-center justify-between mb-2">
        <button
          className="sub-btn active-scale-effect font-size-8 px-2 py-1 border-cyan"
          onClick={() => {
            setMainViewMode("DECK");
            playCyberSe("click");
          }}
        >
          ◀ 編成へ戻る
        </button>
        <h2 className="view-title mb-0">構成員詳細</h2>
      </div>

      {activeChar && activeCharMaster && (
        <>

          {/* 上部: 5層キャンバス ＆ 左右スロット */}
          <div className="character-display-composite mb-3">
            {/* 左列装備 (Weapon 1, Weapon 2, Head Armor) */}
            <div className="gear-column gear-column-left">
              {GEAR_SLOTS_MASTER.slice(0, 3).map(slot => renderGearSlot(slot))}
            </div>

            {/* 中央: 5層キャンバス */}
            <div className="character-canvas">
              {/* Z-10: 最背面背景 */}
              <div 
                className="layer-bg" 
                style={{ backgroundImage: `url(${bgImgUrl})` }}
              ></div>

              {/* Z-20: 背後エフェクト (覚醒ランクに応じて明滅オーラを自動適用) */}
              {activeChar.awakening_level > 0 && (
                <div className={`layer-back-aura aura-tier-${activeChar.awakening_level}`}>
                  <div className="aura-circle"></div>
                </div>
              )}

              {/* Z-30: キャラクター本体 (透過立ち絵) */}
              <div className="layer-character">
                <img 
                  src={getCharacterTransparentImg(activeCharMaster.name)} 
                  alt={activeCharMaster.jpName} 
                  className="char-standing-img"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/reiji_transparent_asset.png"; }}
                />
              </div>

              {/* Z-40: 前面エフェクト (稲妻・火の粉・煙) */}
              {equippedFrontEffect !== "effect_none" && (
                <div className={`layer-front-effect ${equippedFrontEffect}`}>
                  <div className="effect-particle-1"></div>
                  <div className="effect-particle-2"></div>
                  <div className="effect-particle-3"></div>
                </div>
              )}

              {/* Z-50: 最前面UI (称号・通り名フレーム + 組織名) */}
              <div className="layer-title-overlay">
                {titleName && (
                  <div className="title-equipped-badge">
                    {titleName}
                  </div>
                )}
                <div className="char-name-badge">
                  <span className={`faction-dot faction-${activeCharMaster.homeTown}`}></span>
                  {activeCharMaster.jpName}
                </div>
              </div>

              {/* カールセル切り替え矢印ボタン */}
              {ownedCharIds.length > 1 && (
                <>
                  <button className="nav-arrow nav-arrow-left" onClick={handlePrevChar}>◀</button>
                  <button className="nav-arrow nav-arrow-right" onClick={handleNextChar}>▶</button>
                </>
              )}

              {/* ページャー表示 */}
              <div className="pager-overlay">
                {activeCharIndex + 1} / {ownedCharIds.length}
              </div>
            </div>

            {/* 右列装備 (Body Armor, Leg Armor, Accessory 1, Accessory 2) */}
            <div className="gear-column gear-column-right">
              {GEAR_SLOTS_MASTER.slice(3, 7).map(slot => renderGearSlot(slot))}
            </div>
          </div>

          {/* 中部: タブ切り替えメニュー */}
          <div className="tab-menu mb-2">
            <button className={`tab-btn ${upgradeSubTab === "character" ? "active" : ""}`} onClick={() => { setUpgradeSubTab("character"); playCyberSe("click"); }}>ステータス・育成</button>
            <button className={`tab-btn ${upgradeSubTab === "skill" ? "active" : ""}`} onClick={() => { setUpgradeSubTab("skill"); playCyberSe("click"); }}>スキルデッキ</button>
            <button className={`tab-btn ${upgradeSubTab === "equipment" ? "active" : ""}`} onClick={() => { setUpgradeSubTab("equipment"); playCyberSe("click"); }}>装備詳細</button>
          </div>

          {/* 下部: 各タブの内容 */}
          <div className="scroll-container flex-1">
            
            {/* タブ1: キャラクター強化・覚醒 */}
            {upgradeSubTab === "character" && (
              <div className="upgrade-layout">
                <div className="upgrade-card">
                  <div className="upgrade-card-title flex items-center justify-between char-party-toggle-header">
                    <span>キャラクター強化・覚醒</span>
                    {(() => {
                      const isInParty = selectedMembers.includes(upgradeSelectedCharId);
                      return (
                        <button 
                          className={`sub-btn active-scale-effect font-weight-bold party-toggle-action-btn ${isInParty ? "party-in" : "party-out"}`}
                          onClick={() => handleTogglePartyMember(upgradeSelectedCharId)}
                        >
                          {isInParty ? "パーティから外す" : "パーティへ編成する"}
                        </button>
                      );
                    })()}
                  </div>
                  <div className="upgrade-target-info">
                    <span>レベル: {characterLevel}/100</span>
                    <span>覚醒段階: ★{characterAwaken}/5</span>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center font-size-7 text-gray-400">
                      <span>レベルアップ (経験の書を消費):</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleCharacterLevelUp("CHAR_EXP_S", 1)} 
                        disabled={upgradeLoading || characterLevel >= 100}
                        className="upgrade-btn flex-1 active-scale-effect font-size-7 py-1.5"
                      >
                        経験の書[小] (+500)
                      </button>
                      <button 
                        onClick={() => handleCharacterLevelUp("CHAR_EXP_M", 1)} 
                        disabled={upgradeLoading || characterLevel >= 100}
                        className="upgrade-btn flex-1 active-scale-effect font-size-7 py-1.5"
                      >
                        経験の書[中] (+2k)
                      </button>
                      <button 
                        onClick={() => handleCharacterLevelUp("CHAR_EXP_L", 1)} 
                        disabled={upgradeLoading || characterLevel >= 100}
                        className="upgrade-btn flex-1 active-scale-effect font-size-7 py-1.5"
                      >
                        経験の書[大] (+10k)
                      </button>
                    </div>

                    <div className="flex justify-between items-center font-size-7 text-gray-400 mt-2">
                      <span>キャラクター覚醒 (レベル上限解放):</span>
                    </div>
                    <button 
                      onClick={handleCharacterAwaken} 
                      disabled={upgradeLoading || characterAwaken >= 5}
                      className="upgrade-btn width-100 active-scale-effect font-size-7 py-1.5"
                    >
                      「覚醒の書」で覚醒を実行 (覚醒の書 x1)
                    </button>
                  </div>

                  <div className="font-size-7 text-secondary mt-2 px-1">
                    ※レベル50以上の育成には、「覚醒の書」を施すことでレベル上限を解放する必要があります。<br/>
                    ※現在の所持：覚醒の書 x{lawsOfStrife}
                  </div>
                </div>

                <div className="upgrade-card mt-3">
                  <div className="upgrade-card-title">戦闘ステータス (装備込み値)</div>
                  <div className="char-stats-grid">
                    <div className="stat-row">
                      <span className="stat-label">HP</span>
                      <span className="stat-val font-bold text-white">{charStats.hp}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">攻撃力 (ATK)</span>
                      <span className="stat-val font-bold text-white">{charStats.atk}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">防御力 (DEF)</span>
                      <span className="stat-val font-bold text-white">{charStats.def}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">速度 (SPD)</span>
                      <span className="stat-val font-bold text-white">{charStats.spd}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">幸運 (LUK)</span>
                      <span className="stat-val font-bold text-white">{charStats.luk}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* タブ2: スキルデッキ */}
            {upgradeSubTab === "skill" && (
              <div className="upgrade-layout">
                {/* 一括操作バー */}
                <div className="bulk-action-bar">
                  <button 
                    className="bulk-btn-recommend flex-1 active-scale-effect"
                    onClick={() => handleEquipSkillBulkRecommended(activeChar.id, activeChar.character_id)}
                    disabled={upgradeLoading}
                  >
                    おすすめスキル装着
                  </button>
                  <button 
                    className="bulk-btn-unequip flex-1 active-scale-effect"
                    onClick={() => {
                      if (window.confirm("全スキルの装備を解除しますか？")) {
                        handleUnequipSkillBulk(activeChar.id);
                      }
                    }}
                    disabled={upgradeLoading}
                  >
                    全身外す
                  </button>
                </div>

                {!selectedSkill ? (
                  <>
                    <div className="upgrade-card mb-3">
                      <div className="upgrade-card-title flex items-center justify-between">
                        <span>スキルデッキ編成</span>
                        <span className="font-size-6 text-gray-400">※最大6つ選択</span>
                      </div>
                      <div className="gvg-grid-map grid-cols-3 gap-2">
                        {Array.from({ length: 6 }).map((_, idx: number) => {
                          const equippedSkill = userSkillsList.find((s: any) => s.equipped_character_id === activeChar.id && s.slot_index === idx);
                          const skillMaster = equippedSkill ? SKILLS_MASTER_DATA.find((s: any) => s.id === equippedSkill.skill_card_id) : null;
                          const isSynergy = skillMaster?.exclusive_character_id === activeChar.character_id;

                          // 限界突破光彩クラス
                          const lbVal = equippedSkill?.plus_val || 0;
                          let lbClass = "skill-slot-lb-silver";
                          if (lbVal >= 10) lbClass = "skill-slot-lb-max";
                          else if (lbVal >= 5) lbClass = "skill-slot-lb-gold";

                          return (
                            <div 
                              key={idx} 
                              className={`gvg-area-box slot-height-skill flex flex-col justify-between p-1 char-skill-slot-box ${lbClass} ${equippedSkill ? 'cursor-pointer active-scale-effect' : ''}`} 
                              style={{ height: "68px" }}
                              onClick={() => {
                                if (equippedSkill) {
                                  setSelectedSkill(equippedSkill);
                                  playCyberSe("click");
                                }
                              }}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-size-8 text-gray-400">枠 {idx+1}</span>
                                {equippedSkill && lbVal > 0 && (
                                  <span className="font-size-6 font-bold text-amber-400">+{lbVal}</span>
                                )}
                              </div>
                              {equippedSkill ? (
                                <div className="flex flex-col items-center justify-center flex-1">
                                  <span className="font-size-7 text-white truncate max-width-100 mb-0.5 text-center">
                                    {skillMaster?.name || equippedSkill.skill_card_id}
                                  </span>
                                  {isSynergy && <span className="synergy-badge text-color-red font-size-6 px-1 border-red rounded">得意</span>}
                                </div>
                              ) : (
                                <span className="font-size-6 text-gray-500 text-center py-1">未装備</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* インライン所持スキルカード一覧 (Safariタップ判定バグ対策) */}
                    <div className="upgrade-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="upgrade-card-title mb-0">所持スキルカード ({userSkillsList.length})</span>
                        <select 
                          value={skillSortKey}
                          onChange={(e: any) => setSkillSortKey(e.target.value)}
                          className="bg-gray-900 text-white font-size-7 p-1 rounded border border-gray-700"
                        >
                          <option value="synergy">得意・属性優先</option>
                          <option value="lb">限界突破順</option>
                          <option value="rarity">レアリティ順</option>
                        </select>
                      </div>

                      <div className="inline-grid-container grid grid-cols-4 gap-2">
                        {userSkillsList
                          .slice()
                          .sort((a: any, b: any) => {
                            const mA = SKILLS_MASTER_DATA.find((m: any) => m.id === a.skill_card_id);
                            const mB = SKILLS_MASTER_DATA.find((m: any) => m.id === b.skill_card_id);
                            if (skillSortKey === "synergy") {
                              const synA = mA?.exclusive_character_id === activeChar.character_id ? 1 : 0;
                              const synB = mB?.exclusive_character_id === activeChar.character_id ? 1 : 0;
                              if (synB !== synA) return synB - synA;
                            } else if (skillSortKey === "lb") {
                              const diff = (b.plus_val || 0) - (a.plus_val || 0);
                              if (diff !== 0) return diff;
                            }
                            const rScore: any = { SSR: 4, SR: 3, R: 2, N: 1 };
                            return (rScore[mB?.rarity || "N"] || 0) - (rScore[mA?.rarity || "N"] || 0);
                          })
                          .map((sk: any) => {
                            const master = SKILLS_MASTER_DATA.find((m: any) => m.id === sk.skill_card_id);
                            const isExclusiveOther = master?.is_exclusive && master.exclusive_character_id && master.exclusive_character_id !== activeChar.character_id;
                            const isEquippedCurrent = sk.equipped_character_id === activeChar.id;
                            const isEquippedOther = sk.equipped_character_id && !isEquippedCurrent;

                            return (
                              <div
                                key={sk.id}
                                className={`inline-asset-card ${isExclusiveOther ? 'disabled-exclusive' : ''}`}
                                onClick={() => {
                                  if (isExclusiveOther) {
                                    alert("このスキルカードは他キャラクター専用のため装着できません。");
                                    return;
                                  }
                                  setSelectedSkill(sk);
                                  playCyberSe("click");
                                }}
                              >
                                <span className={`rarity-badge font-size-6 px-1 rounded rarity-${master?.rarity?.toLowerCase()}`}>
                                  {master?.rarity}
                                </span>
                                <span className="font-size-6 text-white text-center truncate max-width-100 my-0.5">
                                  {master?.name || sk.skill_card_id}
                                </span>
                                <div className="flex items-center gap-1 font-size-6">
                                  {sk.plus_val > 0 && <span className="text-amber-400">+{sk.plus_val}</span>}
                                  {isEquippedCurrent && <span className="text-cyan-400">装備中</span>}
                                  {isEquippedOther && <span className="text-gray-400">他装備</span>}
                                  {isExclusiveOther && <span className="text-red-400">専用不可</span>}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </>
                ) : (() => {
                  const skillMaster = SKILLS_MASTER_DATA.find(s => s.id === selectedSkill.skill_card_id);
                  const isExclusive = !!skillMaster?.is_exclusive;
                  const isSynergy = skillMaster?.exclusive_character_id === activeChar.character_id;

                  const masterRec = skillLimitBreakMaster.find((m: any) => m.plus_val === selectedSkill.plus_val && m.is_exclusive === isExclusive);
                  const multiplier = masterRec ? Number(masterRec.power_multiplier) : (1.0 + selectedSkill.plus_val * 0.20);
                  const displayPower = skillMaster ? Math.floor(skillMaster.power * multiplier) : 0;

                  const nextCost = masterRec?.required_cash ?? 0;
                  const nextItemId = masterRec?.required_item_id;
                  const nextItemQty = masterRec?.required_item_qty ?? 0;
                  
                  let userItemQty = 0;
                  if (nextItemId === "TRAINING_MANUAL") userItemQty = trainingManuals;
                  else if (nextItemId === "EXCLUSIVE_CONTRACT") userItemQty = exclusiveContracts;

                  const canLB = selectedSkill.plus_val < 10;
                  const hasCash = cash >= nextCost;
                  const hasItem = nextItemId ? (userItemQty >= nextItemQty) : true;

                  const isJustice = skillMaster?.alignment === "JUSTICE";
                  const isEvil = skillMaster?.alignment === "EVIL";
                  const isOrder = skillMaster?.alignment === "ORDER";
                  const isChaos = skillMaster?.alignment === "CHAOS";

                  const isEquippedByCurrentChar = selectedSkill.equipped_character_id === activeChar.id;

                  return (
                    <div className="upgrade-card flex-col-gap-2">
                      <div className="flex items-center justify-between border-bottom-subtle pb-1">
                        <button className="sub-btn font-size-7 px-2 active-scale-effect" onClick={() => setSelectedSkill(null)}>
                          ◀ 戻る
                        </button>
                        <span className="font-bold font-size-8 text-white">スキル詳細 & 操作</span>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-size-9 text-white">
                            {skillMaster?.name || selectedSkill.skill_card_id}
                          </span>
                          <span className={`rarity-badge font-size-6 px-1.5 py-0.5 rounded rarity-${skillMaster?.rarity?.toLowerCase()}`}>
                            {skillMaster?.rarity}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <span className={`font-size-7 px-2 py-0.5 rounded border ${isJustice ? 'bg-red-950/20 text-red-400 border-red-900/60' : isEvil ? 'bg-purple-950/20 text-purple-400 border-purple-900/60' : isOrder ? 'bg-cyan-950/20 text-cyan-400 border-cyan-900/60' : 'bg-amber-950/20 text-amber-400 border-amber-900/60'}`}>
                            属性: {skillMaster?.alignment === "JUSTICE" ? "正義" : skillMaster?.alignment === "EVIL" ? "悪" : skillMaster?.alignment === "ORDER" ? "秩序" : "混沌"}
                          </span>
                          {isSynergy && <span className="font-size-7 px-2 py-0.5 bg-red-950/30 text-red-400 border border-red-900/60 rounded">得意</span>}
                          {isExclusive && <span className="font-size-7 px-2 py-0.5 bg-purple-950/30 text-purple-400 border border-purple-900/60 rounded">専用</span>}
                        </div>

                        <div className="font-size-7 text-gray-400 mt-0.5">
                          限界突破: +{selectedSkill.plus_val} (最大+10)
                        </div>

                        <div className="flex flex-col gap-1 bg-gray-950/40 p-2 rounded border border-gray-900 mt-1">
                          <div className="flex justify-between font-size-7">
                            <span className="text-gray-400">効果タイプ:</span>
                            <span className="text-white font-bold">{skillMaster?.effect_type}</span>
                          </div>
                          {skillMaster?.power && skillMaster.power > 0 ? (
                            <div className="flex justify-between font-size-7">
                              <span className="text-gray-400">威力:</span>
                              <span className="text-cyan-400 font-bold">
                                {skillMaster.power} {"=>"} {displayPower} ({multiplier.toFixed(1)}倍)
                              </span>
                            </div>
                          ) : null}
                          <div className="flex justify-between font-size-7">
                            <span className="text-gray-400">消費AP:</span>
                            <span className="text-white font-bold">{skillMaster?.ap_cost}</span>
                          </div>
                        </div>

                        {skillMaster?.description && (
                          <div className="font-size-7 text-gray-400 italic bg-gray-950/20 p-2 rounded border border-gray-900/40 mt-1">
                            {skillMaster.description}
                          </div>
                        )}
                      </div>

                      <div className="upgrade-action-btn-row mt-3">
                        {isEquippedByCurrentChar ? (
                          <button 
                            className="upgrade-btn flex-1 active-scale-effect" 
                            style={{ backgroundColor: "rgba(220, 38, 38, 0.15)", border: "1px solid rgba(220, 38, 38, 0.4)", color: "#ef4444" }}
                            onClick={() => {
                              handleUnequipSkill(selectedSkill.id);
                              setSelectedSkill(null);
                            }}
                          >
                            外す
                          </button>
                        ) : (
                          <button 
                            className="upgrade-btn flex-1 active-scale-effect" 
                            style={{ backgroundColor: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.5)", color: "#10b981" }}
                            onClick={() => {
                              handleEquipSkill(selectedSkill.id);
                              setSelectedSkill(null);
                            }}
                          >
                            このキャラに装着
                          </button>
                        )}

                        <div className="flex gap-2 width-100 mt-2">
                          <button 
                            className="upgrade-btn flex-1 active-scale-effect font-size-7 py-1.5" 
                            onClick={() => handleSkillUpgrade(false)}
                            disabled={!canLB || upgradeLoading}
                          >
                            同名カードで突破
                          </button>
                          <button 
                            className="upgrade-btn flex-1 active-scale-effect font-size-7 py-1.5" 
                            onClick={() => handleSkillUpgrade(true)}
                            disabled={!canLB || upgradeLoading}
                          >
                            {isExclusive ? "限界突破の書[専用スキル]で突破" : "限界突破の書[スキル]で突破"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* タブ3: 装備詳細 */}
            {upgradeSubTab === "equipment" && (
              <div className="upgrade-layout">
                {selectedEquipment ? (() => {
                  const master = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === selectedEquipment.equipment_id);
                  
                  // 装備品ステータスのレベル・限界突破スケーリング計算式 (パターンB適用: SPD/LUKもスケーリング)
                  const scale = 1 + (equipmentLevel - 1) * 0.05 + equipmentLimitBreak * 0.10;
                  const curHp = master?.hp ? Math.floor(master.hp * scale) : 0;
                  const curAtk = master?.atk ? Math.floor(master.atk * scale) : 0;
                  const curDef = master?.def ? Math.floor(master.def * scale) : 0;
                  const curSpd = master?.spd ? Math.floor(master.spd * scale) : 0;
                  const curLuk = master?.luk ? Math.floor(master.luk * scale) : 0;

                  // レベルアップ時の予測
                  const scaleNextLvl = 1 + (equipmentLevel) * 0.05 + equipmentLimitBreak * 0.10;
                  const nextHpLvl = master?.hp ? Math.floor(master.hp * scaleNextLvl) : 0;
                  const nextAtkLvl = master?.atk ? Math.floor(master.atk * scaleNextLvl) : 0;
                  const nextDefLvl = master?.def ? Math.floor(master.def * scaleNextLvl) : 0;
                  const nextSpdLvl = master?.spd ? Math.floor(master.spd * scaleNextLvl) : 0;
                  const nextLukLvl = master?.luk ? Math.floor(master.luk * scaleNextLvl) : 0;

                  // 限界突破時の予測
                  const scaleNextLb = 1 + (equipmentLevel - 1) * 0.05 + (equipmentLimitBreak + 1) * 0.10;
                  const nextHpLb = master?.hp ? Math.floor(master.hp * scaleNextLb) : 0;
                  const nextAtkLb = master?.atk ? Math.floor(master.atk * scaleNextLb) : 0;
                  const nextDefLb = master?.def ? Math.floor(master.def * scaleNextLb) : 0;
                  const nextSpdLb = master?.spd ? Math.floor(master.spd * scaleNextLb) : 0;
                  const nextLukLb = master?.luk ? Math.floor(master.luk * scaleNextLb) : 0;

                  // レベルアップコスト情報 (マスタ定義参照)
                  const lvlMaster = equipmentLevelUpMaster.find((m: any) => m.level === equipmentLevel);
                  const lvlCost = lvlMaster?.required_cash ?? 0;
                  const lvlItemId = lvlMaster?.required_item_id;
                  const lvlItemQty = lvlMaster?.required_item_qty ?? 0;
                  const hasLvlItem = lvlItemId === "POLISHING_STONE" ? polishingStones >= lvlItemQty : true;
                  const hasLvlCash = cash >= lvlCost;
                  const canLvlUp = equipmentLevel < 50 && hasLvlItem && hasLvlCash;

                  // 限界突破コスト情報 (マスタ定義参照)
                  const lbrMaster = equipmentLimitBreakMaster.find((m: any) => m.plus_val === equipmentLimitBreak);
                  const lbCost = lbrMaster?.required_cash ?? 0;
                  const lbItemQty = lbrMaster?.required_item_qty ?? 0;
                  
                  // 同一装備の所持数確認
                  const dupes = userEquipmentsList.filter((e: any) => e.id !== selectedEquipment.id && e.equipment_id === selectedEquipment.equipment_id && e.equipped_character_id === null);
                  const hasLbItem = dupes.length >= lbItemQty;
                  const hasLbCash = cash >= lbCost;
                  const canLb = equipmentLimitBreak < 10 && hasLbItem && hasLbCash;

                  // 星（限界突破）のインジケータ生成
                  const stars = Array.from({ length: 10 }).map((_, idx) => idx < equipmentLimitBreak);

                  return (
                    <div className="upgrade-card flex flex-col gap-3">
                      <div className="flex items-center justify-between border-bottom-subtle pb-1">
                        <button className="sub-btn font-size-7 px-2 active-scale-effect" onClick={() => selectUpgradeEquipment(null)}>
                          ◀ 一覧に戻る
                        </button>
                        <span className="font-bold font-size-8 text-white">装備詳細 & 強化</span>
                      </div>

                      {/* 上部ヘッダー（画像 + 基本情報） */}
                      <div className="flex gap-3 char-equip-detail-header border-bottom-subtle pb-2">
                        <img 
                          src={`/equipments/${selectedEquipment.equipment_id.toLowerCase()}.png`} 
                          className="rounded-md char-equip-detail-img border-subtle"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/reiji_transparent_asset.png"; }} 
                          alt={master?.name} 
                        />
                        <div className="flex-1 flex flex-col justify-between char-equip-title-layout">
                          <div>
                            <div className="font-bold font-size-9 flex items-center justify-between char-equip-title-row">
                              <span className="text-white">{master?.name || selectedEquipment.equipment_id}</span>
                              <span className={`rarity-badge font-size-6 px-1.5 py-0.5 rounded rarity-${master?.rarity.toLowerCase()}`}>
                                {master?.rarity}
                              </span>
                            </div>
                            <div className="font-size-7 text-gray-400 mt-1 flex flex-col gap-0.5">
                              <div>Lv. {equipmentLevel} / 50</div>
                              <div className="flex items-center gap-1">
                                <span className="text-color-cyan font-bold">限界突破 +{equipmentLimitBreak}</span>
                                <span className="flex text-yellow-500 font-size-6 font-weight-bold select-none leading-none">
                                  {stars.map((filled, i) => (filled ? "★" : "☆"))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 現在のステータス値 */}
                      <div className="bg-black/30 border border-gray-900 rounded p-2.5 flex flex-col gap-1.5">
                        <div className="font-size-6 font-bold text-gray-400 border-bottom-subtle pb-1 mb-1">現在の装備ステータス</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-size-7">
                          {curAtk > 0 && <div className="flex justify-between"><span className="text-gray-400">ATK:</span> <span className="text-cyan-400 font-bold">+{curAtk}</span></div>}
                          {curDef > 0 && <div className="flex justify-between"><span className="text-gray-400">DEF:</span> <span className="text-cyan-400 font-bold">+{curDef}</span></div>}
                          {curHp > 0 && <div className="flex justify-between"><span className="text-gray-400">HP:</span> <span className="text-cyan-400 font-bold">+{curHp}</span></div>}
                          {curSpd > 0 && <div className="flex justify-between"><span className="text-gray-400">SPD:</span> <span className="text-cyan-400 font-bold">+{curSpd}</span></div>}
                          {curLuk > 0 && <div className="flex justify-between"><span className="text-gray-400">LUK:</span> <span className="text-cyan-400 font-bold">+{curLuk}</span></div>}
                        </div>
                      </div>

                      {/* 特殊効果 ＆ サブオプション */}
                      {master?.effect_description && (
                        <div className="font-size-7 bg-purple-950/20 border border-purple-900/60 p-2 rounded text-purple-200">
                          <div className="font-bold font-size-6 text-purple-400 mb-0.5">特殊効果:</div>
                          {master.effect_description}
                        </div>
                      )}

                      {subOptions && subOptions.length > 0 && (
                        <div className="font-size-7 bg-gray-950/40 border border-gray-900 p-2 rounded text-gray-300 flex flex-col gap-1">
                          <div className="font-bold font-size-6 text-gray-400 border-bottom-subtle pb-1 mb-1">サブオプション</div>
                          {subOptions.map((opt: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span>・{opt.name}:</span>
                              {opt.unlocked ? (
                                <span className="text-cyan-400 font-bold">{opt.val} (解放済)</span>
                              ) : (
                                <span className="text-gray-600 font-bold">
                                  {opt.val} (突破+{idx === 1 ? 3 : idx === 2 ? 5 : 10}で解放)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {master?.description && (
                        <div className="font-size-7 text-gray-500 italic mt-0.5 border-t border-gray-900 pt-2 pb-1">
                          {master.description}
                        </div>
                      )}

                        {/* 【レベルアップ強化セクション】 */}
                        <div className="bg-black/20 border border-gray-900/80 rounded p-2.5 flex flex-col gap-2 mt-1">
                          <div className="flex justify-between items-center border-bottom-subtle pb-1 mb-1">
                            <span className="font-size-7 font-bold text-white">レベルアップ強化</span>
                            <span className="font-size-6 text-gray-400">※カスタムオイルを消費して強化</span>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              className="upgrade-btn font-size-7 flex-1 active-scale-effect py-1.5"
                              onClick={() => handleEquipmentLevelUp("EQUIP_EXP_S", 1)}
                              disabled={upgradeLoading || equipmentLevel >= 50}
                            >
                              オイル[小] (EXP+100)
                            </button>
                            <button 
                              className="upgrade-btn font-size-7 flex-1 active-scale-effect py-1.5"
                              onClick={() => handleEquipmentLevelUp("EQUIP_EXP_M", 1)}
                              disabled={upgradeLoading || equipmentLevel >= 50}
                            >
                              オイル[中] (EXP+500)
                            </button>
                            <button 
                              className="upgrade-btn font-size-7 flex-1 active-scale-effect py-1.5"
                              onClick={() => handleEquipmentLevelUp("EQUIP_EXP_L", 1)}
                              disabled={upgradeLoading || equipmentLevel >= 50}
                            >
                              オイル[大] (EXP+2500)
                            </button>
                          </div>
                        </div>

                        {/* 【限界突破セクション】 */}
                        <div className="bg-black/20 border border-gray-900/80 rounded p-2.5 flex flex-col gap-2">
                          <div className="flex justify-between items-center border-bottom-subtle pb-1 mb-1">
                            <span className="font-size-7 font-bold text-white">限界突破</span>
                            <span className="font-size-6 text-gray-400">同名重ね or 万能ツールで突破</span>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              className="upgrade-btn font-size-7 flex-1 active-scale-effect py-1.5" 
                              onClick={() => handleEquipmentLimitBreak(false)} 
                              disabled={upgradeLoading || equipmentLimitBreak >= 10}
                            >
                              同名装備で限界突破
                            </button>
                            <button 
                              className="upgrade-btn font-size-7 flex-1 active-scale-effect py-1.5" 
                              onClick={() => handleEquipmentLimitBreak(true)} 
                              disabled={upgradeLoading || equipmentLimitBreak >= 10}
                            >
                              万能ツール[装備]で突破
                            </button>
                          </div>
                        </div>

                        {/* 装備解除ボタン */}
                      <button 
                        className="upgrade-btn font-size-8 font-bold active-scale-effect py-2 mt-1" 
                        style={{ backgroundColor: "rgba(220, 38, 38, 0.15)", border: "1px solid rgba(220, 38, 38, 0.4)", color: "#ef4444" }}
                        onClick={() => {
                          const confirmUnequip = window.confirm("この装備を外しますか？");
                          if (confirmUnequip) {
                            handleUnequipGear(selectedEquipment.id);
                            playCyberSe("click");
                          }
                        }}
                      >
                        装備を外す
                      </button>
                    </div>
                  );
                })() : (
                  <div className="flex flex-col gap-3">
                    {/* 一括操作バー */}
                    <div className="bulk-action-bar">
                      <button 
                        className="bulk-btn-recommend flex-1 active-scale-effect"
                        onClick={() => handleEquipGearBulkRecommended(activeChar.id, activeChar.character_id)}
                        disabled={upgradeLoading}
                      >
                        おすすめ装備装着
                      </button>
                      <button 
                        className="bulk-btn-unequip flex-1 active-scale-effect"
                        onClick={() => {
                          if (window.confirm("全装備を解除しますか？")) {
                            handleUnequipGearBulk(activeChar.id);
                          }
                        }}
                        disabled={upgradeLoading}
                      >
                        全身外す
                      </button>
                      <button 
                        className={`bulk-btn-sell-mode flex-1 active-scale-effect ${isSellMode ? 'bg-red-700 text-white' : ''}`}
                        onClick={() => {
                          setIsSellMode(!isSellMode);
                          setSelectedSellGearIds([]);
                        }}
                      >
                        {isSellMode ? "売却キャンセル" : "一括売却モード"}
                      </button>
                    </div>

                    {/* 売却モードのアクションバー */}
                    {isSellMode && (
                      <div className="bg-red-950/30 border border-red-900/60 p-2 rounded flex items-center justify-between">
                        <span className="font-size-7 text-red-300">
                          選択中: <strong className="text-white font-size-8">{selectedSellGearIds.length}</strong> 件
                        </span>
                        <button 
                          className="sub-btn bg-red-600 text-white font-bold font-size-7 px-3 py-1 rounded active-scale-effect"
                          disabled={selectedSellGearIds.length === 0 || upgradeLoading}
                          onClick={() => {
                            if (window.confirm(`本当に選択した装備品 ${selectedSellGearIds.length} 点を売却しますか？\n※この操作は取り消せません。`)) {
                              handleSellGearBulk(selectedSellGearIds);
                              setSelectedSellGearIds([]);
                              setIsSellMode(false);
                            }
                          }}
                        >
                          選択品を売却実行
                        </button>
                      </div>
                    )}

                    {/* インライン所持装備一覧 (Safariタップ判定バグ対策) */}
                    <div className="upgrade-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="upgrade-card-title mb-0">所持装備品一覧 ({userEquipmentsList.length})</span>
                        <select 
                          value={gearSortKey}
                          onChange={(e: any) => setGearSortKey(e.target.value)}
                          className="bg-gray-900 text-white font-size-7 p-1 rounded border border-gray-700"
                        >
                          <option value="rarity">レアリティ順</option>
                          <option value="level">レベル/限界突破順</option>
                          <option value="slot">部位別</option>
                        </select>
                      </div>

                      <div className="inline-grid-container grid grid-cols-4 gap-2">
                        {userEquipmentsList
                          .slice()
                          .sort((a: any, b: any) => {
                            const mA = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === a.equipment_id);
                            const mB = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === b.equipment_id);
                            if (gearSortKey === "level") {
                              const lvlDiff = (b.level || 1) - (a.level || 1);
                              if (lvlDiff !== 0) return lvlDiff;
                              return (b.plus_val || 0) - (a.plus_val || 0);
                            } else if (gearSortKey === "slot") {
                              const sOrder: any = { WEAPON: 1, HEAD: 2, BODY: 3, LEGS: 4, ACCESSORY: 5 };
                              return (sOrder[mA?.slot_type || "WEAPON"] || 0) - (sOrder[mB?.slot_type || "WEAPON"] || 0);
                            }
                            const rScore: any = { SSR: 4, SR: 3, R: 2, N: 1 };
                            return (rScore[mB?.rarity || "N"] || 0) - (rScore[mA?.rarity || "N"] || 0);
                          })
                          .map((eq: any) => {
                            const master = EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === eq.equipment_id);
                            const isExclusiveOther = master?.is_exclusive && master.exclusive_character_id && master.exclusive_character_id !== activeChar.character_id;
                            const isEquippedCurrent = eq.equipped_character_id === activeChar.id;
                            const isEquippedOther = eq.equipped_character_id && !isEquippedCurrent;
                            const isSelectedSell = selectedSellGearIds.includes(eq.id);

                            return (
                              <div
                                key={eq.id}
                                className={`inline-asset-card ${isExclusiveOther ? 'disabled-exclusive' : ''} ${isSelectedSell ? 'selected-sell' : ''} slot-rarity-${master?.rarity?.toLowerCase()}`}
                                onClick={() => {
                                  if (isSellMode) {
                                    if (eq.equipped_character_id) {
                                      alert("装備中のアイテムは売却できません。先に装備を解除してください。");
                                      return;
                                    }
                                    if (isSelectedSell) {
                                      setSelectedSellGearIds(prev => prev.filter(id => id !== eq.id));
                                    } else {
                                      setSelectedSellGearIds(prev => [...prev, eq.id]);
                                    }
                                  } else {
                                    if (isExclusiveOther) {
                                      alert("この装備品は他キャラクター専用のため装着できません。");
                                      return;
                                    }
                                    selectUpgradeEquipment(eq);
                                    playCyberSe("click");
                                  }
                                }}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className={`rarity-badge font-size-6 px-1 rounded rarity-${master?.rarity?.toLowerCase()}`}>
                                    {master?.rarity}
                                  </span>
                                  {isSellMode && !eq.equipped_character_id && (
                                    <input 
                                      type="checkbox" 
                                      checked={isSelectedSell} 
                                      onChange={() => {}} 
                                      className="pointer-events-none"
                                    />
                                  )}
                                </div>
                                <span className="font-size-6 text-white text-center truncate max-width-100 my-0.5">
                                  {master?.name || eq.equipment_id}
                                </span>
                                <div className="flex items-center gap-1 font-size-6">
                                  {eq.plus_val > 0 && <span className="text-amber-400">+{eq.plus_val}</span>}
                                  <span className="text-cyan-400">Lv.{eq.level}</span>
                                  {isEquippedCurrent && <span className="text-cyan-400 font-bold">[現在装備]</span>}
                                  {isEquippedOther && <span className="text-gray-400">[他装備]</span>}
                                  {isExclusiveOther && <span className="text-red-400">[専用不可]</span>}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        </>
      )}
    </div>
  );
}
