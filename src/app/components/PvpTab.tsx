"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./PvpTab.css";

const tacticNames: { [key: string]: string } = {
  OFFENSIVE: "攻撃重視",
  DEFENSIVE: "防御重視",
  HEALING: "回復重視",
  BALANCED: "バランス",
  AP_CONSERVING: "AP温存",
  TACTICAL: "特殊戦術"
};

export default function PvpTab() {
  const {
    session,
    pvpPoints,
    pvpSubView,
    setPvpSubView,
    battleLoading,
    pvpOpponents,
    opponentsLoading,
    fetchPvpOpponents,
    myPvpDefenseDeck,
    savePvpDefenseDeck,
    userCharactersDbList,
    startCardBattle,
    pvpRankings,
    handlePvpSeasonReset,
    pvpSeasonLoading,
    triggerNpcDefenseSimulation,
    simulatingDefense,
    pvpDefenseLogs,
    playCyberSe,
    setActiveTab,
    setRankingActiveTab
  } = useGame();

  const [selectedDefense, setSelectedDefense] = React.useState<string[]>([]);
  const [selectedTactic, setSelectedTactic] = React.useState<string>("OFFENSIVE");

  React.useEffect(() => {
    if (myPvpDefenseDeck) {
      const members = [
        myPvpDefenseDeck.character_1_id,
        myPvpDefenseDeck.character_2_id,
        myPvpDefenseDeck.character_3_id,
        myPvpDefenseDeck.character_4_id,
        myPvpDefenseDeck.character_5_id
      ].filter(Boolean);
      setSelectedDefense(members);
      setSelectedTactic(myPvpDefenseDeck.tactic || "OFFENSIVE");
    }
  }, [myPvpDefenseDeck]);

  const handleToggleDefenseMember = (charId: string) => {
    setSelectedDefense(prev => {
      if (prev.includes(charId)) {
        return prev.filter(id => id !== charId);
      }
      if (prev.length >= 5) {
        alert("防衛デッキは最大5名まで選択できます。");
        return prev;
      }
      return [...prev, charId];
    });
  };

  const handleSaveDeck = async () => {
    if (selectedDefense.length === 0) {
      alert("防衛メンバーを1名以上選択してください。");
      return;
    }
    await savePvpDefenseDeck(selectedDefense, selectedTactic);
  };

  const handleRefreshOpponents = () => {
    playCyberSe("click");
    if (session?.user?.id) {
      fetchPvpOpponents(session.user.id, pvpPoints);
    }
  };

  const handleNavigateToRanking = () => {
    playCyberSe("click");
    if (setActiveTab && setRankingActiveTab) {
      setActiveTab("ranking");
      setRankingActiveTab("pvp");
    }
  };

  return (
    <div className="view-container pvp-view">
      <h2 className="view-title">PvP</h2>
      
      <div className="scroll-container flex-1">
        <div className="battle-card">
          <div className="battle-card-header">
            <span className="battle-card-title text-glow-none">PvP</span>
            <span className="battle-card-sub text-color-cyan">現在のレート: {pvpPoints} pt</span>
          </div>
        </div>

        <div className="tab-menu sub-tab-menu-pvp">
          <button 
            className={`tab-btn font-size-9 ${pvpSubView === "opponents" ? "active" : ""}`} 
            onClick={() => { setPvpSubView("opponents"); playCyberSe("click"); }}
          >
            対戦相手
          </button>
          <button 
            className={`tab-btn font-size-9 ${pvpSubView === "daily" ? "active" : ""}`} 
            onClick={() => { setPvpSubView("daily"); playCyberSe("click"); }}
          >
            勝利数
          </button>
          <button 
            className={`tab-btn font-size-9 ${pvpSubView === "season" ? "active" : ""}`} 
            onClick={() => { setPvpSubView("season"); playCyberSe("click"); }}
          >
            シーズン
          </button>
          <button 
            className={`tab-btn font-size-9 ${pvpSubView === "defense" ? "active" : ""}`} 
            onClick={() => { setPvpSubView("defense"); playCyberSe("click"); }}
          >
            防衛設定・履歴
          </button>
        </div>

        {battleLoading ? (
          <div className="loading-container">
            <div className="spinner mx-auto animate-spin" />
          </div>
        ) : (
          <div className="pvp-content-area">
            {pvpSubView === "opponents" && (
              <div className="opponents-subtab">
                <div className="opponents-actions-bar">
                  <button className="sub-btn border-cyan-subtle refresh-btn active-scale-effect" onClick={handleRefreshOpponents} disabled={opponentsLoading}>
                    🔄 対戦相手更新
                  </button>
                  <button className="sub-btn border-gold-subtle ranking-btn active-scale-effect" onClick={handleNavigateToRanking}>
                    🏆 PvPランキング
                  </button>
                </div>

                {opponentsLoading && pvpOpponents.length === 0 ? (
                  <div className="loading-container py-8">
                    <div className="spinner mx-auto animate-spin" />
                  </div>
                ) : (
                  <div className="list-container">
                    {pvpOpponents.length === 0 && (
                      <div className="empty-message py-4 text-center text-color-gray font-size-9">
                        対戦相手が見つかりません。
                      </div>
                    )}
                    {pvpOpponents.map((op: any) => (
                      <div key={op.opponent_user_id} className="list-item opponent-item">
                        <div className="item-left">
                          <span className="item-title">{op.opponent_username}</span>
                          <div className="item-metadata font-size-8 text-color-gray mt-1">
                            <span className="opponent-guild">ギルド: {op.opponent_guild_name}</span>
                            <span className="mx-1">｜</span>
                            <span className="opponent-points text-color-cyan">{op.opponent_points} pt</span>
                            <span className="mx-1">｜</span>
                            <span className="opponent-tactic text-color-magenta">作戦: {tacticNames[op.tactic] || "攻撃重視"}</span>
                          </div>
                        </div>
                        <button 
                          className="action-btn claim active-scale-effect" 
                          onClick={() => startCardBattle(
                            "PVP", 
                            op.opponent_username, 
                            op.opponent_user_id, 
                            op.opponent_points, 
                            op.tactic, 
                            op.opponent_guild_main_alignment, 
                            op.opponent_guild_sub_alignment,
                            op.defense_character_ids
                          )}
                        >
                          対戦
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pvpSubView === "daily" && (
              <div className="list-container">
                {[...pvpRankings].sort((a,b) => b.daily_wins - a.daily_wins).map((item, idx) => (
                  <div key={item.user_id} className="list-item">
                    <div className="item-left"><span className="item-title">{idx+1}位. {item.users?.username || "NPC"}</span></div>
                    <span>勝利数: {item.daily_wins}回</span>
                  </div>
                ))}
              </div>
            )}

            {pvpSubView === "season" && (
              <div className="flex-col-gap-2">
                <button onClick={handlePvpSeasonReset} disabled={pvpSeasonLoading} className="sub-btn border-cyan-subtle active-scale-effect">シーズンリセット実行</button>
                <div className="list-container">
                  {[...pvpRankings].sort((a,b) => b.rank_points - a.rank_points).map((item, idx) => (
                    <div key={item.user_id} className="list-item">
                      <div className="item-left"><span className="item-title">{idx+1}位. {item.users?.username || "NPC"}</span></div>
                      <span>{item.rank_points} pt</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pvpSubView === "defense" && (
              <div className="defense-subtab flex-col-gap-3">
                {/* 防衛デッキ・作戦設定パネル */}
                <div className="defense-setup-panel border-metal p-3">
                  <h3 className="panel-title text-glow-none font-size-10 mb-2">🛡️ 防衛デッキ・作戦設定</h3>
                  
                  <div className="tactic-select-box mb-3">
                    <label className="font-size-8 text-color-gray block mb-1">防衛時の作戦AI:</label>
                    <select 
                      value={selectedTactic} 
                      onChange={(e) => setSelectedTactic(e.target.value)}
                      className="tactic-dropdown font-size-9 p-1 border-metal"
                    >
                      <option value="OFFENSIVE">攻撃重視 (高火力スキルを優先使用)</option>
                      <option value="DEFENSIVE">防御重視 (自身へのシールド・防御を優先)</option>
                      <option value="HEALING">回復重視 (HPの低下した仲間を優先回復)</option>
                      <option value="BALANCED">バランス (回復と攻撃を状況に応じて選択)</option>
                      <option value="AP_CONSERVING">AP温存 (APを極力溜めつつ戦う)</option>
                      <option value="TACTICAL">特殊戦術 (バフ・デバフによる支援優先)</option>
                    </select>
                  </div>

                  <div className="defense-member-select mb-3">
                    <label className="font-size-8 text-color-gray block mb-1">防衛メンバー選択 (最大5名):</label>
                    <div className="member-grid">
                      {userCharactersDbList.map((char: any) => {
                        const isSelected = selectedDefense.includes(char.id);
                        return (
                          <div 
                            key={char.id} 
                            onClick={() => handleToggleDefenseMember(char.id)}
                            className={`member-slot border-metal text-center p-1 cursor-pointer active-scale-effect ${isSelected ? "selected" : ""}`}
                          >
                            <span className="font-size-8 block">{char.name || "構成員"}</span>
                            <span className="font-size-7 text-color-gray">Lv.{char.level}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveDeck} 
                    className="sub-btn border-cyan-subtle save-deck-btn font-size-9 w-full py-1 text-center active-scale-effect"
                  >
                    💾 防衛設定を保存
                  </button>
                </div>

                {/* 防衛履歴リスト */}
                <div className="defense-logs-section">
                  <div className="flex-row-center-between mb-2">
                    <h3 className="font-size-10 text-glow-none m-0">防衛戦闘ログ</h3>
                    <button onClick={triggerNpcDefenseSimulation} disabled={simulatingDefense} className="sub-btn border-magenta-subtle active-scale-effect font-size-8">
                      防衛襲撃シミュレート
                    </button>
                  </div>
                  
                  <div className="list-container">
                    {pvpDefenseLogs.length === 0 && (
                      <div className="empty-message py-4 text-center text-color-gray font-size-9">
                        防衛履歴はありません。
                      </div>
                    )}
                    {pvpDefenseLogs.map((log: any) => (
                      <div key={log.id} className="list-item">
                        <div className="item-left">
                          <span className="item-title">{log.attacker_name} ({log.result === "VICTORY" ? "防衛失敗" : "防衛成功"})</span>
                          <span className="item-desc font-size-7 text-color-gray">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <span className={log.points_change >= 0 ? "text-color-green" : "text-color-red"}>
                          {log.points_change >= 0 ? "+" : ""}{log.points_change} pt
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
