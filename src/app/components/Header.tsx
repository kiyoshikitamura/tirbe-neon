"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { getCharacterTotalStats } from "@/utils/stats_calculator";
import "./Header.css";

/**
 * Header - TRIBE: NEON REIGN モバイル専用コンパクトヘッダー
 * ユーザー指定完全仕様:
 * 1行目: 通り名(称号) | 名前 | Lv | 所属ギルド
 * 2行目: 総合力 | 所持キャッシュ (icon_cash.png) | 所持ダイヤ (icon_dia.png) | AP (Action Point / 行動スタミナ)
 */
export default function Header() {
  const {
    username,
    userLevel,
    userTitle,
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
      {/* 1行目: 通り名 + 名前 + Lv + 所属ギルド (+ レイド開催時アラート) */}
      <div className="header-mobile-row1">
        <div className="header-mobile-user">
          <span className="header-mobile-title">{userTitle || "半グレの首領"}</span>
          <span className="header-mobile-username">{username || "プレイヤー"}</span>
          <span className="header-mobile-level-badge">Lv.{userLevel || 1}</span>
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
      </div>

      {/* 2行目: 総合力 + 所持キャッシュ + 所持ダイヤ + AP */}
      <div className="header-mobile-row2">
        {/* 総合力 */}
        <div className="header-mobile-stat header-mobile-stat-power">
          <span className="header-mobile-stat-label">取合力</span>
          <span className="header-mobile-stat-val header-mobile-stat-power-val">
            {totalPower.toLocaleString()}
          </span>
        </div>

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
