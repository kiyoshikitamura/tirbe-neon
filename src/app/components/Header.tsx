"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import "./Header.css";

/**
 * Header - TRIBE: NEON REIGN モバイル専用コンパクトヘッダー
 * モバイルファースト仕様 (2行構成: Row1 ユーザー名・ギルド・レイド・総合力 / Row2 Lv・Cash・Dia・AP)
 */
export default function Header() {
  const {
    username,
    userLevel,
    cash,
    diamonds,
    vitality,
    navigateTab,
    playCyberSe,
    userGuild,
    userCharactersDbList,
    userEquipmentsList,
    raidBossHp,
    raidBossSecondsLeft,
  } = useGame();

  // チート対策: DBから取得された最新の所有キャラ・装備ステータスより合算値を算出（改ざん不能）
  const totalPower = React.useMemo(() => {
    if (!userCharactersDbList || userCharactersDbList.length === 0) return 0;
    return userCharactersDbList.reduce((sum: number, charRec: any) => {
      const stats = getCharacterTotalStats(charRec, userEquipmentsList || []);
      return sum + stats.hp + stats.atk + stats.def + stats.spd + stats.luk;
    }, 0);
  }, [userCharactersDbList, userEquipmentsList]);

  return (
    <header className="header-mobile">
      {/* Row 1: ユーザー名 + 所属ギルド + レイドアラート + 総合力 */}
      <div className="header-mobile-row1">
        <div className="header-mobile-user">
          <span className="header-mobile-username">{username || "プレイヤー"}</span>
          <span className="header-mobile-guild-name">
            {userGuild?.name ? userGuild.name : "未所属"}
          </span>
          {raidBossHp > 0 && raidBossSecondsLeft > 0 && (
            <button
              className="header-mobile-raid-alert active-scale-effect"
              onClick={() => {
                navigateTab("raid");
                playCyberSe("click");
              }}
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

      {/* Row 2: ステータス (Lv.バッジ + Cash / Dia / AP) */}
      <div className="header-mobile-row2">
        <span className="header-mobile-level-badge">Lv.{userLevel || 1}</span>
        <div className="header-mobile-stats">
          {/* Cash */}
          <div className="header-mobile-stat">
            <img src="/ui/icon_cash.png" alt="Cash" className="header-stat-icon" />
            <span className="header-mobile-stat-label">Cash</span>
            <span className="header-mobile-stat-val header-mobile-stat-cash">
              {(cash || 0).toLocaleString()}
            </span>
          </div>

          {/* Dia */}
          <div className="header-mobile-stat">
            <img src="/ui/icon_dia.png" alt="Dia" className="header-stat-icon" />
            <span className="header-mobile-stat-label">Dia</span>
            <span className="header-mobile-stat-val header-mobile-stat-diamond">
              {(diamonds || 0).toLocaleString()}
            </span>
          </div>

          {/* AP */}
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
