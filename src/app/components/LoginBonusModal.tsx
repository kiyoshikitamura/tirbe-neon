"use client";

import React from "react";
import "./LoginBonusModal.css";
import { LoginBonusMaster, LoginBonusClaimResult } from "../../utils/login_bonus_master_data";

interface LoginBonusModalProps {
  masters: LoginBonusMaster[];
  currentStep: number;
  claimResult: LoginBonusClaimResult | null;
  onClose: () => void;
  onOpenPresents: () => void;
}

export const LoginBonusModal: React.FC<LoginBonusModalProps> = ({
  masters,
  currentStep,
  claimResult,
  onClose,
  onOpenPresents,
}) => {
  const isClaimedToday = claimResult?.claimed ?? false;
  const rewardInfo = claimResult?.reward;

  return (
    <div className="login-bonus-modal-overlay" onClick={onClose}>
      <div
        className="login-bonus-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="login-bonus-modal-header">
          <h2 className="login-bonus-title">ログインボーナス</h2>
          <div className="login-bonus-subtitle">
            毎日ログインして報酬を獲得（30回で1周）
          </div>
        </div>

        {/* ボディ */}
        <div className="login-bonus-modal-body">
          {/* 本日獲得報酬のアナウンスバナー */}
          {isClaimedToday && rewardInfo && (
            <div className="login-bonus-reward-banner">
              <span className="login-bonus-banner-badge">本日獲得</span>
              <div className="login-bonus-reward-name">
                {rewardInfo.item_name}
              </div>
              <div className="login-bonus-reward-desc">
                プレゼントBOXに保存されました
              </div>
            </div>
          )}

          {/* 30日分グリッド */}
          <div className="login-bonus-grid">
            {masters.map((m) => {
              const isPastClaimed = isClaimedToday
                ? m.day_number <= currentStep
                : m.day_number < currentStep;
              const isToday = isClaimedToday && m.day_number === currentStep;

              return (
                <div
                  key={m.day_number}
                  className={`login-bonus-cell ${
                    m.is_featured ? "featured" : ""
                  } ${isPastClaimed ? "claimed" : ""} ${
                    isToday ? "today" : ""
                  }`}
                >
                  {m.is_featured && (
                    <span className="login-bonus-cell-featured-label">
                      注目
                    </span>
                  )}

                  <div className="login-bonus-cell-day">
                    {m.day_number}日目
                  </div>

                  <div className="login-bonus-cell-icon">
                    {m.item_id === "CASH"
                      ? "Cash"
                      : m.item_id === "DIAMOND"
                      ? "Dia"
                      : m.item_id === "GACHA_TICKET"
                      ? "チケット"
                      : "アイテム"}
                  </div>

                  <div className="login-bonus-cell-qty">
                    x{m.quantity.toLocaleString()}
                  </div>

                  {/* スタンプ刻印（受取済み） */}
                  {isPastClaimed && (
                    <div className="login-bonus-stamp">済</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* フッター */}
        <div className="login-bonus-modal-footer">
          <button
            className="login-bonus-btn login-bonus-btn-secondary"
            onClick={onClose}
          >
            閉じる
          </button>
          <button
            className="login-bonus-btn login-bonus-btn-primary"
            onClick={() => {
              onClose();
              onOpenPresents();
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 5 12" />
            </svg>
            プレゼントBOXへ
          </button>
        </div>
      </div>
    </div>
  );
};
