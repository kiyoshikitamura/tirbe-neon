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
import { supabase } from "@/utils/supabase";
import PvpDeckPresentation from "./pvp/PvpDeckPresentation";
import RankPresentation from "./presentation/RankPresentation";
import { SkillDetailDialog } from "./skill/SkillPresentation";
import type { SkillCardMaster } from "@/utils/skills_master_data";
import CanonicalDialog from "./ui/CanonicalDialog";
import UserIdentityRow from "./profile/UserIdentityRow";
import StatusMetric from "./presentation/StatusMetric";

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
    userSkillsList,
    startCardBattle,
    pvpRankings,
    setPvpRankings,
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
    selectedMembers,
    userItems,
    handleUseItem,
    fetchPlayerDetail,
  } = useGame();

  const [selectedDefense, setSelectedDefense] = React.useState<string[]>([]);
  const [selectedTactic, setSelectedTactic] = React.useState<string>("ATTACK_PRIORITY");
  const [clock, setClock] = React.useState(() => Date.now());
  const [selectedSkill, setSelectedSkill] = React.useState<SkillCardMaster | null>(null);
  const [bpDialog, setBpDialog] = React.useState<"shortage" | "recovery" | null>(null);
  const initialOpponentFetchRef = React.useRef<string | null>(null);
  const rankingAuthorityKey = `${session?.user?.id || "signed-out"}:${pvpRate}`;
  const [rankingAuthority, setRankingAuthority] = React.useState<{ key: string; standing: { rankPosition: number; rankPoints: number } | null } | null>(null);
  const ownPvpStanding = rankingAuthority?.key === rankingAuthorityKey ? rankingAuthority.standing : undefined;
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
    if (!userId) return;
    let cancelled = false;
    void supabase.rpc("get_public_pvp_rankings", { p_daily: true, p_limit: 100, p_offset: 0 }).then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data)) return;
      const rows = data.map((row: any) => ({
        ...row,
        users: { username: row.username, avatar_url: row.avatar_url, guild_members: row.guild_id ? [{ guild_id: row.guild_id, guilds: row.guild_name ? { name: row.guild_name } : null }] : [] },
      }));
      setPvpRankings(rows);
      const ownRow = rows.find((row: any) => row.user_id === userId);
      setRankingAuthority({
        key: rankingAuthorityKey,
        standing: ownRow ? {
          rankPosition: Number(ownRow.rank_position),
          rankPoints: Number(ownRow.rank_points),
        } : null,
      });
    });
    return () => { cancelled = true; };
  }, [rankingAuthorityKey, session?.user?.id, setPvpRankings]);

  React.useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || pvpSubView !== "opponents" || opponentsLoading || pvpOpponents.length > 0) return;
    const currentRate = ownPvpStanding?.rankPoints ?? pvpRate;
    const fetchKey = `${userId}:${currentRate}`;
    if (initialOpponentFetchRef.current === fetchKey) return;
    initialOpponentFetchRef.current = fetchKey;
    void fetchPvpOpponents(userId, currentRate);
  }, [fetchPvpOpponents, opponentsLoading, ownPvpStanding?.rankPoints, pvpOpponents.length, pvpRate, pvpSubView, session?.user?.id]);

  const displayedPvpRate = ownPvpStanding?.rankPoints ?? pvpRate;

  const recoveryCountdown = React.useMemo(() => {
    if (pvpPoints >= 5 || !pvpNextRecoveryAt) return null;
    const remaining = Math.max(0, new Date(pvpNextRecoveryAt).getTime() - clock);
    const seconds = Math.floor(remaining / 1000);
    return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, [clock, pvpNextRecoveryAt, pvpPoints]);

  const defenseCharactersFor = (opponent: any) => [...(opponent.defense_characters || [])]
    .sort((left: any, right: any) => Number(left.slot || 0) - Number(right.slot || 0));
  const myDeckCharacters = React.useMemo(() => {
    const ids = (selectedMembers || []).slice(0, 5);
    return ids.map((ownedId: string) => {
      const owned = userCharactersDbList.find((entry: any) => entry.character_id === ownedId);
      const master = CHARACTERS_MASTER.find((entry: any) => entry.id === ownedId);
      return { ownedId, owned, master };
    });
  }, [selectedMembers, userCharactersDbList]);
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

  const handleRefreshOpponents = async () => {
    playCyberSe("click");
    if (session?.user?.id) {
      await fetchPvpOpponents(session.user.id, displayedPvpRate, { refresh: true });
    }
  };

  const pvpTicketQuantity = Number((userItems || []).find((item: any) => item.item_id === "PVP_POINT_TICKET")?.quantity || 0);
  const openBpRecoveryDialog = () => setBpDialog("recovery");
  const openBpShortageDialog = () => setBpDialog("shortage");

  const handleNavigateToRanking = () => {
    playCyberSe("click");
    if (setActiveTab && setRankingActiveTab) {
      setActiveTab("ranking");
      setRankingActiveTab("pvp");
    }
  };

  return (
    <>
    <HubPage
      className="pvp-view"
      title="喧嘩（PvP）"
      status={readiness.status}
      onRetry={readiness.retry}
      hideVisualHeader
    >
        <section className="pvp-hero" style={pvpBackgroundPath ? { "--pvp-hero-bg": `url(${pvpBackgroundPath})` } as React.CSSProperties : undefined} aria-label="PvP対戦">
          <div className="pvp-hero-shade" aria-hidden="true" />
          <CharacterPresentation className="pvp-hero-fighter is-player" src={playerLeaderMaster ? getCharacterTransparentImg(playerLeaderMaster.name) : undefined} alt={playerLeaderMaster?.jpName || "PLAYER"} variant="battle-leader" />
          <CharacterPresentation className="pvp-hero-fighter is-opponent" src={heroOpponentLeader?.asset_identifier || undefined} alt={heroOpponentLeader?.display_name || "OPPONENT"} variant="battle-leader" />
        </section>
        <section className="pvp-self-summary" aria-label="自分のPvP情報">
          <StatusMetric label="順位" value={ownPvpStanding === undefined ? "—" : <RankPresentation rank={ownPvpStanding?.rankPosition} />} />
          <StatusMetric label="RATE" value={displayedPvpRate.toLocaleString()} />
          <StatusMetric label="BP" value={pvpPoints} suffix={<span>/5</span>} />
        </section>

        <section className="pvp-point-strip" aria-label="BP回復状況">
          <div><small>BP回復</small></div>
          <span>{pvpPoints >= 5 ? "最大" : recoveryCountdown ? `次回復 ${recoveryCountdown}` : "回復時刻を同期中"}</span>
          {pvpPoints < 5 && <button type="button" className="pvp-recovery-button" onClick={openBpRecoveryDialog}>回復</button>}
        </section>

        <section className="pvp-my-deck" aria-label="自分のデッキ">
          <div className="pvp-section-heading"><strong>MY DECK</strong><span>総合力 {Number(totalPower || 0).toLocaleString()}</span></div>
          <PvpDeckPresentation ariaLabel="自分の出撃メンバー" showSkills onSkillSelect={setSelectedSkill} members={myDeckCharacters.map(({ ownedId, owned, master }: any) => {
              const equippedSkills = (userSkillsList || []).filter((entry: any) => entry.equipped_character_id === owned?.id).map((entry: any) => entry.skill_card_id).filter(Boolean).slice(0, 6);
              return { key: ownedId, characterId: master?.id || ownedId, name: master?.jpName, level: Number(owned?.level || 1), skillIds: equippedSkills };
            })} />
          {myDeckCharacters.length === 0 && <span className="pvp-my-deck-empty">出撃編成を設定してください</span>}
        </section>

        <SubTabNav
          tabs={[
            { id: "opponents", label: "対戦" },
            { id: "defense", label: "防衛・履歴" },
          ]}
          activeTabId={pvpSubView}
          onSelect={setPvpSubView}
        />

        {battleLoading ? <ScreenState kind="loading" compact /> : (
          <div className="pvp-content-area">
            {pvpSubView === "opponents" && (
              <div className="opponents-subtab">
                <div className="pvp-compact-actions">
                  <OutlawButton variant="secondary" onClick={handleRefreshOpponents} isLoading={opponentsLoading}>
                    更新
                  </OutlawButton>
                  <OutlawButton variant="secondary" className="text-neon-gold" onClick={handleNavigateToRanking}>
                    ランキング
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
                      <OutlawCard key={op.opponent_user_id} className="pvp-opponent-card" data-opponent-user-id={op.opponent_user_id}>
                        <div className="pvp-opponent-copy">
                          <div className="pvp-opponent-heading"><UserIdentityRow userName={op.opponent_username} guildName={op.opponent_guild_name} leaderCharacterId={defenseCharactersFor(op)[0]?.character_master_id} leaderImageSrc={defenseCharactersFor(op)[0]?.asset_identifier} onOpen={() => fetchPlayerDetail(op.opponent_user_id)} /><strong><RankPresentation label="順位" rank={op.opponent_rank} /></strong></div>
                          <PvpDeckPresentation className="pvp-opponent-deck" ariaLabel={`${op.opponent_username}の防衛メンバー`} onMemberSelect={() => fetchPlayerDetail(op.opponent_user_id)} members={defenseCharactersFor(op).map((character: any) => ({ key: `${op.opponent_user_id}-${character.slot}`, characterId: character.character_master_id, name: character.display_name, level: Number(character.level || 1), imageSrc: character.asset_identifier || undefined }))} />
                          <div className="pvp-opponent-meta">
                            <Badge tone="cyan">RATE {op.opponent_points}</Badge>
                            <span className="pvp-opponent-power">総合力 {Number(op.opponent_power || 0).toLocaleString()}</span>
                            <span className={`pvp-power-difference ${Number(op.opponent_power || 0) > Number(totalPower || 0) ? "is-higher" : "is-lower"}`}>総合力差 {Number(op.opponent_power || 0) - Number(totalPower || 0) >= 0 ? "+" : ""}{(Number(op.opponent_power || 0) - Number(totalPower || 0)).toLocaleString()}</span>
                            <Badge tone={op.opponent_class === "STRONGER" ? "warning" : op.opponent_class === "WEAKER" ? "neutral" : "cyan"}>{op.opponent_class === "STRONGER" ? "格上" : op.opponent_class === "WEAKER" ? "格下" : "同格"}</Badge>
                            <span>WIN +{Number(op.win_rating_delta || 0)} / LOSE {Number(op.loss_rating_delta || 0)}</span>
                            <span>作戦 {tacticNames[op.tactic] || "攻撃優先"}</span>
                          </div>
                        </div>
                        <OutlawButton 
                          variant="danger" 
                          onClick={() => pvpPoints < 1 ? openBpShortageDialog() : startCardBattle(
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
                            <CharacterPresentation src={getCharacterTransparentImg(master.name)} alt={master.jpName} variant="thumbnail" rarity={master.rarity || "N"} frameKind="character" metadata={false} />
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
    {selectedSkill && <SkillDetailDialog skill={selectedSkill} onClose={() => setSelectedSkill(null)} />}
    {bpDialog === "shortage" && <CanonicalDialog title="BPが不足しています" onClose={() => setBpDialog(null)} actions={[
      { label: "閉じる", semantic: "secondary", onClick: () => setBpDialog(null) },
      { label: "回復する", semantic: "primary", onClick: () => setBpDialog("recovery") },
    ]}>対戦にはBPが1必要です。{`\n`}ファイトチケットで回復できます。</CanonicalDialog>}
    {bpDialog === "recovery" && <CanonicalDialog title="BP回復" onClose={() => setBpDialog(null)} actions={pvpTicketQuantity > 0 ? [
      { label: "キャンセル", semantic: "secondary", onClick: () => setBpDialog(null) },
      { label: "1枚使用", semantic: "primary", onClick: () => { setBpDialog(null); void handleUseItem("PVP_POINT_TICKET"); } },
    ] : [{ label: "閉じる", semantic: "secondary", onClick: () => setBpDialog(null) }]}>
      <div className="pvp-bp-recovery-copy"><strong>ファイトチケット</strong><span>所持 ×{pvpTicketQuantity}</span><span>BP　{pvpPoints} / 5 → {Math.min(5, pvpPoints + 1)} / 5</span>{pvpTicketQuantity === 0 && <em>ファイトチケットを所持していません。</em>}</div>
    </CanonicalDialog>}
    </>
  );
}
