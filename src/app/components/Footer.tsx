"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./Footer.css";

export default function Footer() {
  const { activeTab, navigateTab, playCyberSe } = useGame();

  const navItems = [
    { id: "home", label: "マイページ", icon: "/ui/icon_footer_mypage.png" },
    { id: "guild", label: "ギルド", icon: "/ui/icon_footer_guild.png" },
    { id: "character", label: "キャラ", icon: "/ui/icon_footer_character.png" },
    { id: "gacha", label: "ガチャ", icon: "/ui/icon_footer_gacha.png" },
    { id: "patrol", label: "クエスト", icon: "/ui/icon_map.png" }
  ];

  return (
    <footer className="footer-mobile">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`footer-item active-scale-effect ${isActive ? "active" : ""}`}
            onClick={() => {
              navigateTab(item.id);
              playCyberSe("click");
            }}
          >
            <img src={item.icon} alt={item.label} className="footer-icon" />
            <span className="footer-label">{item.label}</span>
          </button>
        );
      })}
    </footer>
  );
}
