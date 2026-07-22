"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./GachaTab.css";

export default function GachaTab() {
  const { handleScout, gachaMasters, userCharactersDbList } = useGame();

  const isTutorial = !userCharactersDbList || userCharactersDbList.length === 0;

  // 各種マスタデータの参照
  const normalGacha = gachaMasters?.find((g: any) => g.id === "CHAR_NORMAL");
  const exGacha = gachaMasters?.find((g: any) => g.id === "CHAR_EX");
  const limitGacha = gachaMasters?.find((g: any) => g.id === "CHAR_LIMIT");
  const tutorialGacha = gachaMasters?.find((g: any) => g.id === "CHAR_TUTORIAL");

  return (
    <div className="view-container relative">
      <h2 className="view-title">スカウト (ガチャ)</h2>

      {/* 🎰 チュートリアル100連無料ガチャの強制ガード */}
      {isTutorial ? (
        <div className="gacha-tutorial-overlay flex flex-col items-center justify-center p-6 text-center">
          <div className="tutorial-modal-card border-cyan shadow-cyan-20 max-w-sm w-full p-6 background-black-90 border-cyan-glow">
            <h3 className="font-size-14 text-color-cyan font-weight-bold mb-2 tracking-wider">
              TUTORIAL SCOUT
            </h3>
            <p className="font-size-8 text-secondary mb-4 line-height-14">
              抗争に参入するための最初の構成員をスカウトします。<br/>
              チュートリアル限定で、**無料で100連**スカウトを実行できます！
            </p>
            <button 
              className="claim-reward-btn active-scale-effect font-weight-bold py-3 width-100 font-size-9 tutorial-gacha-btn"
              onClick={() => handleScout("CHAR_TUTORIAL", 100, "DIAMOND")}
            >
              無料で100連を引く
            </button>
          </div>
        </div>
      ) : null}

      <div className={`scroll-container flex-1 flex-col-gap-3 ${isTutorial ? "filter-blur" : ""}`}>
        
        {/* 構成員 (キャラクター) ガチャセクション */}
        <div className="gacha-section-title font-size-9 font-weight-bold text-white border-bottom-subtle pb-1">
          構成員スカウト (キャラクター)
        </div>

        {/* 1. 定常構成員ガチャ */}
        <div className="upgrade-card border-cyan">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span>定常構成員ガチャ</span>
            <span className="font-size-8 text-secondary">全構成員が均等確率で出現</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">新たな構成員（キャラクター）をスカウトして、組織の戦力を拡張します。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => handleScout("CHAR_NORMAL", 1, "CASH")}>
              1回 (金 {(normalGacha?.cost_cash || 50000).toLocaleString()})
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => handleScout("CHAR_NORMAL", 10, "CASH")}>
              10回 (金 {((normalGacha?.cost_cash || 50000) * 10).toLocaleString()})
            </button>
          </div>
          <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle" onClick={() => handleScout("CHAR_NORMAL", 1, "DIAMOND")}>
              1回 (ダイヤ {normalGacha?.cost_diamond || 100})
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle" onClick={() => handleScout("CHAR_NORMAL", 10, "DIAMOND")}>
              10回 (ダイヤ {(normalGacha?.cost_diamond || 100) * 10})
            </button>
          </div>
        </div>

        {/* 2. 有償限定構成員ガチャ */}
        <div className="upgrade-card border-magenta gacha-border-magenta">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-magenta">有償限定構成員ガチャ</span>
            <span className="font-size-8 text-color-magenta font-weight-bold">10連でおまけ付き</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">有償ダイヤ限定。10連スカウト実行時に、おまけとして「抗争の掟 x1」を獲得できます。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-magenta-outline" onClick={() => handleScout("CHAR_EX", 1, "DIAMOND")}>
              1回 (ダイヤ {exGacha?.cost_pay_diamond || 100})
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-magenta-outline" onClick={() => handleScout("CHAR_EX", 10, "DIAMOND")}>
              10回 (ダイヤ {(exGacha?.cost_pay_diamond || 100) * 10})
            </button>
          </div>
        </div>

        {/* 3. 期間限定ピックアップ構成員ガチャ */}
        <div className="upgrade-card gacha-limit-card border-warning">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-warning">【期間限定】情報屋ルイ ピックアップガチャ</span>
            <span className="font-size-8 font-weight-bold text-color-warning">〜7/31まで</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">ルイ専用。情報屋ルイ（SSR）の出現率が大幅にアップしている特別なスカウトです。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline" onClick={() => handleScout("CHAR_LIMIT", 1, "DIAMOND")}>
              1回 (ダイヤ {limitGacha?.cost_diamond || 120})
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline" onClick={() => handleScout("CHAR_LIMIT", 10, "DIAMOND")}>
              10回 (ダイヤ {(limitGacha?.cost_diamond || 120) * 10})
            </button>
          </div>
        </div>

        {/* スキル・装備ガチャセクション */}
        <div className="gacha-section-title font-size-9 font-weight-bold text-white border-bottom-subtle pb-1 mt-2">
          戦術拡張 (スキル ＆ 装備品)
        </div>

        {/* スキルカードガチャ */}
        <div className="upgrade-card border-cyan">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span>定常スキルカードガチャ</span>
            <span className="font-size-8 text-secondary">N〜SSR排出</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">スキルカードを獲得し、戦闘時の戦術を拡張します。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => handleScout("SKILL", 1, "CASH")}>
              1回 (金10,000)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => handleScout("SKILL", 10, "CASH")}>
              10回 (金100,000)
            </button>
          </div>
          <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle" onClick={() => handleScout("SKILL", 1, "DIAMOND")}>
              1回 (ダイヤ30)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle" onClick={() => handleScout("SKILL", 10, "DIAMOND")}>
              10回 (ダイヤ300)
            </button>
          </div>
        </div>

        {/* スキルカードガチャ (有償限定) */}
        <div className="upgrade-card border-magenta gacha-border-magenta">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-magenta">スキルカードガチャ (有償限定)</span>
            <span className="font-size-8 text-color-magenta font-weight-bold">SSR 8% ｜ Nなし</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">有償ダイヤ限定。SR以上確定、SSR確率が大幅に上昇しています。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-magenta-outline" onClick={() => handleScout("SKILL_EX", 1, "DIAMOND")}>
              1回 (ダイヤ30)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-magenta-outline" onClick={() => handleScout("SKILL_EX", 10, "DIAMOND")}>
              10回 (ダイヤ300)
            </button>
          </div>
        </div>

        {/* 装備品ガチャ */}
        <div className="upgrade-card border-cyan">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span>定常装備品ガチャ</span>
            <span className="font-size-8 text-secondary">N〜SSR排出</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">武器、防具、アクセサリーなどのハクスラ装備を獲得します。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => handleScout("EQUIP", 1, "CASH")}>
              1回 (金10,000)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => handleScout("EQUIP", 10, "CASH")}>
              10回 (金100,000)
            </button>
          </div>
          <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle" onClick={() => handleScout("EQUIP", 1, "DIAMOND")}>
              1回 (ダイヤ30)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 border-cyan-subtle" onClick={() => handleScout("EQUIP", 10, "DIAMOND")}>
              10回 (ダイヤ300)
            </button>
          </div>
        </div>

        {/* 装備品ガチャ (有償限定) */}
        <div className="upgrade-card border-magenta gacha-border-magenta">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-magenta">装備品ガチャ (有償限定)</span>
            <span className="font-size-8 text-color-magenta font-weight-bold">SSR 8% ｜ Nなし</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">有償ダイヤ限定。強力なサブオプション付き装備の排出率アップ。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-magenta-outline" onClick={() => handleScout("EQUIP_EX", 1, "DIAMOND")}>
              1回 (ダイヤ30)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-magenta-outline" onClick={() => handleScout("EQUIP_EX", 10, "DIAMOND")}>
              10回 (ダイヤ300)
            </button>
          </div>
        </div>

        {/* 期間限定ガチャ (電子の女王 ＆ 漆黒のギア) */}
        <div className="upgrade-card gacha-limit-card">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-warning">【期間限定】電子の女王スキルガチャ</span>
            <span className="font-size-8 font-weight-bold text-color-warning">〜7/31まで</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">ルイ専用SSRスキル「ライトニング・グリッド」のピックアップ。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline" onClick={() => handleScout("LIMIT_SKILL", 1, "DIAMOND")}>
              1回 (ダイヤ40)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline" onClick={() => handleScout("LIMIT_SKILL", 10, "DIAMOND")}>
              10回 (ダイヤ400)
            </button>
          </div>
        </div>

        <div className="upgrade-card gacha-limit-card">
          <div className="upgrade-card-title flex items-center justify-between gacha-title-row">
            <span className="text-color-warning">【期間限定】漆黒のギア装備ガチャ</span>
            <span className="font-size-8 font-weight-bold text-color-warning">〜7/31まで</span>
          </div>
          <div className="font-size-8 text-gray-400 mt-1">レオン、ユウキ専用SSR武器の出現率アップ。キャッシュでも引けます。</div>
          <div className="flex gap-2 mt-3 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => handleScout("LIMIT_EQUIP", 1, "CASH")}>
              1回 (金12,000)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => handleScout("LIMIT_EQUIP", 10, "CASH")}>
              10回 (金120,000)
            </button>
          </div>
          <div className="flex gap-2 mt-2 gacha-btn-layout">
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline" onClick={() => handleScout("LIMIT_EQUIP", 1, "DIAMOND")}>
              1回 (ダイヤ40)
            </button>
            <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 gacha-warning-outline" onClick={() => handleScout("LIMIT_EQUIP", 10, "DIAMOND")}>
              10回 (ダイヤ400)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
