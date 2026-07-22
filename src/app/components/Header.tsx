"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import "./Header.css";

const SVG_ICONS = {
  home: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  patrol: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="13" y2="14" />
    </svg>
  ),
  pvp: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l3.5 3.5" />
      <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
    </svg>
  ),
  gacha: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M6 12h12" />
    </svg>
  ),
  character: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

const PC_NAV_TABS = [
  { id: "home", label: "マイページ", icon: "home" },
  { id: "patrol", label: "クエスト", icon: "patrol" },
  { id: "pvp", label: "PvP", icon: "pvp" },
  { id: "gacha", label: "ガチャ", icon: "gacha" },
  { id: "character", label: "キャラクター", icon: "character" },
  { id: "shop", label: "ショップ", icon: "shop" },
  { id: "menu", label: "メニュー", icon: "menu" },
];

export default function Header({ isPcLayout }: { isPcLayout?: boolean }) {
  const {
    username,
    userLevel,
    cash,
    diamonds,
    vitality,
    activeTab,
    navigateTab,
    setHomeSubPanel,
    playCyberSe,
    unreadMissionsCount,
    unclaimedPresentsCount,
    userGuild,
    userCharactersDbList,
    userEquipmentsList,
    hasActivePatrolBattle,
    raidBossHp,
    raidBossSecondsLeft,
  } = useGame();

  // const userLevel = characterLevel || 1;

  // 総合力（パーティ全キャラのステータス合計）
  const totalPower = React.useMemo(() => {
    if (!userCharactersDbList || userCharactersDbList.length === 0) return 0;
    return userCharactersDbList.reduce((sum: number, charRec: any) => {
      const stats = getCharacterTotalStats(charRec, userEquipmentsList || []);
      return sum + stats.hp + stats.atk + stats.def + stats.spd + stats.luk;
    }, 0);
  }, [userCharactersDbList, userEquipmentsList]);

  if (isPcLayout) {
    return (
      <header className="header-pc">
        {/* 左: ロゴ */}
        <div className="header-pc-logo-area">
          <h1 className="header-pc-logo">龍宿神会</h1>
        </div>

        {/* 中央: ナビゲーションタブ */}
        <nav className="header-pc-nav">
          {PC_NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`header-pc-nav-btn active-scale-effect ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (tab.id !== "menu") {
                    navigateTab(tab.id);
                    setHomeSubPanel("main");
                  }
                }}
              >
                <span className="header-pc-nav-icon" style={{ position: "relative" }}>
                  {SVG_ICONS[tab.icon as keyof typeof SVG_ICONS]}
                  {tab.id === "patrol" && hasActivePatrolBattle && (
                    <span className="nav-badge-dot" style={{ position: "absolute", right: "-3px", top: "-3px" }} />
                  )}
                </span>
                <span className="header-pc-nav-label">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 右: ステータス＋クイックボタン */}
        <div className="header-pc-right">
          {/* 上段: ユーザー情報 + リソース */}
          <div className="header-pc-status">
            <div className="header-pc-user-row">
              <span className="header-pc-level">Lv.{userLevel}</span>
              <span className="header-pc-username">{username}</span>
            </div>
            <div className="header-pc-resources">
              <span className="header-pc-res-item header-pc-res-cash">
                Cash: {(cash || 0).toLocaleString()}
              </span>
              <span className="header-pc-res-item header-pc-res-diamond">
                ◆ {(diamonds || 0).toLocaleString()}
              </span>
              <span className="header-pc-res-item header-pc-res-energy">
                ⚡ {vitality || 0}/100
              </span>
            </div>
          </div>

          {/* 下段: クイック3連ボタン */}
          <div className="header-pc-quick-btns">
            <button
              className="header-pc-quick-btn active-scale-effect"
              onClick={() => {
                playCyberSe("click");
                navigateTab("home");
                setHomeSubPanel("missions");
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="header-pc-quick-label">ミッション</span>
              {unreadMissionsCount > 0 && (
                <span className="header-pc-badge">{unreadMissionsCount}</span>
              )}
            </button>
            <button
              className="header-pc-quick-btn active-scale-effect"
              onClick={() => {
                playCyberSe("click");
                navigateTab("home");
                setHomeSubPanel("inbox");
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12" />
                <rect x="2" y="7" width="20" height="5" />
                <line x1="12" y1="22" x2="12" y2="7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
              <span className="header-pc-quick-label">プレゼント</span>
              {unclaimedPresentsCount > 0 && (
                <span className="header-pc-badge">{unclaimedPresentsCount}</span>
              )}
            </button>
            <button
              className="header-pc-quick-btn active-scale-effect"
              onClick={() => {
                playCyberSe("click");
                navigateTab("home");
                setHomeSubPanel("profile");
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className="header-pc-quick-label">設定</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  /* ========================================
     モバイルヘッダー: コンパクト水平ステータスバー
     ======================================== */
  return (
    <header className="header-mobile">
      {/* Row 1: ユーザー情報 + レイドアラート */}
      <div className="header-mobile-row1">
        <div className="header-mobile-user">
          <span className="header-mobile-username">{username}</span>
          <span className="header-mobile-guild-name">
            {userGuild?.name || "未所属"}
          </span>
          {raidBossHp > 0 && raidBossSecondsLeft > 0 && (
            <button
              className="header-mobile-raid-alert active-scale-effect"
              onClick={() => { navigateTab("raid"); playCyberSe("click"); }}
            >
              <span className="header-raid-dot"></span>
              レイド中!
            </button>
          )}
        </div>
        <div className="header-mobile-power">
          <span className="header-mobile-power-label">総合力</span>
          <span className="header-mobile-power-value">{totalPower.toLocaleString()}</span>
        </div>
      </div>

      {/* Row 2: ステータス */}
      <div className="header-mobile-row2">
        <span className="header-mobile-level-badge">Lv.{userLevel}</span>
        <div className="header-mobile-stats">
          <div className="header-mobile-stat">
            <span className="header-mobile-stat-label">Cash</span>
            <span className="header-mobile-stat-val header-mobile-stat-cash">
              {(cash || 0).toLocaleString()}
            </span>
          </div>
          <div className="header-mobile-stat">
            <span className="header-mobile-stat-label">Dia</span>
            <span className="header-mobile-stat-val header-mobile-stat-diamond">
              {diamonds || 0}
            </span>
          </div>
          <div className="header-mobile-stat">
            <span className="header-mobile-stat-label">AP</span>
            <span className="header-mobile-stat-val header-mobile-stat-energy">
              {vitality || 0}/100
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
