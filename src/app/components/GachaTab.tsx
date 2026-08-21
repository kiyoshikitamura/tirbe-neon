"use client";

import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { CHARACTERS_MASTER } from "../../utils/game_constants";
import { CANONICAL_SKILL_VIEW } from "../../utils/skills_master_data";
import { CANONICAL_EQUIPMENT_VIEW } from "../../utils/equipments_master_data";
import TutorialNavigator from "./TutorialNavigator";
import { useImmediateActionLock } from "@/hooks/useImmediateActionLock";
import "./GachaTab.css";

export default function GachaTab() {
  const {
    handleScout,
    featureOperatingStates,
    gachaMasters,
    dailyFreeGachaFlags,
    specialPityPoints,
    handleExchangePityReward,
    userItems,
    activeBanners,
    upgradeLoading,
    onboardingState,
    setScoutAnimationState,
    playSe
  } = useGame();
  const isTutorialScout = onboardingState?.tutorial_step === "FREE_GACHA";

  // 現在のカテゴリタブ ('CHARACTER' | 'SKILL' | 'EQUIPMENT')
  const [activeCategory, setActiveCategory] = useState<"CHARACTER" | "SKILL" | "EQUIPMENT">("CHARACTER");
  // 天井SSR任意選択モーダルの開閉状態
  const [showPityModal, setShowPityModal] = useState<boolean>(false);
  const [selectedPityRewardId, setSelectedPityRewardId] = useState<string>("");
  const { isLocked: isGachaActionLocked, beginAction, endAction } = useImmediateActionLock();

  const runScout = async (
    gachaId: string,
    count: number,
    currency: "CASH" | "DIAMOND" | "FREE" | "TICKET"
  ) => {
    if (!beginAction()) return;
    playSe("GACHA_START");
    // Lock and acknowledge the tap before waiting for the authoritative result.
    setScoutAnimationState("FLASHING");
    try {
      await handleScout(gachaId, count, currency);
    } finally {
      endAction();
    }
  };

  const normalGachaTickets = userItems?.find((i: any) => i.item_id === "NORMAL_GACHA_TICKET")?.quantity || 0;
  const specialGachaTickets = userItems?.find((i: any) => i.item_id === "SPECIAL_GACHA_TICKET")?.quantity || 0;
  const isSpecialGachaOpen = featureOperatingStates?.SPECIAL_GACHA === "OPEN";

  const categoryAvailability = {
    CHARACTER: Boolean(gachaMasters?.some((g: any) => g.id === "CHAR_NORMAL")),
    SKILL: Boolean(gachaMasters?.some((g: any) => g.id === "SKILL_NORMAL")),
    EQUIPMENT: Boolean(gachaMasters?.some((g: any) => g.id === "EQUIP_NORMAL"))
  };

  // Character masters are not yet finalized for Open Beta. Keep the screen
  // usable by selecting the first category backed by a real server-side pool.
  useEffect(() => {
    if (!gachaMasters?.length || categoryAvailability[activeCategory]) return;
    if (categoryAvailability.SKILL) setActiveCategory("SKILL");
    else if (categoryAvailability.EQUIPMENT) setActiveCategory("EQUIPMENT");
  }, [activeCategory, categoryAvailability.EQUIPMENT, categoryAvailability.SKILL, categoryAvailability.CHARACTER, gachaMasters?.length]);

  const hasDailyFree = dailyFreeGachaFlags[activeCategory];
  const gachaPrefix = activeCategory === "CHARACTER" ? "CHAR" : activeCategory === "EQUIPMENT" ? "EQUIP" : "SKILL";
  const normalGachaId = `${gachaPrefix}_NORMAL`;
  const specialGachaId = `${gachaPrefix}_SPECIAL`;
  const normalGacha = gachaMasters?.find((g: any) => g.id === normalGachaId);
  const specialGacha = gachaMasters?.find((g: any) => g.id === specialGachaId);
  const formatCost = (value: unknown, pulls = 1) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? (numeric * pulls).toLocaleString("ja-JP") : "--";
  };

  // 天井選択肢リスト（SSRのみ）
  const ssrCharacters = CHARACTERS_MASTER.filter((c: any) => c.rarity === "SSR");
  const ssrSkills = CANONICAL_SKILL_VIEW.filter((s: any) => s.rarity === "SSR");
  const ssrEquipments = CANONICAL_EQUIPMENT_VIEW.filter((e: any) => e.rarity === "SSR");

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

  if (isTutorialScout) {
    return (
      <fieldset className="view-container relative gacha-view-root gacha-action-fieldset tutorial-gacha-page" disabled={upgradeLoading || isGachaActionLocked} aria-busy={upgradeLoading || isGachaActionLocked}>
        <TutorialNavigator message={<>ここでは、ガチャで仲間を増やせるよ。<br />まずは10連、引いてみよ。</>} />
        <section className="tutorial-gacha-hero" aria-labelledby="tutorial-gacha-title">
          <img className="tutorial-gacha-banner" src="/gacha/bg_gacha_ssr.png" alt="" />
          <h2 id="tutorial-gacha-title">無料10連ガチャ</h2>
        </section>
        <section className="tutorial-gacha-offer" aria-label="チュートリアル無料10連">
          <div className="tutorial-gacha-benefits">
            <span><b>10連</b>無料</span>
          </div>
          <button
            className="semantic-cta semantic-cta--primary gacha-free-btn"
            aria-label="無料10連を引く"
            onClick={() => void runScout(normalGachaId, 10, "FREE")}
            disabled={!normalGacha || !hasDailyFree || isGachaActionLocked}
            aria-busy={isGachaActionLocked}
          >
            <span>無料10連を引く</span>
          </button>
        </section>
      </fieldset>
    );
  }

  return (
    <fieldset className="view-container relative gacha-view-root gacha-action-fieldset" disabled={upgradeLoading || isGachaActionLocked} aria-busy={upgradeLoading || isGachaActionLocked}>
      <header className="gacha-v0-header">
        <div>
          <span className="gacha-v0-eyebrow">ガチャ</span>
          <h2>ガチャ</h2>
          <p>新しい仲間と力を手に入れろ。</p>
        </div>
        <span className="gacha-v0-pulse" aria-hidden="true" />
      </header>

      {/* 🎰 カテゴリ切替タブ (キャラ / スキル / 装備) */}
      {!isTutorialScout && <div className="gacha-category-tabs flex gap-2 mb-3">
        <button
          className={`gacha-tab-btn flex-1 py-2 font-weight-bold font-size-8 active-scale-effect relative ${
            activeCategory === "CHARACTER" ? "active-tab-char" : ""
          }`}
          onClick={() => setActiveCategory("CHARACTER")}
          disabled={!categoryAvailability.CHARACTER}
          title={!categoryAvailability.CHARACTER ? "キャラクターガチャは準備中です" : undefined}
        >
          キャラクター{!categoryAvailability.CHARACTER && "（準備中）"}
          {dailyFreeGachaFlags.CHARACTER && <span className="free-badge-dot">無料</span>}
        </button>

        <button
          className={`gacha-tab-btn flex-1 py-2 font-weight-bold font-size-8 active-scale-effect relative ${
            activeCategory === "SKILL" ? "active-tab-skill" : ""
          }`}
          onClick={() => setActiveCategory("SKILL")}
        >
          スキル
          {dailyFreeGachaFlags.SKILL && <span className="free-badge-dot">無料</span>}
        </button>

        <button
          className={`gacha-tab-btn flex-1 py-2 font-weight-bold font-size-8 active-scale-effect relative ${
            activeCategory === "EQUIPMENT" ? "active-tab-equip" : ""
          }`}
          onClick={() => setActiveCategory("EQUIPMENT")}
        >
          装備品
          {dailyFreeGachaFlags.EQUIPMENT && <span className="free-badge-dot">無料</span>}
        </button>
      </div>}

      {!isTutorialScout && <div className="gacha-coming-soon mb-3" aria-disabled="true">
        <strong>スペシャルガチャ</strong>
        <span>準備中</span>
      </div>}

      {isTutorialScout && (
        <div className="tutorial-step-panel" role="status">
          <TutorialNavigator message="最初の仲間を迎えよう。光っている「無料10連を引く」を押してね。" />
          <strong>STEP 1 / ノーマルガチャ</strong>
          <span>この10連ではCASH・ダイヤ・チケットを消費しません。</span>
        </div>
      )}

      {/* 🎰 メインガチャリスト (縦並び: 限定 ➔ スペシャル ➔ ノーマル) */}
      <div className="scroll-container flex-1 flex-col-gap-3 pb-6">

        {/* 1. 期間限定/ピックアップガチャ (マスタ連動) */}
        {!isTutorialScout && activeBanners?.filter((b: any) =>
          b.gacha_category === activeCategory
          && gachaMasters?.some((g: any) => g.id === b.id)
          && (isSpecialGachaOpen || !String(b.id).includes("SPECIAL"))
        ).map((banner: any) => {
          const bannerGacha = gachaMasters?.find((g: any) => g.id === banner.id);
          return (
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
                onClick={() => runScout(banner.id, 1, "DIAMOND")}
                disabled={!bannerGacha}
              >
                {bannerGacha ? `1回 (ダイヤ ${formatCost(bannerGacha.cost_diamond)})` : "準備中"}
              </button>
              <button
                className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline"
                onClick={() => runScout(banner.id, 10, "DIAMOND")}
                disabled={!bannerGacha}
              >
                {bannerGacha ? `10回 (ダイヤ ${formatCost(bannerGacha.cost_diamond, 10)})` : "準備中"}
              </button>
            </div>
          </div>
          );
        })}

        {/* 2. スペシャルガチャ (常設・R以上確定・200Pt天井) */}
        {!isTutorialScout && <div className={`upgrade-card border-magenta gacha-card-special ${isSpecialGachaOpen ? "" : "gacha-special-disabled"}`} aria-disabled={!isSpecialGachaOpen}>
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-magenta font-weight-bold">スペシャルガチャ</span>
            <span className="font-size-8 text-secondary font-weight-bold">{isSpecialGachaOpen ? "R以上確定 / SSR 5%" : "準備中"}</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">
            {isSpecialGachaOpen ? "R 60% / SR 35% / SSR 5%。無料10連の対象外です。" : "現在は利用できません。開始時はゲーム内でお知らせします。"}
          </div>
          {isSpecialGachaOpen && specialGacha && (
            <>
              <div className="flex gap-2 mt-3 gacha-btn-layout">
                <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => runScout(specialGachaId, 1, "CASH")}>1回（CASH {formatCost(specialGacha.cost_cash)}）</button>
                <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => runScout(specialGachaId, 10, "CASH")}>10回（CASH {formatCost(specialGacha.cost_cash, 10)}）</button>
              </div>
              <div className="flex gap-2 mt-3 gacha-btn-layout">
                <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => runScout(specialGachaId, 1, "DIAMOND")}>1回（ダイヤ {formatCost(specialGacha.cost_diamond)}）</button>
                <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => runScout(specialGachaId, 10, "DIAMOND")}>10回（ダイヤ {formatCost(specialGacha.cost_diamond, 10)}）</button>
              </div>
              <div className="flex gap-2 mt-2 gacha-btn-layout">
                <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => runScout(specialGachaId, 1, "TICKET")} disabled={specialGachaTickets < 1}>1回（専用チケット 1枚）</button>
                <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => runScout(specialGachaId, 10, "TICKET")} disabled={specialGachaTickets < 10}>10回（専用チケット 10枚）</button>
              </div>
            </>
          )}
        </div>}

        {/* 3. ノーマルガチャ (毎日10連無料 / N 50%, R 40%, SR 10%) */}
        <div className={`upgrade-card border-cyan gacha-card-normal ${isTutorialScout ? "tutorial-primary-target" : ""}`}>
          <div className="gacha-normal-visual" aria-hidden="true">
            <span>毎日無料</span>
            <strong>10</strong>
            <i>連</i>
          </div>
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-cyan font-weight-bold">
              {activeCategory === "CHARACTER" && "ノーマルガチャ"}
              {activeCategory === "SKILL" && "ノーマルスキルガチャ"}
              {activeCategory === "EQUIPMENT" && "ノーマル装備ガチャ"}
            </span>
            <span className="font-size-8 text-secondary">
              N 50% ｜ R 40% ｜ SR 10%
            </span>
          </div>
          <div className="gacha-normal-copy mt-1">
            毎日1回、10連無料。最初の仲間を迎えよう。
          </div>

          {/* 無料10連ボタン (未消化時のみ優先表示) */}
          {hasDailyFree ? (
            <div className="mt-3">
              <button
                className="semantic-cta semantic-cta--primary active-scale-effect width-100 gacha-free-btn"
                aria-label="無料10連を引く"
                onClick={() => void runScout(normalGachaId, 10, "FREE")}
                disabled={!normalGacha || isGachaActionLocked}
                aria-busy={isGachaActionLocked}
              >
                <span>{isGachaActionLocked ? "ガチャを準備しています" : "無料10連を引く"}</span>
                {!isGachaActionLocked && <small>消費なし</small>}
              </button>
            </div>
          ) : (
            <div className="font-size-8 text-color-cyan mt-2 text-center py-1 background-cyan-10 border-cyan-subtle">
              本日の無料10連は使用済みです
            </div>
          )}

          {/* 有料実行ボタン (キャッシュ) */}
          {!isTutorialScout && <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2"
              onClick={() => runScout(normalGachaId, 1, "CASH")}
              disabled={!normalGacha}
            >
              {normalGacha ? `1回 (金 ${formatCost(normalGacha.cost_cash)})` : "準備中"}
            </button>
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2"
              onClick={() => runScout(normalGachaId, 10, "CASH")}
              disabled={!normalGacha}
            >
              {normalGacha ? `10回 (金 ${formatCost(normalGacha.cost_cash, 10)})` : "準備中"}
            </button>
          </div>}

          {/* 有料実行ボタン (ダイヤ) */}
          {!isTutorialScout && <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle"
              onClick={() => runScout(normalGachaId, 1, "DIAMOND")}
              disabled={!normalGacha}
            >
              {normalGacha ? `1回 (ダイヤ ${formatCost(normalGacha.cost_diamond)})` : "準備中"}
            </button>
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle"
              onClick={() => runScout(normalGachaId, 10, "DIAMOND")}
              disabled={!normalGacha}
            >
              {normalGacha ? `10回 (ダイヤ ${formatCost(normalGacha.cost_diamond, 10)})` : "準備中"}
            </button>
          </div>}

          {/* チケット実行ボタン */}
          {!isTutorialScout && <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle"
              onClick={() => runScout(normalGachaId, 1, "TICKET")}
              disabled={!normalGacha || normalGachaTickets < 1}
            >
              1回 (チケット 1枚)
            </button>
            <button
              className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle"
              onClick={() => runScout(normalGachaId, 10, "TICKET")}
              disabled={!normalGacha || normalGachaTickets < 10}
            >
              10回 (チケット 10枚)
            </button>
          </div>}
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
    </fieldset>
  );
}
