"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./ShopTab.css";

export default function ShopTab() {
  const {
    shopSubTab,
    setShopSubTab,
    handleBuyPack,
    triggerStripeWebhookSimulation,
    playCyberSe
  } = useGame();

  return (
    <div className="view-container">
      <h2 className="view-title">闇取引 (ショップ)</h2>
      <div className="tab-menu">
        <button 
          className={`tab-btn ${shopSubTab === "pack" ? "active" : ""}`} 
          onClick={() => { setShopSubTab("pack"); playCyberSe("click"); }}
        >
          パック商材
        </button>
        <button 
          className={`tab-btn ${shopSubTab === "diamond" ? "active" : ""}`} 
          onClick={() => { setShopSubTab("diamond"); playCyberSe("click"); }}
        >
          有償ダイヤ
        </button>
      </div>

      <div className="scroll-container flex-1">
        
        {shopSubTab === "pack" && (
          <div className="flex-col-gap-3">
            <div className="upgrade-card border-subtle">
              <div className="upgrade-card-title flex items-center justify-between shop-title-row">
                <span>初心者応援スタミナパック</span>
                <span className="font-size-8 text-secondary">ダイヤ 20</span>
              </div>
              <div className="font-size-8 text-gray-400 mt-1">クエストや抗争で使用するスタミナを回復する「エナジードリンク x2」を獲得します。</div>
              <button className="claim-reward-btn mt-3 active-scale-effect font-size-8 py-1.5" onClick={() => handleBuyPack("stamina")}>
                購入する
              </button>
            </div>

            <div className="upgrade-card border-subtle">
              <div className="upgrade-card-title flex items-center justify-between shop-title-row">
                <span>キャラクター覚醒パック</span>
                <span className="font-size-8 text-secondary">ダイヤ 50</span>
              </div>
              <div className="font-size-8 text-gray-400 mt-1">キャラクターのレベル上限解放に必要な「覚醒の書 x1」を獲得します。</div>
              <button className="claim-reward-btn mt-3 active-scale-effect font-size-8 py-1.5" onClick={() => handleBuyPack("strife")}>
                購入する
              </button>
            </div>

            <div className="upgrade-card border-subtle">
              <div className="upgrade-card-title flex items-center justify-between shop-title-row">
                <span>装備強化！カスタムオイルパック</span>
                <span className="font-size-8 text-secondary">ダイヤ 15</span>
              </div>
              <div className="font-size-8 text-gray-400 mt-1">装備品のレベルアップに使用する「カスタムオイル [中] x5」を獲得します。</div>
              <button className="claim-reward-btn mt-3 active-scale-effect font-size-8 py-1.5" onClick={() => handleBuyPack("polish")}>
                購入する
              </button>
            </div>

            <div className="upgrade-card border-subtle">
              <div className="upgrade-card-title flex items-center justify-between shop-title-row">
                <span>資金調達パック</span>
                <span className="font-size-8 text-secondary">ダイヤ 30</span>
              </div>
              <div className="font-size-8 text-gray-400 mt-1">ガチャや装備強化に使用する「キャッシュ10,000」を獲得します。</div>
              <button className="claim-reward-btn mt-3 active-scale-effect font-size-8 py-1.5" onClick={() => handleBuyPack("cash")}>
                購入する
              </button>
            </div>
          </div>
        )}

        {shopSubTab === "diamond" && (
          <div className="flex-col-gap-3">
            <div className="upgrade-card border-magenta shop-border-magenta">
              <div className="upgrade-card-title text-color-magenta">有償ダイヤチャージ (Stripe決済モック)</div>
              <div className="font-size-8 text-gray-400 mt-1">Stripe決済を利用して、ガチャやパック購入に使用するダイヤを購入します。</div>
              <div className="flex gap-2 mt-3 shop-btn-layout">
                <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2" onClick={() => triggerStripeWebhookSimulation(false)}>ダイヤ 100チャージ</button>
                <button className="upgrade-btn flex-1 active-scale-effect font-size-8 py-2 shop-double-charge-btn" onClick={() => triggerStripeWebhookSimulation(true)}>重複検知テスト</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
