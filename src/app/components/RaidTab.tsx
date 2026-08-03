"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import { BASE_MAP_MASTER, RAID_COST_TABLE, RAID_MAX_DAILY } from "@/utils/game_constants";
import "./RaidTab.css";

export default function RaidTab() {
  const {
    raidBossHp,
    raidBossMaxHp,
    raidBossSecondsLeft,
    raidTotalDamage,
    handleRaidBossDefeat,
    handleRaidSeasonReset,
    raidDefeatLoading,
    startCardBattle,
    playCyberSe,
    raidBossBaseId,
    raidBossName,
    hasRaidControlBonus,
    navigateTab,
    userLevel,
    raidAttemptsToday,
    setConfirmDialogConfig,
    cash,
    diamonds
  } = useGame();

  // 残り時間のフォーマット
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "終了";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const hpPercent = raidBossMaxHp > 0 ? (raidBossHp / raidBossMaxHp) * 100 : 0;
  
  // 出現拠点の名称取得
  const baseName = BASE_MAP_MASTER.find(b => b.id === raidBossBaseId)?.name || "夜の街";

  return (
    <div className="view-container">
      <h2 className="view-title text-color-magenta">レイド</h2>
      
      <div className="scroll-container flex-1 flex-col-gap-3">
        {/* レイドボスステータスカード */}
        <div className="battle-card border-danger p-3">
          <div className="flex-row-space-between align-center mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-size-10 font-weight-bold text-color-magenta">【強敵】{raidBossName}</span>
            <span className="font-size-8 text-secondary">制限時間: <span className="text-color-danger font-weight-bold">{formatTime(raidBossSecondsLeft)}</span></span>
          </div>

          {/* 出現場所と支配ボーナスステータス */}
          <div className="flex-row-space-between align-center mb-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-size-8 text-secondary">
              出現地: <span className="text-color-cyan font-weight-bold">{baseName}</span>
            </span>
            {hasRaidControlBonus && (
              <span className="control-bonus-badge font-size-7 font-weight-bold">
                支配ボーナス適用中! (ダメージ+20%)
              </span>
            )}
          </div>

          {/* HPバー */}
          <div className="raid-hp-bar-container">
            <div className="raid-hp-bar-fill" style={{ width: `${Math.max(hpPercent, 0)}%` }} />
            <span className="raid-hp-text font-size-8 font-weight-bold">
              HP: {raidBossHp.toLocaleString()} / {raidBossMaxHp.toLocaleString()} ({hpPercent.toFixed(1)}%)
            </span>
          </div>

            <div className="flex-col-gap-2 width-100">
              <button 
                onClick={() => {
                  playCyberSe("click");
                  const nextAttempt = raidAttemptsToday + 1;
                  const costEntry = RAID_COST_TABLE[Math.min(nextAttempt - 1, RAID_COST_TABLE.length - 1)];
                  
                  if (costEntry.type !== "FREE") {
                    setConfirmDialogConfig({
                      isOpen: true,
                      title: "レイド挑戦",
                      message: `${costEntry.type === "CASH" ? "Cash" : "Diamond"} ${costEntry.cost.toLocaleString()} を消費してレイドに挑戦しますか？（本日 ${nextAttempt}/${RAID_MAX_DAILY} 回目）`,
                      confirmText: "挑戦する",
                      cancelText: "キャンセル",
                      onConfirm: () => { startCardBattle("RAID", raidBossName, raidBossBaseId); setConfirmDialogConfig(null); },
                      onCancel: () => setConfirmDialogConfig(null),
                    });
                  } else {
                    startCardBattle("RAID", raidBossName, raidBossBaseId);
                  }
                }}
                disabled={raidBossHp <= 0 || raidBossSecondsLeft <= 0 || userLevel < 5 || raidAttemptsToday >= RAID_MAX_DAILY}
                className="action-btn claim font-weight-bold py-2 px-6 active-scale-effect width-100 flex-row-center-spinner justify-center"
                style={{ background: "var(--neon-magenta)", border: "none", color: "#fff", width: "100%" }}
              >
                {userLevel < 5 ? "プレイヤーLv5以上で解放" : raidAttemptsToday >= RAID_MAX_DAILY ? "本日の挑戦回数上限" : "強敵に挑む (バトル開始)"}
              </button>
              {userLevel >= 5 && (
                <div className="text-center font-size-8 text-secondary">
                  本日挑戦: {raidAttemptsToday}/{RAID_MAX_DAILY} 回
                  (次回コスト: {RAID_COST_TABLE[Math.min(raidAttemptsToday, RAID_COST_TABLE.length - 1)].type === "FREE" ? "無料" : `${RAID_COST_TABLE[Math.min(raidAttemptsToday, RAID_COST_TABLE.length - 1)].cost} ${RAID_COST_TABLE[Math.min(raidAttemptsToday, RAID_COST_TABLE.length - 1)].type}`})
                </div>
              )}
            </div>
        </div>

        {/* 自組織の累積与ダメージ状況 */}
        <div className="battle-card p-3">
          <div className="upgrade-card-title flex items-center justify-between" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>自身の累計与ダメージ</span>
            <span className="text-color-cyan font-weight-bold">{raidTotalDamage.toLocaleString()} Dmg</span>
          </div>
          <p className="font-size-7 text-secondary mt-1">報酬獲得ライン: 100,000 Dmg (現在 {raidTotalDamage >= 100000 ? "達成済み" : "未達成"})</p>
        </div>

        {/* ランキング画面への遷移 */}
        <div className="battle-card p-3 text-center">
          <div className="upgrade-card-title mb-2">ダメージランキング</div>
          <p className="font-size-8 text-secondary mb-3">全プレイヤー名の与ダメージランキングは、ランキング画面で確認できます。</p>
          <button 
            onClick={() => { navigateTab("ranking", "raid"); playCyberSe("click"); }}
            className="action-btn sub-btn font-weight-bold py-2 px-6 active-scale-effect width-100"
            style={{ width: "100%" }}
          >
            ランキングで確認
          </button>
        </div>

        {/* 開発・デバッグ用管理コンソール */}
        <div className="battle-card border-warning p-3 mt-2">
          <div className="upgrade-card-title text-color-warning mb-2">管理者デバッグツール</div>
          <div className="flex-row-gap-3" style={{ display: "flex", gap: "8px" }}>
            <button 
              onClick={handleRaidBossDefeat} 
              disabled={raidDefeatLoading || raidBossHp <= 0}
              className="sub-btn border-cyan-subtle flex-1 font-size-8 height-28 active-scale-effect"
            >
              {raidDefeatLoading ? "処理中..." : "ボス強制撃破 (報酬配布)"}
            </button>
            <button 
              onClick={handleRaidSeasonReset} 
              disabled={raidDefeatLoading}
              className="sub-btn border-magenta-subtle flex-1 font-size-8 height-28 active-scale-effect text-color-magenta"
            >
              {raidDefeatLoading ? "処理中..." : "レイドシーズンリセット"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
