"use client";

import React from "react";
import { useGame } from "../context/GameContext";
import "./PvpTab.css";
import SubTabNav from "./ui/SubTabNav";
import OutlawCard from "./ui/OutlawCard";
import OutlawButton from "./ui/OutlawButton";
import Badge from "./ui/Badge";
import HubPage from "./ui/HubPage";
import ScreenState from "./ui/ScreenState";
import { useScreenReadiness } from "../hooks/useScreenReadiness";
import { SCREEN_ASSET_MANIFESTS } from "../lib/screenManifests";
import CharacterPresentation from "./character/CharacterPresentation";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import { getCharacterLocationBackground, resolveCharacterLocationKey } from "@/utils/characterVisualAssets";

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

export default function PvpTab() {
  const {
    session,
    pvpRate,
    pvpSubView,
    setPvpSubView,
    battleLoading,
    upgradeLoading,
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
    pvpPoints,
    pvpNextRecoveryAt,
    totalPower,
    currentBaseId,
    selectedLeader,
  } = useGame();

  const [selectedDefense, setSelectedDefense] = React.useState<string[]>([]);
  const [selectedTactic, setSelectedTactic] = React.useState<string>("ATTACK_PRIORITY");
  const [clock, setClock] = React.useState(() => Date.now());
  const initialOpponentFetchRef = React.useRef<string | null>(null);
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
    if (pvpPoints >= 5 || !pvpNextRecoveryAt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pvpNextRecoveryAt, pvpPoints]);

  React.useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || pvpSubView !== "opponents" || opponentsLoading || pvpOpponents.length > 0) return;
    const fetchKey = `${userId}:${pvpRate}`;
    if (initialOpponentFetchRef.current === fetchKey) return;
    initialOpponentFetchRef.current = fetchKey;
    void fetchPvpOpponents(userId, pvpRate);
  }, [fetchPvpOpponents, opponentsLoading, pvpOpponents.length, pvpRate, pvpSubView, session?.user?.id]);

  const ownPvpRank = React.useMemo(() => {
    const sorted = [...pvpRankings].sort((left: any, right: any) => Number(right.rank_points || 0) - Number(left.rank_points || 0));
    const index = sorted.findIndex((entry: any) => entry.user_id === session?.user?.id);
    const row = index >= 0 ? sorted[index] : null;
    return row?.rank_position || (index >= 0 ? index + 1 : null);
  }, [pvpRankings, session?.user?.id]);

  const recoveryCountdown = React.useMemo(() => {
    if (pvpPoints >= 5 || !pvpNextRecoveryAt) return null;
    const remaining = Math.max(0, new Date(pvpNextRecoveryAt).getTime() - clock);
    const seconds = Math.floor(remaining / 1000);
    return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, [clock, pvpNextRecoveryAt, pvpPoints]);

  const defenseCharactersFor = (opponent: any) => [...(opponent.defense_characters || [])]
    .sort((left: any, right: any) => Number(left.slot || 0) - Number(right.slot || 0));
  const playerLeaderMaster = CHARACTERS_MASTER.find((character: any) => character.id === selectedLeader);
  const heroOpponent = pvpOpponents[0];
  const heroOpponentLeader = heroOpponent ? defenseCharactersFor(heroOpponent)[0] : null;
  const pvpBackgroundPath = resolveCharacterLocationKey(currentBaseId) ? getCharacterLocationBackground(currentBaseId) : undefined;

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
        <section className="pvp-hero" style={pvpBackgroundPath ? { "--pvp-hero-bg": `url(${pvpBackgroundPath})` } as React.CSSProperties : undefined} aria-label="PvP対戦">
          <div className="pvp-hero-shade" aria-hidden="true" />
          <CharacterPresentation className="pvp-hero-fighter is-player" src={playerLeaderMaster ? getCharacterTransparentImg(playerLeaderMaster.name) : undefined} alt={playerLeaderMaster?.jpName || "PLAYER"} variant="battle-leader" />
          <div className="pvp-hero-title"><small>FIGHT</small><strong>喧嘩</strong><span>PVP</span></div>
          <CharacterPresentation className="pvp-hero-fighter is-opponent" src={heroOpponentLeader?.asset_identifier || undefined} alt={heroOpponentLeader?.display_name || "OPPONENT"} variant="battle-leader" />
        </section>
        <section className="pvp-self-summary" aria-label="自分のPvP情報">
          <div><small>順位</small><strong>{ownPvpRank ? `#${ownPvpRank}` : "圏外"}</strong></div>
          <div><small>RATING</small><strong>{pvpRate.toLocaleString()}</strong></div>
          <div><small>総合力</small><strong>{Number(totalPower || 0).toLocaleString()}</strong></div>
        </section>

        <section className="pvp-point-strip" aria-label="PvP Point">
          <div><small>PvP Point</small><strong>{pvpPoints}<span>/5</span></strong></div>
          <span>{pvpPoints >= 5 ? "最大" : recoveryCountdown ? `次回復 ${recoveryCountdown}` : "回復時刻を同期中"}</span>
        </section>

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

                <details className="pvp-rules-help">
                  <summary>公式戦・模擬戦のルール</summary>
                  <p><b>公式戦</b> PvP Point 1消費・勝利 CASH 500・敗北 CASH 250・Rating変動あり</p>
                  <p><b>模擬戦</b> 消費・報酬・Rating・Mission進捗なし</p>
                </details>

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
                          <div className="pvp-opponent-heading"><div><div className="pvp-opponent-name">{op.opponent_username}</div><div className="pvp-opponent-guild">{op.opponent_guild_name || "無所属"}</div></div><strong>#{op.opponent_rank || "-"}</strong></div>
                          <div className="pvp-opponent-leader"><span>LEADER</span><strong>{defenseCharactersFor(op)[0]?.display_name || "未設定"}</strong></div>
                          <div className="pvp-opponent-deck" aria-label={`${op.opponent_username}の防衛メンバー`}>
                            {defenseCharactersFor(op).map((character: any) => <CharacterPresentation
                              key={`${op.opponent_user_id}-${character.slot}`}
                              src={character.asset_identifier || undefined}
                              alt={character.display_name || "防衛キャラクター"}
                              variant="thumbnail"
                              rarity={character.rarity || "N"}
                              name={character.display_name}
                              level={Number(character.level || 1)}
                            />)}
                          </div>
                          <div className="pvp-opponent-meta">
                            <Badge tone="cyan">RATING {op.opponent_points}</Badge>
                            <span className="pvp-opponent-power">総合力 {Number(op.opponent_power || 0).toLocaleString()}</span>
                            <span className={`pvp-power-difference ${Number(op.opponent_power || 0) > Number(totalPower || 0) ? "is-higher" : "is-lower"}`}>総合力差 {Number(op.opponent_power || 0) - Number(totalPower || 0) >= 0 ? "+" : ""}{(Number(op.opponent_power || 0) - Number(totalPower || 0)).toLocaleString()}</span>
                            <Badge tone={op.opponent_class === "STRONGER" ? "warning" : op.opponent_class === "WEAKER" ? "neutral" : "cyan"}>{op.opponent_class === "STRONGER" ? "格上" : op.opponent_class === "WEAKER" ? "格下" : "同格"}</Badge>
                            <span>WIN +{Number(op.win_rating_delta || 0)} / LOSE {Number(op.loss_rating_delta || 0)}</span>
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
                            op.defense_character_ids,
                            undefined,
                            undefined,
                            undefined,
                            {
                              opponentLabel: op.opponent_username,
                              opponentLeaderCharacterId: [...(op.defense_characters || [])].sort((a: any, b: any) => Number(a.slot || 0) - Number(b.slot || 0))[0]?.character_id,
                              opponentLeaderName: [...(op.defense_characters || [])].sort((a: any, b: any) => Number(a.slot || 0) - Number(b.slot || 0))[0]?.display_name,
                              opponentTotalPower: Number(op.opponent_power || 0),
                              backgroundPath: pvpBackgroundPath,
                              backgroundLabel: String(currentBaseId || ""),
                            }
                          )}
                        >
                          対戦する
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
                    <label className="text-xs text-gray-400 block mb-1">防衛メンバー選択　{selectedDefense.length}/5名</label>
                    <div className="pvp-defense-grid">
                      {userCharactersDbList.map((char: any) => {
                        const isSelected = selectedDefense.includes(char.id);
                        const master: any = CHARACTERS_MASTER.find((entry: any) => entry.id === char.character_id) || CHARACTERS_MASTER[0];
                        return (
                          <button
                            type="button"
                            key={char.id} 
                            onClick={() => handleToggleDefenseMember(char.id)}
                            className={`pvp-defense-member ${isSelected ? "selected" : ""}`}
                            aria-pressed={isSelected}
                          >
                            <span className="pvp-defense-check">{isSelected ? "✓" : "+"}</span>
                            <CharacterPresentation src={getCharacterTransparentImg(master.name)} alt={master.jpName} variant="thumbnail" rarity={master.rarity || "N"} />
                            <span className="pvp-defense-name">{master.jpName || "キャラクター"}</span>
                            <span className="pvp-defense-level">Lv.{char.level}</span>
                          </button>
                        );
                      })}
                      {userCharactersDbList.length === 0 && (
                        <div className="pvp-defense-empty">防衛に登録できるキャラクターがいません。</div>
                      )}
                    </div>
                  </div>

                  <OutlawButton 
                    variant="primary" 
                    fullWidth 
                    onClick={handleSaveDeck} 
                    disabled={upgradeLoading}
                  >
                    {upgradeLoading ? "保存中..." : "防衛設定を保存"}
                  </OutlawButton>
                </OutlawCard>

                {/* 防衛履歴リスト */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-white m-0">防衛戦闘ログ</h3>
                    <OutlawButton variant="secondary" onClick={triggerNpcDefenseSimulation} disabled={simulatingDefense} className="text-xs px-2 py-1">
                      {simulatingDefense ? "模擬戦準備中…" : "NPC模擬戦"}
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
