"use client";

import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { SHOP_PRODUCTS_MASTER, ShopProduct, ShopProductItem } from "@/utils/shop_master_data";
import "./ShopTab.css";

export default function ShopTab() {
  const {
    shopSubTab,
    setShopSubTab,
    userShopPurchases,
    userCreatedAt,
    boughtResultModal,
    setBoughtResultModal,
    handleBuyNormalProduct,
    handleBuyStripeProduct,
    playCyberSe,
    profileLoading,
    upgradeLoading
  } = useGame();

  const [confirmNormalModal, setConfirmNormalModal] = useState<{
    product: ShopProduct;
    currencyType: "CASH" | "DIAMOND";
  } | null>(null);

  const [timeLeftStr, setTimeLeftStr] = useState<string>("");

  // 初心者パックの24時間カウントダウン計算
  useEffect(() => {
    if (!userCreatedAt) return;

    const calcTimeLeft = () => {
      const createdTime = new Date(userCreatedAt).getTime();
      const expireTime = createdTime + 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = expireTime - now;

      if (diff <= 0) {
        setTimeLeftStr("");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const hStr = String(hours).padStart(2, "0");
      const mStr = String(mins).padStart(2, "0");
      const sStr = String(secs).padStart(2, "0");

      setTimeLeftStr(`${hStr}:${mStr}:${sStr}`);
    };

    calcTimeLeft();
    const timer = setInterval(calcTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [userCreatedAt]);

  // 初心者限定商材の表示判定 (作成後24時間以内 かつ 未購入)
  const isBeginnerAvailable = (() => {
    if (!userCreatedAt) return true;
    const createdTime = new Date(userCreatedAt).getTime();
    const isWithin24h = Date.now() < createdTime + 24 * 60 * 60 * 1000;
    const purchased = (userShopPurchases["beginner_pack_01"] || 0) > 0;
    return isWithin24h && !purchased;
  })();

  // 商品フィルタリング
  const beginnerProducts = SHOP_PRODUCTS_MASTER.filter(p => p.category === "BEGINNER" && isBeginnerAvailable);
  const limitedNProducts = SHOP_PRODUCTS_MASTER.filter(p => p.category === "LIMITED_N" && ((userShopPurchases[p.id] || 0) < (p.purchaseLimit || 999)));
  const diamondProducts = SHOP_PRODUCTS_MASTER.filter(p => p.category === "DIAMOND").sort((a, b) => a.sortOrder - b.sortOrder);
  const normalItemProducts = SHOP_PRODUCTS_MASTER.filter(p => p.shopType === "NORMAL").sort((a, b) => a.sortOrder - b.sortOrder);

  const isLoading = profileLoading || upgradeLoading;

  return (
    <div className="view-container shop-tab-container">
      <h2 className="view-title">ショップ</h2>

      {/* サブタブ切替 */}
      <div className="tab-menu shop-tab-menu">
        <button
          className={`tab-btn ${shopSubTab === "LIMITED" ? "active" : ""}`}
          onClick={() => {
            setShopSubTab("LIMITED");
            playCyberSe("click");
          }}
        >
          限定ショップ
        </button>
        <button
          className={`tab-btn ${shopSubTab === "NORMAL" ? "active" : ""}`}
          onClick={() => {
            setShopSubTab("NORMAL");
            playCyberSe("click");
          }}
        >
          通常ショップ
        </button>
      </div>

      <div className="scroll-container flex-1 shop-scroll-body">
        
        {/* ==================================================== */}
        {/* ■ 限定ショップ (Stripe課金)                          */}
        {/* ==================================================== */}
        {shopSubTab === "LIMITED" && (
          <div className="flex-col-gap-3">

            {/* 1. 初心者限定商材 */}
            {beginnerProducts.length > 0 && (
              <div className="shop-section">
                <div className="shop-section-header">
                  <span className="shop-section-title text-gold">初心者限定商材</span>
                  {timeLeftStr && (
                    <span className="shop-timer-badge">
                      残り {timeLeftStr}
                    </span>
                  )}
                </div>

                {beginnerProducts.map(product => (
                  <div key={product.id} className="shop-card beginner-card border-gold">
                    {/* 販促バナー */}
                    {product.bannerUrl && (
                      <div className="shop-banner-wrapper">
                        <img src={product.bannerUrl} alt={product.title} className="shop-banner-img" />
                        <div className="shop-banner-overlay-badge">1回限定パック</div>
                      </div>
                    )}

                    <div className="shop-card-content">
                      <div className="shop-card-title">{product.title}</div>
                      <div className="shop-card-desc">{product.description}</div>

                      {/* 獲得コンテンツ内訳 */}
                      <div className="shop-item-bundle-grid">
                        {product.items.map((it, idx) => (
                          <div key={idx} className="bundle-item-chip">
                            <span className="bundle-item-name">{it.itemName}</span>
                            <span className="bundle-item-qty">x{it.quantity.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        className="shop-buy-btn primary-gold-btn active-scale-effect mt-3"
                        disabled={isLoading}
                        onClick={() => handleBuyStripeProduct(product.id)}
                      >
                        {isLoading ? (
                          <span className="shop-btn-spinner" />
                        ) : (
                          `¥${product.priceJpy?.toLocaleString()} (税抜)`
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. 限定N回販売商品 (該当商品がある場合のみ描画) */}
            {limitedNProducts.length > 0 && (
              <div className="shop-section">
                <div className="shop-section-header">
                  <span className="shop-section-title text-magenta">限定販売商品</span>
                </div>

                {limitedNProducts.map(product => (
                  <div key={product.id} className="shop-card border-magenta">
                    {product.bannerUrl && (
                      <div className="shop-banner-wrapper">
                        <img src={product.bannerUrl} alt={product.title} className="shop-banner-img" />
                      </div>
                    )}
                    <div className="shop-card-content">
                      <div className="shop-card-title">{product.title}</div>
                      <div className="shop-card-desc">{product.description}</div>
                      <button
                        className="shop-buy-btn primary-magenta-btn active-scale-effect mt-3"
                        disabled={isLoading}
                        onClick={() => handleBuyStripeProduct(product.id)}
                      >
                        {isLoading ? (
                          <span className="shop-btn-spinner" />
                        ) : (
                          `¥${product.priceJpy?.toLocaleString()} (税抜)`
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. 通常商品 (有償ダイヤ販売) */}
            <div className="shop-section">
              <div className="shop-section-header">
                <span className="shop-section-title text-subtle">通常商品 (ダイヤ購入)</span>
              </div>

              <div className="diamond-products-grid">
                {diamondProducts.map(product => (
                  <div key={product.id} className="shop-card diamond-card border-subtle">
                    <div className="diamond-icon-wrapper">
                      <svg className="diamond-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" strokeWidth="1.5" />
                        <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1" opacity="0.4" />
                        <line x1="2" y1="8.5" x2="22" y2="8.5" strokeWidth="1" opacity="0.4" />
                      </svg>
                    </div>

                    <div className="diamond-card-info">
                      <div className="shop-card-title">{product.title}</div>
                      <div className="shop-card-desc">{product.description}</div>
                    </div>

                    <button
                      className="shop-buy-btn border-metal-btn active-scale-effect"
                      disabled={isLoading}
                      onClick={() => handleBuyStripeProduct(product.id)}
                    >
                      {isLoading ? (
                        <span className="shop-btn-spinner" />
                      ) : (
                        `¥${product.priceJpy?.toLocaleString()} (税抜)`
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* ■ 通常ショップ (キャッシュ / ダイヤ消費)             */}
        {/* ==================================================== */}
        {shopSubTab === "NORMAL" && (
          <div className="flex-col-gap-3">
            <div className="shop-section">
              <div className="shop-section-header">
                <span className="shop-section-title text-subtle">消費購入アイテム</span>
              </div>

              <div className="normal-products-grid">
                {normalItemProducts.map(product => (
                  <div key={product.id} className="shop-card normal-item-card border-subtle">
                    <div className="item-card-header flex items-center gap-3">
                      <div className="item-icon-box">
                        <svg className="item-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="6" y="3" width="12" height="18" rx="2" strokeWidth="1.5" />
                          <path d="M9 7h6M9 11h6M9 15h4" strokeWidth="1.2" opacity="0.6" />
                        </svg>
                      </div>
                      <div className="item-title-area flex-1">
                        <div className="shop-card-title">{product.title}</div>
                        <div className="shop-card-desc">{product.description}</div>
                      </div>
                    </div>

                    {/* 購入支払い選択ボタン */}
                    <div className="normal-buy-actions-row">
                      {product.priceCash !== undefined && (
                        <button
                          className="buy-currency-btn cash-btn active-scale-effect"
                          disabled={isLoading}
                          onClick={() => setConfirmNormalModal({ product, currencyType: "CASH" })}
                        >
                          <span className="currency-label">Cash</span>
                          <span className="currency-val">{product.priceCash.toLocaleString()}</span>
                        </button>
                      )}

                      {product.priceDiamond !== undefined && (
                        <button
                          className="buy-currency-btn dia-btn active-scale-effect"
                          disabled={isLoading}
                          onClick={() => setConfirmNormalModal({ product, currencyType: "DIAMOND" })}
                        >
                          <span className="currency-label">Dia</span>
                          <span className="currency-val">{product.priceDiamond.toLocaleString()}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* ■ 通常アイテム購入確認モーダル                       */}
      {/* ==================================================== */}
      {confirmNormalModal && (
        <div className="modal-overlay" onClick={() => setConfirmNormalModal(null)}>
          <div className="modal-content shop-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">購入の確認</h3>
            <p className="modal-body-text">
              {confirmNormalModal.product.title} を
              <span className="font-bold text-gold mx-1">
                {confirmNormalModal.currencyType === "CASH" 
                  ? `${confirmNormalModal.product.priceCash?.toLocaleString()} キャッシュ`
                  : `${confirmNormalModal.product.priceDiamond?.toLocaleString()} ダイヤ`}
              </span>
              で購入しますか？
            </p>

            <div className="modal-actions">
              <button
                className="modal-cancel-btn active-scale-effect"
                onClick={() => setConfirmNormalModal(null)}
              >
                キャンセル
              </button>
              <button
                className="modal-confirm-btn active-scale-effect"
                disabled={isLoading}
                onClick={async () => {
                  const target = confirmNormalModal;
                  setConfirmNormalModal(null);
                  await handleBuyNormalProduct(target.product.id, target.currencyType);
                }}
              >
                {isLoading ? <span className="shop-btn-spinner" /> : "購入する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* ■ 購入完了・入手ログモーダル (プレゼントBOX送付告知)  */}
      {/* ==================================================== */}
      {boughtResultModal && (
        <div className="modal-overlay" onClick={() => setBoughtResultModal(null)}>
          <div className="modal-content shop-result-modal" onClick={e => e.stopPropagation()}>
            <div className="result-modal-header">
              <h3 className="result-modal-title">購入完了</h3>
            </div>

            <div className="result-items-list">
              {boughtResultModal.items.map((it: ShopProductItem, idx: number) => (
                <div key={idx} className="result-item-row">
                  <span className="result-item-name">{it.itemName}</span>
                  <span className="result-item-qty">+{it.quantity.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <p className="result-notice-text">
              獲得したアイテムは<span className="text-gold font-bold mx-1">プレゼントBOX</span>に転送されました。
            </p>

            <div className="modal-actions mt-4">
              <button
                className="modal-confirm-btn active-scale-effect w-full"
                onClick={() => setBoughtResultModal(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
