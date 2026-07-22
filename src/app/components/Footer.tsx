"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./Footer.css";

const FOOTER_TABS = [
  {
    id: "home",
    label: "マイページ",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    id: "gacha",
    label: "ガチャ",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
        <path d="M12 8v8m-4-4h8" />
      </svg>
    ),
  },
  {
    id: "guild",
    label: "ギルド",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: "character",
    label: "キャラクター",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "menu",
    label: "メニュー",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-icon">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
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
          {tab.icon}
          <span className="nav-label-jp">{tab.label}</span>
          {tab.id === "home" && hasActivePatrolBattle && (
            <span className="nav-badge-dot" />
          )}
        </button>
      ))}
    </footer>
  );
}
