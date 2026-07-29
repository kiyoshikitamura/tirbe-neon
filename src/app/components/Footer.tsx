"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./Footer.css";

const FOOTER_TABS = [
  {
    id: "home",
    label: "マイページ",
    iconSrc: "/ui/icon_footer_mypage.png",
  },
  {
    id: "guild",
    label: "ギルド",
    iconSrc: "/ui/icon_footer_guild.png",
  },
  {
    id: "character",
    label: "キャラ",
    iconSrc: "/ui/icon_footer_character.png",
  },
  {
    id: "gacha",
    label: "ガチャ",
    iconSrc: "/ui/icon_footer_gacha.png",
  },
  {
    id: "shop",
    label: "ショップ",
    iconSrc: "/ui/icon_footer_shop.png",
  },
];

export default function Footer() {
  const { activeTab, navigateTab, hasActivePatrolBattle } = useGame();

  return (
    <footer className="footer-nav">
      {FOOTER_TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-item active-scale-effect ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => navigateTab(tab.id)}
          style={{ position: "relative" }}
        >
          <img
            src={tab.iconSrc}
            alt={tab.label}
            className="nav-icon-img"
          />
          <span className="nav-label-jp">{tab.label}</span>
          {tab.id === "home" && hasActivePatrolBattle && (
            <span className="nav-badge-dot" />
          )}
        </button>
      ))}
    </footer>
  );
}
