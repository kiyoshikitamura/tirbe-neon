"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import {
  CHARACTERS_MASTER,
  GEAR_SLOTS_MASTER,
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
    handleTogglePartyMember,
    playCyberSe,
    currentBaseId,
    session
  } = useGame();

  // ボトムシートモーダル状態: null (閉じ) | "STATUS" | "SKILL" | "GEAR"
  const [bottomModalTab, setBottomModalTab] = useState<"STATUS" | "SKILL" | "GEAR" | "STYLE" | null>(null);
  const [characterCosmetics, setCharacterCosmetics] = useState<Array<{ cosmetic_id: string; cosmetic_master: { slot: string; display_name: string; rarity: string } | null }>>([]);
  const [equippedCharacterCosmetics, setEquippedCharacterCosmetics] = useState<Record<string, string>>({});
  const [characterCosmeticLoading, setCharacterCosmeticLoading] = useState(false);

  // モーダル内部でのインライン選択中スロット枠 index (0~6: 装備, 0~5: スキル)
  const [selectedEquipSlotIdx, setSelectedEquipSlotIdx] = useState<number | null>(null);
  const [selectedSkillSlotIdx, setSelectedSkillSlotIdx] = useState<number | null>(null);
  const [formationEditMode, setFormationEditMode] = useState(false);

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
  const maxSkillSlots = Math.min(6, 3 + awakeningLevel);

  // 見た目の豪華さは、テストアカウントではなく実際に装着されている編成から判定する。
  // 本番アセット確定後に色を調整しても、この到達度判定とレイヤー構成は共通で使える。
  const equippedGearBySlot = useMemo(() => {
    const equipped = new Map<number, any>();
    if (!activeCharRecord?.id) return equipped;
    (userEquipmentsList || []).forEach((item: any) => {
      if (item.equipped_character_id === activeCharRecord.id && typeof item.slot_index === "number") {
        equipped.set(item.slot_index, item);
      }
    });
    return equipped;
  }, [activeCharRecord?.id, userEquipmentsList]);

  const equippedSkillsBySlot = useMemo(() => {
    const equipped = new Map<number, any>();
    if (!activeCharRecord?.id) return equipped;
    (userSkillsList || []).forEach((item: any) => {
      if (item.equipped_character_id === activeCharRecord.id && typeof item.slot_index === "number") {
        equipped.set(item.slot_index, item);
      }
    });
    return equipped;
  }, [activeCharRecord?.id, userSkillsList]);

  const loadoutState = useMemo(() => {
    const gear = Array.from(equippedGearBySlot.values());
    const skills = Array.from(equippedSkillsBySlot.entries())
      .filter(([slot]) => slot < maxSkillSlots)
      .map(([, item]) => item);
    const isSsrGear = gear.length === GEAR_SLOTS_MASTER.length && gear.every((item) =>
      EQUIPMENTS_MASTER_DATA.find((master: any) => master.id === item.equipment_id)?.rarity === "SSR"
    );
    const isSsrSkills = skills.length === maxSkillSlots && skills.every((item) =>
      SKILLS_MASTER_DATA.find((master: any) => master.id === item.skill_id)?.rarity === "SSR"
    );
    const averagePlus = [...gear, ...skills].reduce((total, item) => total + (item.plus_val || 0), 0) / Math.max(1, gear.length + skills.length);
    const isMax = isSsrGear && isSsrSkills && awakeningLevel >= 3 && averagePlus >= 8;
    const isComplete = gear.length === GEAR_SLOTS_MASTER.length && skills.length === maxSkillSlots;
    const tier = isMax ? "MAX" : isComplete ? "COMPLETE" : gear.length + skills.length >= 5 ? "GROWING" : "BASE";
    return { gearCount: gear.length, skillCount: skills.length, tier, isMax };
  }, [awakeningLevel, equippedGearBySlot, equippedSkillsBySlot, maxSkillSlots]);

  const partyMembers = useMemo(() => selectedMembers.slice(0, 5).map((characterId: string) => {
    const record = (userCharactersDbList || []).find((item: any) => item.character_id === characterId);
    const master = CHARACTERS_MASTER.find((item: any) => item.id === characterId);
    return { characterId, record, master };
  }), [selectedMembers, userCharactersDbList]);

  useEffect(() => {
    const characterId = activeCharRecord?.id;
    if (!session?.user?.id || !characterId) {
      return;
    }
    const loadCharacterCosmetics = async () => {
      const slotPrefix = `CHARACTER:${characterId}:`;
      const [{ data: owned, error: ownedError }, { data: equipped, error: equippedError }] = await Promise.all([
        supabase.from("character_cosmetics").select("cosmetic_id, cosmetic_master(slot, display_name, rarity)").eq("user_character_id", characterId),
        supabase.from("equipped_cosmetics").select("slot, cosmetic_id").eq("user_id", session.user.id).like("slot", `${slotPrefix}%`)
      ]);
      if (ownedError || equippedError) {
        console.warn("Character cosmetics are unavailable:", ownedError?.message || equippedError?.message);
        return;
      }
      setCharacterCosmetics((owned || []).map((item) => ({
        cosmetic_id: item.cosmetic_id,
        cosmetic_master: Array.isArray(item.cosmetic_master) ? (item.cosmetic_master[0] || null) : item.cosmetic_master
      })) as Array<{ cosmetic_id: string; cosmetic_master: { slot: string; display_name: string; rarity: string } | null }>);
      setEquippedCharacterCosmetics(Object.fromEntries((equipped || []).map((item) => [item.slot.replace(slotPrefix, ""), item.cosmetic_id])));
    };
    void loadCharacterCosmetics();
  }, [activeCharRecord?.id, session?.user?.id]);

  const getCharacterCosmeticsForSlot = (slot: string) => characterCosmetics.filter((item) => item.cosmetic_master?.slot === slot);
  const getEquippedCharacterCosmetic = (slot: string, fallback: string) => equippedCharacterCosmetics[slot] || fallback;
  const equipCharacterCosmetic = async (slot: string, cosmeticId: string) => {
    if (!activeCharRecord?.id) return;
    setCharacterCosmeticLoading(true);
    try {
      const { error } = await supabase.rpc("equip_character_cosmetic", {
        p_user_character_id: activeCharRecord.id,
        p_slot: slot,
        p_cosmetic_id: cosmeticId
      });
      if (error) throw error;
      setEquippedCharacterCosmetics((current) => ({ ...current, [slot]: cosmeticId }));
      playCyberSe("click");
    } catch (error) {
      console.warn("Character cosmetic equip failed:", error);
    } finally {
      setCharacterCosmeticLoading(false);
    }
  };

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

  // キャラ画面は個人ホーム装飾ではなく、現在地に対応する既存ステージ背景を使う。
  const stageBackgroundByBase: Record<string, string> = {
    shinjuku: "/bg/bg_base_neontower.png",
    neontower: "/bg/bg_base_neontower.png",
    shibuya: "/bg/bg_base_deepdock.png",
    deepdock: "/bg/bg_base_deepdock.png",
    ikebukuro: "/bg/bg_base_junkbazaar.png",
    junkbazaar: "/bg/bg_base_junkbazaar.png",
    roppongi: "/bg/bg_base_kitakuragate.png",
    kitakuragate: "/bg/bg_base_kitakuragate.png"
  };
  const bgImgUrl = stageBackgroundByBase[currentBaseId] || "/bg/bg_base_neontower.png";

  // --------------------------------------------------------------------------
  // 装備スロット レンダリング補助 (左右 7スロット)
  // --------------------------------------------------------------------------
  const renderEquipSlot = (slotDef: any) => {
    // 比較には DBレコードの UUID (activeCharRecord.id) を使用
    const previewGear = equippedGearBySlot.get(slotDef.index) || null;
    const gearMaster = previewGear ? EQUIPMENTS_MASTER_DATA.find((m: any) => m.id === previewGear.equipment_id) : null;
    const rarity = (gearMaster?.rarity || "N").toUpperCase();

    let rarityClass = "slot-n";
    let ribbonClass = "ribbon-n";

    if (rarity === "SSR") { rarityClass = "slot-ssr"; ribbonClass = "ribbon-ssr"; }
    else if (rarity === "SR") { rarityClass = "slot-sr"; ribbonClass = "ribbon-sr"; }
    else if (rarity === "R") { rarityClass = "slot-r"; ribbonClass = "ribbon-r"; }

    return (
      <div
        key={slotDef.index}
        className={`char-equip-slot ${previewGear ? rarityClass : "slot-empty"} active-scale-effect`}
        onClick={() => {
          setSelectedEquipSlotIdx(slotDef.index);
          setBottomModalTab("GEAR");
          playCyberSe("click");
        }}
      >
        <div className="slot-header-row">
          <span className="slot-label">{slotDef.label}</span>
          {previewGear && (
            <span className={`slot-rarity-ribbon ${ribbonClass}`}>{rarity}</span>
          )}
        </div>

        {previewGear ? (
          <>
            <div className="slot-gear-name">{gearMaster?.name || previewGear.equipment_id}</div>
            <div className="slot-footer-row">
              <span className="slot-gear-lv">Lv.{previewGear.level}</span>
              {previewGear.plus_val > 0 && (
                <span className="slot-plus-badge">+{previewGear.plus_val}</span>
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
  return (
    <div className="char-tab-container">
      <div className="flex justify-end mb-2">
        <button className="sub-btn border-cyan-subtle font-size-8 height-26 px-3 active-scale-effect" onClick={() => void handleAutoFormation({ navigateAfter: false })}>
          おまかせ編成
        </button>
      </div>
      <section className={`char-party-panel ${formationEditMode ? "is-editing" : ""}`} aria-label="出撃パーティ編成">
        <div className="char-party-header">
          <div>
            <span className="char-party-eyebrow">PARTY</span>
            <strong>出撃編成 <em>{partyMembers.length}/5</em></strong>
          </div>
          <button
            className="char-party-edit-btn active-scale-effect"
            onClick={() => { setFormationEditMode((current) => !current); playCyberSe("click"); }}
          >
            {formationEditMode ? "完了" : "編成編集"}
          </button>
        </div>
        <div className="char-party-slots">
          {Array.from({ length: 5 }).map((_, index) => {
            const member = partyMembers[index];
            return member?.master ? (
              <button
                key={`${member.characterId}-${index}`}
                className={`char-party-slot ${member.characterId === activeCharMaster.id ? "is-active" : ""} active-scale-effect`}
                onClick={() => {
                  setUpgradeSelectedCharId(member.characterId);
                  if (formationEditMode) void handleTogglePartyMember(member.characterId);
                  else playCyberSe("click");
                }}
                title={formationEditMode ? `${member.master.jpName}を編成から外す` : member.master.jpName}
              >
                <img src={getCharacterTransparentImg(member.master.name)} alt="" />
                <span>{index + 1}</span>
              </button>
            ) : <div className="char-party-slot is-empty" key={`empty-${index}`}><span>{index + 1}</span><b>＋</b></div>;
          })}
        </div>
        {formationEditMode && <p className="char-party-edit-help">所持キャラをタップして、出撃メンバーに追加／解除します。</p>}
      </section>
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
                  if (formationEditMode) {
                    void handleTogglePartyMember(uc.character_id);
                  } else {
                    setUpgradeSelectedCharId(uc.character_id);
                    playCyberSe("click");
                  }
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

      <div className="char-firstview-skills" aria-label="装着スキル">
        {Array.from({ length: 6 }).map((_, slotIdx) => {
          const skillRecord = equippedSkillsBySlot.get(slotIdx);
          const skillMaster = skillRecord ? SKILLS_MASTER_DATA.find((item: any) => item.id === skillRecord.skill_id) : null;
          const unlocked = slotIdx < maxSkillSlots;
          return (
            <button
              key={slotIdx}
              className={`char-firstview-skill ${skillMaster ? `is-${(skillMaster.rarity || "N").toLowerCase()}` : ""} ${!unlocked ? "is-locked" : ""} active-scale-effect`}
              onClick={() => {
                if (!unlocked) return;
                setSelectedSkillSlotIdx(slotIdx);
                setBottomModalTab("SKILL");
                playCyberSe("click");
              }}
            >
              <span>SK{slotIdx + 1}</span>
              <strong>{unlocked ? (skillMaster?.name || "未装着") : "LOCK"}</strong>
            </button>
          );
        })}
      </div>

      {/* 2. 中央: 大画面5層レイヤーキャンバス (高さ360px絶対固定) */}
      <div className={`char-main-stage char-rarity-${characterRarity} char-loadout-${loadoutState.tier.toLowerCase()} ${loadoutState.isMax ? "char-loadout-max" : ""} char-style-${getEquippedCharacterCosmetic("CHARACTER_FRAME", "char_frame_none")} char-aura-style-${getEquippedCharacterCosmetic("CHARACTER_AURA", "char_aura_none")} `}>
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
        {loadoutState.isMax && <div className="char-max-loadout-effect" aria-hidden="true" />}
        <div className="char-cosmetic-aura" aria-hidden="true" />

        {/* Z-50: 最前面1行コンパクトHUD (被り100%排除) */}
        <div className={`char-hud-header-single char-plate-style-${getEquippedCharacterCosmetic("CHARACTER_NAMEPLATE", "char_plate_none")} `}>
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

        {/* 装備導線: 個人ホーム背景とは切り分け、キャラ画面では装備変更を開く。 */}
        <button
          className="char-bg-change-btn active-scale-effect"
          onClick={() => {
            setBottomModalTab("GEAR");
            playCyberSe("click");
          }}
          title="装備変更"
        >
          装備
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

      <div className="char-loadout-progress" aria-label="現在の編成到達度">
        <span>装備 {loadoutState.gearCount}/{GEAR_SLOTS_MASTER.length}</span>
        <span>スキル {loadoutState.skillCount}/{maxSkillSlots}</span>
        <strong>{loadoutState.tier === "MAX" ? "MAX LOADOUT" : loadoutState.tier === "COMPLETE" ? "編成完成" : "編成中"}</strong>
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
        <button
          className={`char-main-action-btn ${bottomModalTab === "STYLE" ? "active" : ""} active-scale-effect`}
          onClick={() => { setBottomModalTab("STYLE"); playCyberSe("click"); }}
        >
          演出
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
                <button
                  className={`char-modal-tab-btn ${bottomModalTab === "STYLE" ? "active" : ""}`}
                  onClick={() => { setBottomModalTab("STYLE"); playCyberSe("click"); }}
                >
                  演出
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

            {bottomModalTab === "STYLE" && (
              <div className="char-style-panel">
                <p className="char-style-help">このキャラだけに適用する見た目の装飾です。能力値・戦力には影響しません。</p>
                {[
                  ["CHARACTER_AURA", "オーラ", "char_aura_none"],
                  ["CHARACTER_FRAME", "ステージ枠", "char_frame_none"],
                  ["CHARACTER_NAMEPLATE", "ネームプレート", "char_plate_none"]
                ].map(([slot, label, fallback]) => {
                  const options = getCharacterCosmeticsForSlot(slot);
                  const value = getEquippedCharacterCosmetic(slot, fallback);
                  return <label className="char-style-field" key={slot}>{label}<select value={value} disabled={characterCosmeticLoading || options.length === 0} onChange={(event) => void equipCharacterCosmetic(slot, event.target.value)}>{options.map((item) => <option key={item.cosmetic_id} value={item.cosmetic_id}>{item.cosmetic_master?.display_name || item.cosmetic_id} [{item.cosmetic_master?.rarity || "COMMON"}]</option>)}</select></label>;
                })}
              </div>
            )}

            {/* モーダルコンテンツ: タブB スキルデッキ */}
            {bottomModalTab === "SKILL" && (
              <div>
                <div className="char-skills-grid">
                  {Array.from({ length: 6 }).map((_, slotIdx) => {
                    const isUnlocked = slotIdx < maxSkillSlots;
                    const previewSkillRecord = equippedSkillsBySlot.get(slotIdx) || null;
                    const skillMaster = previewSkillRecord ? SKILLS_MASTER_DATA.find((m: any) => m.id === previewSkillRecord.skill_id) : null;
                    const skillRarity = (skillMaster?.rarity || "N").toLowerCase();
                    
                    const isSynergy = skillMaster && (skillMaster as any).exclusive_character_id === activeCharMaster.id;
                    const limitBreakPlus = previewSkillRecord?.plus_val || 0;

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
                          previewSkillRecord && skillMaster ? (
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
