"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./PvpTab.css";
import SubTabNav from "./ui/SubTabNav";
import OutlawCard from "./ui/OutlawCard";
import OutlawButton from "./ui/OutlawButton";
import Badge from "./ui/Badge";
import HeroPanel from "./ui/HeroPanel";
import HubPage from "./ui/HubPage";
import ScreenState from "./ui/ScreenState";
import PeriodStatus from "./ui/PeriodStatus";
import { useScreenReadiness } from "../hooks/useScreenReadiness";
import { SCREEN_ASSET_MANIFESTS } from "../lib/screenManifests";

const tacticNames: { [key: string]: string } = {
  ATTACK_PRIORITY: "攻撃優先",
  HEAL_PRIORITY: "回復優先",
  SKILL_PRIORITY: "スキル優先",
  BALANCED: "バランス",
  WEAKNESS_FOCUS: "弱点集中",
  // 保存済みデッキの表示互換
  OFFENSIVE: "攻撃優先",
  HEALING: "回復優先",
  TACTICAL: "弱点集中"
};

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function PvpTab() {
  const {
    session,
    pvpRate,
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
    triggerNpcDefenseSimulation,
    simulatingDefense,
    pvpDefenseLogs,
    playCyberSe,
    setActiveTab,
    setRankingActiveTab,
  setConfirmDialogConfig,
    setGlobalInteractionBlocking,
    pvpPoints
  } = useGame();

  const [selectedDefense, setSelectedDefense] = React.useState<string[]>([]);
  const [selectedTactic, setSelectedTactic] = React.useState<string>("ATTACK_PRIORITY");
  const [clock, setClock] = React.useState(() => new Date());
  const isInitialOpponentLoad = pvpSubView === "opponents" && opponentsLoading && pvpOpponents.length === 0;
  const readiness = useScreenReadiness({
    assets: SCREEN_ASSET_MANIFESTS.pvp,
    dataReady: !battleLoading && !isInitialOpponentLoad,
  });

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
      setSelectedTactic(myPvpDefenseDeck.tactic || "ATTACK_PRIORITY");
    }
  }, [myPvpDefenseDeck]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const jstNow = new Date(clock.getTime() + 9 * 60 * 60 * 1000);
  const dailyReset = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate(), 4) - 9 * 60 * 60 * 1000);
  if (dailyReset.getTime() <= clock.getTime()) dailyReset.setUTCDate(dailyReset.getUTCDate() + 1);

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
      fetchPvpOpponents(session.user.id, pvpRate);
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
    <HubPage
      className="pvp-view"
      eyebrow="FIGHT / SOLO COMPETITION"
      title="喧嘩（PvP）"
      description="相手を選び、出撃編成と残り挑戦回数を確認して対戦する。"
      status={readiness.status}
      onRetry={readiness.retry}
    >
        <HeroPanel className="pvp-status-hero">
          <div className="pvp-status-heading">現在のレート</div>
          <div className="pvp-status-rate">{pvpRate.toLocaleString()} <small>pt</small></div>
          <div className="pvp-status-meta">
            <Badge tone={pvpPoints > 0 ? "cyan" : "warning"}>挑戦 {pvpPoints}/5</Badge>
            <span>1時間ごとに1回復</span>
          </div>
        </HeroPanel>

        <PeriodStatus
          label="デイリー挑戦"
          range="毎日 04:00 更新"
          remaining={formatRemaining(dailyReset.getTime() - clock.getTime())}
          cadence="対戦相手は更新ボタンで再抽選"
        />

        <SubTabNav
          tabs={[
            { id: "opponents", label: "対戦相手" },
            { id: "defense", label: "防衛・履歴" },
          ]}
          activeTabId={pvpSubView}
          onSelect={setPvpSubView}
        />

        {battleLoading ? <ScreenState kind="loading" compact /> : (
          <div className="pvp-content-area">
            {pvpSubView === "opponents" && (
              <div className="opponents-subtab">
                <div className="flex gap-2 mb-4">
                  <OutlawButton variant="secondary" className="flex-1" onClick={handleRefreshOpponents} isLoading={opponentsLoading}>
                    対戦相手更新
                  </OutlawButton>
                  <OutlawButton variant="secondary" className="flex-1 text-neon-gold" onClick={handleNavigateToRanking}>
                    PvPランキング
                  </OutlawButton>
                </div>

                {opponentsLoading && pvpOpponents.length === 0 ? (
                  <ScreenState kind="loading" compact />
                ) : (
                  <div className="list-container">
                    {pvpOpponents.length === 0 && (
                      <ScreenState kind="empty" compact title="対戦相手が見つかりません" message="時間を置いて更新してください。" />
                    )}
                    {pvpOpponents.map((op: any) => (
                      <OutlawCard key={op.opponent_user_id} className="pvp-opponent-card">
                        <div className="pvp-opponent-copy">
                          <div className="pvp-opponent-name">{op.opponent_username}</div>
                          <div className="pvp-opponent-guild">{op.opponent_guild_name}</div>
                          <div className="pvp-opponent-meta">
                            <Badge tone="cyan">{op.opponent_points} pt</Badge>
                            <span>作戦 {tacticNames[op.tactic] || "攻撃優先"}</span>
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
                    防衛デッキ・作戦設定
                  </h3>
                  
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">防衛時の作戦AI:</label>
                    <select 
                      value={selectedTactic} 
                      onChange={(e) => setSelectedTactic(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-neon-cyan outline-none"
                    >
                      <option value="ATTACK_PRIORITY">攻撃優先 (攻撃スキルを優先使用)</option>
                      <option value="HEAL_PRIORITY">回復優先 (HPの低下した仲間を優先回復)</option>
                      <option value="SKILL_PRIORITY">スキル優先 (使用可能なスキルを優先)</option>
                      <option value="BALANCED">バランス (回復と攻撃を状況に応じて選択)</option>
                      <option value="WEAKNESS_FOCUS">弱点集中 (有利属性の敵を優先)</option>
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
                    防衛設定を保存
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
    </HubPage>
  );
}
