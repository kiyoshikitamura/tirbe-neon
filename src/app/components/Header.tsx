"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./Header.css";

export default function Header() {
  const {
    username,
    userLevel,
    cash,
    diamonds,
    vitality,
    userGuild,
    userTitle,
    isRaidActive,
    navigateTab,
    playCyberSe
  } = useGame();

  return (
    <header className="header-mobile">
      {/* 1行目: 通り名(称号) + 名前 + Lv + 所属ギルド + (レイドアラート) */}
      <div className="header-mobile-row1">
        <div className="header-mobile-user">
          <span className="header-mobile-title">{userTitle || "半グレの首領"}</span>
          <span className="header-mobile-username">{username || "プレイヤー"}</span>
          <span className="header-mobile-level-badge">Lv.{userLevel || 1}</span>
          <span className="header-mobile-guild-name">
            {userGuild?.name ? userGuild.name : "未所属"}
          </span>

          {isRaidActive && (
            <button
              className="header-mobile-raid-alert active-scale-effect"
              onClick={() => {
                navigateTab("raid");
                playCyberSe("click");
              }}
            >
              <span className="header-raid-dot" />
              レイド中!
            </button>
          )}
        </div>
      </div>

      {/* 2行目: 所持キャッシュ + 所持ダイヤ + AP */}
      <div className="header-mobile-row2">
        {/* 所持キャッシュ */}
        <div className="header-mobile-stat">
          <img src="/ui/icon_cash.png" alt="Cash" className="header-stat-icon" />
          <span className="header-mobile-stat-val header-mobile-stat-cash">
            {(cash || 0).toLocaleString()}
          </span>
        </div>

        {/* 所持ダイヤ */}
        <div className="header-mobile-stat">
          <img src="/ui/icon_dia.png" alt="Dia" className="header-stat-icon" />
          <span className="header-mobile-stat-val header-mobile-stat-diamond">
            {(diamonds || 0).toLocaleString()}
          </span>
        </div>

        {/* AP (Action Point) */}
        <div className="header-mobile-stat">
          <span className="header-mobile-stat-label">AP</span>
          <span className="header-mobile-stat-val header-mobile-stat-energy">
            {vitality || 0}/100
          </span>
        </div>
      </div>
    </header>
  );
}
