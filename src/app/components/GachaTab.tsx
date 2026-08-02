"use client";

import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import { CHARACTERS_MASTER } from "../../utils/game_constants";
import { SKILLS_MASTER_DATA } from "../../utils/skills_master_data";
import { EQUIPMENTS_MASTER_DATA } from "../../utils/equipments_master_data";
import "./GachaTab.css";

export default function GachaTab() {
  const {
    handleScout,
    gachaMasters,
    dailyFreeGachaFlags,
    specialPityPoints,
    handleExchangePityReward,
    cash,
    diamonds,
    userItems,
    activeBanners
  } = useGame();

  // 現在のカテゴリタブ ('CHARACTER' | 'SKILL' | 'EQUIPMENT')
  const [activeCategory, setActiveCategory] = useState<"CHARACTER" | "SKILL" | "EQUIPMENT">("CHARACTER");
  // 天井SSR任意選択モーダルの開閉状態
  const [showPityModal, setShowPityModal] = useState<boolean>(false);
  const [selectedPityRewardId, setSelectedPityRewardId] = useState<string>("");

  const gachaTickets = userItems?.find((i: any) => i.item_id === "GACHA_TICKET")?.quantity || 0;

  // 期間限定ガチャの有無判定
  const limitCharGacha = gachaMasters?.find((g: any) => g.id === "CHAR_LIMIT");
  const limitSkillGacha = gachaMasters?.find((g: any) => g.id === "LIMIT_SKILL");
  const limitEquipGacha = gachaMasters?.find((g: any) => g.id === "LIMIT_EQUIP");

  const hasDailyFree = dailyFreeGachaFlags[activeCategory];

  // 天井選択肢リスト（SSRのみ）
  const ssrCharacters = CHARACTERS_MASTER.filter((c: any) => c.rarity === "SSR");
  const ssrSkills = SKILLS_MASTER_DATA.filter((s: any) => s.rarity === "SSR");
  const ssrEquipments = EQUIPMENTS_MASTER_DATA.filter((e: any) => e.rarity === "SSR");

  const getPityPool = () => {
    if (activeCategory === "CHARACTER") return ssrCharacters;
    if (activeCategory === "SKILL") return ssrSkills;
    return ssrEquipments;
  };

  const handleConfirmPityExchange = () => {
    if (!selectedPityRewardId) return;
    handleExchangePityReward(activeCategory, selectedPityRewardId);
    setShowPityModal(false);
    setSelectedPityRewardId("");
  };

  return (
    <div className="view-container relative gacha-view-root">
      <h2 className="view-title">スカウト (ガチャ)</h2>

      {/* 🎰 カテゴリ切替タブ (キャラ / スキル / 装備) */}
      <div className="gacha-category-tabs flex gap-2 mb-3">
        <button
          className={`gacha-tab-btn flex-1 py-2 font-weight-bold font-size-8 active-scale-effect relative ${
            activeCategory === "CHARACTER" ? "active-tab-char" : ""
          }`}
          onClick={() => setActiveCategory("CHARACTER")}
        >
          キャラクター
          {dailyFreeGachaFlags.CHARACTER && <span className="free-badge-dot">FREE</span>}
        </button>

        <button
          className={`gacha-tab-btn flex-1 py-2 font-weight-bold font-size-8 active-scale-effect relative ${
            activeCategory === "SKILL" ? "active-tab-skill" : ""
          }`}
          onClick={() => setActiveCategory("SKILL")}
        >
          スキル
          {dailyFreeGachaFlags.SKILL && <span className="free-badge-dot">FREE</span>}
        </button>

        <button
          className={`gacha-tab-btn flex-1 py-2 font-weight-bold font-size-8 active-scale-effect relative ${
            activeCategory === "EQUIPMENT" ? "active-tab-equip" : ""
          }`}
          onClick={() => setActiveCategory("EQUIPMENT")}
        >
          装備品
          {dailyFreeGachaFlags.EQUIPMENT && <span className="free-badge-dot">FREE</span>}
        </button>
      </div>

      {/* 🎰 天井Ptプログレスバー ＆ 交換所ボタン */}
      <div className="pity-status-card background-black-80 border-metal p-3 mb-3 flex items-center justify-between">
        <div className="flex-1 mr-3">
          <div className="flex justify-between items-center mb-1">
            <span className="font-size-8 text-secondary">スペシャルガチャ天井Pt</span>
            <span className="font-size-8 font-weight-bold text-color-cyan">
              {specialPityPoints} / 200 Pt
            </span>
          </div>
          <div className="pity-progress-track">
            <div
              className="pity-progress-bar"
              style={{ width: `${Math.min(100, (specialPityPoints / 200) * 100)}%` }}
            />
          </div>
        </div>
        <button
          className={`pity-exchange-btn py-2 px-3 active-scale-effect font-size-8 font-weight-bold ${
            specialPityPoints >= 200 ? "btn-pity-ready" : "btn-pity-disabled"
          }`}
          onClick={() => setShowPityModal(true)}
        >
          SSR任意選択
        </button>
      </div>

      {/* 🎰 メインガチャリスト (縦並び: 限定 ➔ スペシャル ➔ ノーマル) */}
      <div className="scroll-container flex-1 flex-col-gap-3 pb-6">

        {/* 1. 期間限定/ピックアップガチャ (マスタ連動) */}
        {activeBanners?.filter((b: any) => b.gacha_category === activeCategory).map((banner: any) => (
          <div key={banner.id} className="upgrade-card gacha-limit-card border-warning">
            <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
              <span className="text-color-warning">{banner.description || "【期間限定】特別ピックアップ"}</span>
              <span className="font-size-8 font-weight-bold text-color-warning">
                〜{new Date(banner.end_at).toLocaleDateString()}まで
              </span>
            </div>
            {banner.banner_image_url && (
              <div className="mt-2 text-center">
                {/* Fallback to simple text if image doesn't exist */}
                <div className="font-size-8 text-secondary">[バナー画像: {banner.banner_image_url}]</div>
              </div>
            )}
            <div className="flex gap-2 mt-3 gacha-btn-layout">
              <button
                className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline"
                onClick={() => handleScout(banner.id, 1, "DIAMOND")}
              >
                1回 (ダイヤ 40)
              </button>
              <button
                className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline"
                onClick={() => handleScout(banner.id, 10, "DIAMOND")}
              >
                10回 (ダイヤ 400)
              </button>
            </div>
          </div>
        ))}

        {/* 2. スペシャルガチャ (常設・R以上確定・200Pt天井) */}
        <div className="upgrade-card border-magenta gacha-card-special">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-magenta font-weight-bold">
              {activeCategory === "CHARACTER" && "スペシャルスカウト"}
              {activeCategory === "SKILL" && "スペシャルスキルガチャ"}
              {activeCategory === "EQUIPMENT" && "スペシャル装備ガチャ"}
            </span>
            <span className="font-size-8 text-color-magenta font-weight-bold">
              R以上確定 ｜ SSR 5%
            </span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">
            N出現なし。R 60% / SR 35% / SSR 5%。200Pt蓄積でSSRを任意選択可能！
          </div>

          {/* キャッシュ実行ボタン */}
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-magenta-outline"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_SPECIAL`, 1, "CASH")}
            >
              1回 (金 3,000)
            </button>
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-magenta-outline"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_SPECIAL`, 10, "CASH")}
            >
              10回 (金 30,000)
            </button>
          </div>

          {/* ダイヤ実行ボタン */}
          <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-magenta-subtle"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_SPECIAL`, 1, "DIAMOND")}
            >
              1回 (ダイヤ 300)
            </button>
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-magenta-subtle"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_SPECIAL`, 10, "DIAMOND")}
            >
              10回 (ダイヤ 3,000)
            </button>
          </div>
        </div>

        {/* 3. ノーマルガチャ (毎日10連無料 / N 50%, R 40%, SR 10%) */}
        <div className="upgrade-card border-cyan gacha-card-normal">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-cyan font-weight-bold">
              {activeCategory === "CHARACTER" && "ノーマルスカウト"}
              {activeCategory === "SKILL" && "ノーマルスキルガチャ"}
              {activeCategory === "EQUIPMENT" && "ノーマル装備ガチャ"}
            </span>
            <span className="font-size-8 text-secondary">
              N 50% ｜ R 40% ｜ SR 10%
            </span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">
            毎日1回10連が無料！基本構成員・スキル・装備品を獲得します。
          </div>

          {/* 無料10連ボタン (未消化時のみ優先表示) */}
          {hasDailyFree ? (
            <div className="mt-3">
              <button
                className="claim-reward-btn active-scale-effect width-100 py-3 font-weight-bold font-size-9 gacha-free-btn"
                onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_NORMAL`, 10, "FREE")}
              >
                毎日10連無料を引く
              </button>
            </div>
          ) : (
            <div className="font-size-8 text-color-cyan mt-2 text-center py-1 background-cyan-10 border-cyan-subtle">
              本日の無料10連は使用済みです
            </div>
          )}

          {/* 有料実行ボタン (キャッシュ) */}
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_NORMAL`, 1, "CASH")}
            >
              1回 (金 1,000)
            </button>
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_NORMAL`, 10, "CASH")}
            >
              10回 (金 10,000)
            </button>
          </div>

          {/* 有料実行ボタン (ダイヤ) */}
          <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_NORMAL`, 1, "DIAMOND")}
            >
              1回 (ダイヤ 100)
            </button>
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_NORMAL`, 10, "DIAMOND")}
            >
              10回 (ダイヤ 1,000)
            </button>
          </div>

          {/* チケット実行ボタン */}
          <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_NORMAL`, 1, "ticket")}
              disabled={gachaTickets < 1}
            >
              1回 (チケット 1枚)
            </button>
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle"
              onClick={() => handleScout(`${activeCategory === "CHARACTER" ? "CHAR" : activeCategory}_NORMAL`, 10, "ticket")}
              disabled={gachaTickets < 10}
            >
              10回 (チケット 10枚)
            </button>
          </div>
        </div>

      </div>

      {/* 🎰 SSR任意選択 (天井200Pt達成モーダル) */}
      {showPityModal && (
        <div className="common-modal-backdrop flex items-center justify-center p-4">
          <div className="common-modal-card background-black-90 border-cyan max-w-md width-100 p-5">
            <h3 className="font-size-11 text-color-cyan font-weight-bold mb-2">
              SSR任意選択所 (天井交換)
            </h3>
            <p className="font-size-8 text-secondary mb-4">
              スペシャルガチャPt (所持: {specialPityPoints} Pt) を200Pt消費して、任意のSSRアイテムを獲得できます。
            </p>

            <div className="pity-select-grid grid grid-cols-2 gap-2 max-height-300 overflow-y-auto mb-4 p-1">
              {getPityPool().map((item: any) => {
                const isSelected = selectedPityRewardId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`pity-item-card p-2 border-metal flex items-center gap-2 cursor-pointer active-scale-effect ${
                      isSelected ? "selected-pity-item" : ""
                    }`}
                    onClick={() => setSelectedPityRewardId(item.id)}
                  >
                    <div className="font-size-8 font-weight-bold text-white flex-1 truncate">
                      {item.jpName || item.name}
                    </div>
                    <div className="font-size-7 text-color-cyan font-weight-bold">
                      SSR
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button
                className="btn-secondary py-2 px-4 font-size-8"
                onClick={() => setShowPityModal(false)}
              >
                キャンセル
              </button>
              <button
                className={`py-2 px-4 font-size-8 font-weight-bold ${
                  specialPityPoints >= 200 && selectedPityRewardId
                    ? "claim-reward-btn active-scale-effect"
                    : "btn-pity-disabled"
                }`}
                onClick={handleConfirmPityExchange}
                disabled={specialPityPoints < 200 || !selectedPityRewardId}
              >
                200Ptで交換する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
