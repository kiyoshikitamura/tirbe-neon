"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { VITALITY_MAX } from "@/utils/game_constants";
import { CANONICAL_USER_LEVEL_PROGRESSION } from "@/domain/gameplay/canonical/action_resources";
import "./Header.css";

export default function Header() {
  const {
    username,
    userLevel,
    userXp,
    cash,
    diamonds,
    vitality,
    vitalityNextRecoveryAt,
    userGuild,
    userTitle
  } = useGame();
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!vitalityNextRecoveryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [vitalityNextRecoveryAt]);
  const levelRow = CANONICAL_USER_LEVEL_PROGRESSION.levels.find((row) => row.level === userLevel);
  const recoverySeconds = vitalityNextRecoveryAt
    ? Math.max(0, Math.ceil((new Date(vitalityNextRecoveryAt).getTime() - now) / 1000))
    : null;
  const visibleTitle = userTitle && !["称号なし", "No Title", "title_none", "半グレの首領"].includes(userTitle)
    ? userTitle
    : null;

  return (
    <header className="header-mobile">
      {/* 1行目: 通り名(称号) + 名前 + Lv + 所属ギルド */}
      <div className="header-mobile-row1">
        <div className="header-mobile-user">
          {visibleTitle && <span className="header-mobile-title">{visibleTitle}</span>}
          <span className="header-mobile-username">{username || "プレイヤー名"}</span>
          <span className="header-mobile-level-badge">Lv.{userLevel || 1} · EXP {userXp || 0}{levelRow?.requiredExp ? `/${levelRow.requiredExp}` : ""}</span>
          <span className="header-mobile-guild-name">
            {userGuild?.name ? userGuild.name : "未所属"}
          </span>
        </div>
      </div>

      {/* 2行目: 所持キャッシュ + 所持ダイヤ + Vitality */}
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

        {/* Canonical Quest resource: Vitality */}
        <div className="header-mobile-stat">
          <span className="header-mobile-stat-label">Vitality</span>
          <span className={`header-mobile-stat-val header-mobile-stat-energy ${vitality > VITALITY_MAX ? 'header-mobile-stat-overflow' : ''}`}>
            {vitality || 0}/{VITALITY_MAX}
            {vitality >= VITALITY_MAX
              ? " · 自然回復停止"
              : recoverySeconds !== null
                ? ` · 次の回復 ${Math.floor(recoverySeconds / 60)}:${String(recoverySeconds % 60).padStart(2, "0")}`
                : " · 6分で1回復"}
          </span>
        </div>
      </div>
    </header>
  );
}
