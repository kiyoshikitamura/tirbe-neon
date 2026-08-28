"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./Footer.css";

export default function Footer() {
  const { activeTab, navigateTab, playCyberSe, dailyFreeGachaFlags, dailyFreeGachaReady } = useGame();
  const hasFreeGacha = dailyFreeGachaReady && Object.values(dailyFreeGachaFlags).some(Boolean);

  const navItems = [
    { id: "home", label: "マイページ", icon: "/ui/icon_footer_mypage.png" },
    { id: "guild", label: "ギルド", icon: "/ui/icon_footer_guild.png" },
    { id: "character", label: "キャラ", icon: "/ui/icon_footer_character.png" },
    { id: "gacha", label: "ガチャ", icon: "/ui/icon_footer_gacha.png" },
    { id: "patrol", label: "クエスト", icon: "/ui/icon_map.png" },
    { id: "shop-upcoming", label: "ショップ\n準備中", icon: "/ui/icon_footer_shop.png", upcoming: true },
  ];

  return (
    <footer className="footer-mobile">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`footer-item active-scale-effect ${isActive ? "active" : ""} ${item.upcoming ? "upcoming" : ""}`}
            disabled={item.upcoming}
            aria-label={item.upcoming ? "ショップは準備中です" : item.label}
            onClick={() => {
              if (item.upcoming) return;
              navigateTab(item.id);
              playCyberSe("click");
            }}
          >
            <img src={item.icon} alt={item.label} className="footer-icon" />
            {item.id === "gacha" && hasFreeGacha && <span className="footer-notification-badge" aria-label="無料ガチャあり">無料</span>}
            <span className="footer-label">{item.label.split("\n").map((line) => <React.Fragment key={line}><span>{line}</span></React.Fragment>)}</span>
          </button>
        );
      })}
    </footer>
  );
}
