"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./PvpTab.css";
import SectionHeader from "./ui/SectionHeader";
import SubTabNav from "./ui/SubTabNav";
import OutlawCard from "./ui/OutlawCard";
import OutlawButton from "./ui/OutlawButton";

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
    setRankingActiveTab,
    setConfirmDialogConfig,
    setGlobalInteractionBlocking
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
        setConfirmDialogConfig({
          isOpen: true,
          title: "エラー",
          message: "防衛デッキは最大5名まで選択できます。",
          confirmText: "OK",
          onConfirm: () => setConfirmDialogConfig({ isOpen: false })
        });
        return prev;
      }
      return [...prev, charId];
    });
  };

  const handleSaveDeck = async () => {
    if (selectedDefense.length === 0) {
      setConfirmDialogConfig({
        isOpen: true,
        title: "エラー",
        message: "防衛メンバーを1名以上選択してください。",
        confirmText: "OK",
        onConfirm: () => setConfirmDialogConfig({ isOpen: false })
      });
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
      <SectionHeader title="PvP" />
      
      <div className="scroll-container flex-1">
        <OutlawCard className="mb-4 text-center">
          <div className="text-xl font-bold mb-1 text-white text-shadow-glow">現在のレート</div>
          <div className="text-3xl font-black text-neon-cyan text-shadow-cyan">{pvpPoints} pt</div>
        </OutlawCard>

        <SubTabNav
          tabs={[
            { id: "opponents", label: "対戦相手" },
            { id: "daily", label: "勝利数" },
            { id: "season", label: "シーズン" },
            { id: "defense", label: "防衛設定" },
          ]}
          activeTabId={pvpSubView}
          onSelect={setPvpSubView}
        />

        {battleLoading ? (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        ) : (
          <div className="pvp-content-area">
            {pvpSubView === "opponents" && (
              <div className="opponents-subtab">
                <div className="flex gap-2 mb-4">
                  <OutlawButton variant="secondary" className="flex-1" onClick={handleRefreshOpponents} disabled={opponentsLoading}>
                    🔄 対戦相手更新
                  </OutlawButton>
                  <OutlawButton variant="secondary" className="flex-1 text-neon-gold" onClick={handleNavigateToRanking}>
                    🏆 PvPランキング
                  </OutlawButton>
                </div>

                {opponentsLoading && pvpOpponents.length === 0 ? (
                  <div className="loading-container py-8">
                    <div className="spinner" />
                  </div>
                ) : (
                  <div className="list-container">
                    {pvpOpponents.length === 0 && (
                      <div className="empty-message py-4 text-center text-color-gray font-size-9">
                        対戦相手が見つかりません。
                      </div>
                    )}
                    {pvpOpponents.map((op: any) => (
                      <OutlawCard key={op.opponent_user_id} className="mb-3 flex items-center justify-between">
                        <div className="flex-1 pr-2">
                          <div className="font-bold text-white mb-1">{op.opponent_username}</div>
                          <div className="text-xs text-gray-400">
                            <span>ギルド: {op.opponent_guild_name}</span><br />
                            <span className="text-neon-cyan">{op.opponent_points} pt</span>
                            <span className="mx-1">｜</span>
                            <span className="text-neon-magenta">作戦: {tacticNames[op.tactic] || "攻撃重視"}</span>
                          </div>
                        </div>
                        <OutlawButton 
                          variant="danger" 
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
                        </OutlawButton>
                      </OutlawCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pvpSubView === "daily" && (
              <div className="list-container flex flex-col gap-2">
                {[...pvpRankings].sort((a,b) => b.daily_wins - a.daily_wins).map((item, idx) => (
                  <OutlawCard key={item.user_id} className="flex justify-between items-center py-2 px-3">
                    <div className="font-bold">{idx+1}位. {item.users?.username || "NPC"}</div>
                    <div className="text-neon-cyan">勝利数: {item.daily_wins}回</div>
                  </OutlawCard>
                ))}
              </div>
            )}

            {pvpSubView === "season" && (
              <div className="flex flex-col gap-3">
                <OutlawButton variant="danger" fullWidth onClick={handlePvpSeasonReset} disabled={pvpSeasonLoading}>
                  シーズンリセット実行
                </OutlawButton>
                <div className="list-container flex flex-col gap-2">
                  {[...pvpRankings].sort((a,b) => b.rank_points - a.rank_points).map((item, idx) => (
                    <OutlawCard key={item.user_id} className="flex justify-between items-center py-2 px-3">
                      <div className="font-bold">{idx+1}位. {item.users?.username || "NPC"}</div>
                      <div className="text-neon-cyan">{item.rank_points} pt</div>
                    </OutlawCard>
                  ))}
                </div>
              </div>
            )}

            {pvpSubView === "defense" && (
              <div className="flex flex-col gap-4">
                {/* 防衛デッキ・作戦設定パネル */}
                <OutlawCard glowLine="left">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    🛡️ 防衛デッキ・作戦設定
                  </h3>
                  
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">防衛時の作戦AI:</label>
                    <select 
                      value={selectedTactic} 
                      onChange={(e) => setSelectedTactic(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-neon-cyan outline-none"
                    >
                      <option value="OFFENSIVE">攻撃重視 (高火力スキルを優先使用)</option>
                      <option value="DEFENSIVE">防御重視 (自身へのシールド・防御を優先)</option>
                      <option value="HEALING">回復重視 (HPの低下した仲間を優先回復)</option>
                      <option value="BALANCED">バランス (回復と攻撃を状況に応じて選択)</option>
                      <option value="AP_CONSERVING">AP温存 (APを極力溜めつつ戦う)</option>
                      <option value="TACTICAL">特殊戦術 (バフ・デバフによる支援優先)</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">防衛メンバー選択 (最大5名):</label>
                    <div className="grid grid-cols-4 gap-2">
                      {userCharactersDbList.map((char: any) => {
                        const isSelected = selectedDefense.includes(char.id);
                        return (
                          <div 
                            key={char.id} 
                            onClick={() => handleToggleDefenseMember(char.id)}
                            className={`p-2 border rounded cursor-pointer text-center transition-colors
                              ${isSelected ? 'bg-neon-cyan/20 border-neon-cyan' : 'bg-gray-800 border-gray-700'}`}
                          >
                            <span className="text-xs block text-white truncate">{char.name || "構成員"}</span>
                            <span className="text-[10px] text-gray-400">Lv.{char.level}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <OutlawButton 
                    variant="primary" 
                    fullWidth 
                    onClick={handleSaveDeck} 
                  >
                    💾 防衛設定を保存
                  </OutlawButton>
                </OutlawCard>

                {/* 防衛履歴リスト */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-white m-0">防衛戦闘ログ</h3>
                    <OutlawButton variant="secondary" onClick={triggerNpcDefenseSimulation} disabled={simulatingDefense} className="text-xs px-2 py-1">
                      防衛襲撃シミュレート
                    </OutlawButton>
                  </div>
                  
                  <div className="list-container">
                    {pvpDefenseLogs.length === 0 && (
                      <div className="empty-message py-4 text-center text-color-gray font-size-9">
                        防衛履歴はありません。
                      </div>
                    )}
                    {pvpDefenseLogs.map((log: any) => (
                      <OutlawCard key={log.id} className="flex justify-between items-center py-2 px-3 mb-2">
                        <div>
                          <div className="font-bold text-sm">{log.attacker_name} ({log.result === "VICTORY" ? "防衛失敗" : "防衛成功"})</div>
                          <div className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString()}</div>
                        </div>
                        <span className={`font-bold ${log.points_change >= 0 ? "text-neon-cyan" : "text-neon-magenta"}`}>
                          {log.points_change >= 0 ? "+" : ""}{log.points_change} pt
                        </span>
                      </OutlawCard>
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
