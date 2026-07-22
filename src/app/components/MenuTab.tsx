"use client";
import React from "react";
import { useGame } from "../context/GameContext";
import "./MenuTab.css";

export default function MenuTab() {
  const { navigateTab, setHomeSubPanel, setInboxTab, playCyberSe } = useGame();

  const handleMenuNav = (tab: string, subPanel?: string, inboxTab?: string) => {
    playCyberSe("click");
    navigateTab(tab);
    if (subPanel) {
      // Small delay to ensure tab switch completes before setting sub-panel
      setTimeout(() => {
        setHomeSubPanel(subPanel);
        if (inboxTab) setInboxTab(inboxTab);
      }, 50);
    }
  };

  const MENU_ITEMS = [
    { label: "クエスト", tab: "patrol", color: "green" },
    { label: "PvP", tab: "pvp", color: "blue" },
    { label: "GvG", tab: "gvg", color: "red" },
    { label: "レイド", tab: "raid", color: "orange" },
    { label: "ショップ", tab: "shop", color: "gold" },
    { label: "マップ", tab: "map", color: "purple" },
    { label: "ランキング", tab: "ranking", color: "silver" },
    { label: "BBS", tab: "bbs", color: "silver" },
    { label: "所持品", tab: "bag", color: "silver" },
    { label: "ミッション", tab: "home", subPanel: "missions", color: "cyan" },
    { label: "プレゼント", tab: "home", subPanel: "inbox", color: "magenta" },
    { label: "設定", tab: "home", subPanel: "profile", color: "white" },
  ];

  return (
    <div className="menu-tab-view">
      <div className="menu-tab-header">
        <h2 className="menu-tab-title">メニュー</h2>
      </div>
      <div className="menu-tab-grid">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            className={`menu-tab-item menu-tab-item--${item.color} active-scale-effect`}
            onClick={() => handleMenuNav(item.tab, item.subPanel)}
          >
            <span className="menu-tab-item-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
