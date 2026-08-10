"use client";

import React, { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "../../utils/supabase";
import HubPage from "./ui/HubPage";
import HeroPanel from "./ui/HeroPanel";
import Badge from "./ui/Badge";
import SubTabNav from "./ui/SubTabNav";
import PeriodStatus from "./ui/PeriodStatus";
import { useScreenReadiness } from "../hooks/useScreenReadiness";
import { SCREEN_ASSET_MANIFESTS } from "../lib/screenManifests";
import "./RankingTab.css";

type TabType = "power" | "guild_power" | "pvp" | "gvg" | "raid";
type SubTabType = "daily" | "season";

const RANKING_TABS = [
  { id: "power", label: "総合力" },
  { id: "guild_power", label: "ギルド総合力" },
  { id: "pvp", label: "PvP" },
  { id: "gvg", label: "GvG" },
  { id: "raid", label: "レイド" },
] as const;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getRankingPeriod(now: Date, subTab: SubTabType, category: TabType) {
  const shifted = new Date(now.getTime() + JST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  if (subTab === "season") {
    if (category === "pvp" || category === "raid") {
      const dayOfWeek = shifted.getUTCDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const start = new Date(Date.UTC(year, month, day - daysSinceMonday, 4) - JST_OFFSET_MS);
      if (start.getTime() > now.getTime()) start.setUTCDate(start.getUTCDate() - 7);
      return { start, end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) };
    }
    return {
      start: new Date(Date.UTC(year, month, 1) - JST_OFFSET_MS),
      end: new Date(Date.UTC(year, month + 1, 1) - JST_OFFSET_MS),
    };
  }
  const resetHour = category === "pvp" ? 4 : 0;
  let end = new Date(Date.UTC(year, month, day, resetHour) - JST_OFFSET_MS);
  if (end.getTime() <= now.getTime()) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { start: new Date(end.getTime() - 24 * 60 * 60 * 1000), end };
}

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days > 0 ? `${days}日 ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function RankingTab() {
  const {
    session,
    currentUser,
    userGuild,
    userGuildMember,
    totalPower,
    powerRankings,
    guildPowerRankings,
    pvpRankings,
    gvgBaseControls,
    raidDamageLogs,
    raidSeasonRankings,
    playCyberSe,
    fetchPlayerDetail,
    fetchGuildDetail,
    rankingActiveTab,
    setRankingActiveTab
  } = useGame();

  const activeTab: TabType = RANKING_TABS.some((tab) => tab.id === rankingActiveTab)
    ? rankingActiveTab as TabType
    : "power";
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("season");
  const [gvgSeasonPersonalRanks, setGvgSeasonPersonalRanks] = useState<any[]>([]);
  const [gvgSeasonLoading, setGvgSeasonLoading] = useState<boolean>(false);
  const [clock, setClock] = useState(() => new Date());
  const readiness = useScreenReadiness({
    assets: SCREEN_ASSET_MANIFESTS.ranking,
    dataReady: !(activeTab === "gvg" && activeSubTab === "season" && gvgSeasonLoading),
  });

  React.useEffect(() => {
    if (activeTab === "gvg" && activeSubTab === "season") {
      const loadRanks = async () => {
        setGvgSeasonLoading(true);
        try {
          const { data: ranks } = await supabase
            .from("user_gvg_ranks")
            .select("*")
            .order("season_points", { ascending: false });
          if (ranks) {
            const { data: profiles } = await supabase.rpc("get_public_profiles", { p_user_ids: ranks.map((r: any) => r.user_id) });
            const profileById = new Map((profiles || []).map((p: any) => [p.user_id, p]));
            setGvgSeasonPersonalRanks(ranks.map((r: any) => ({ ...r, users: profileById.get(r.user_id) || null })));
          }
        } catch (err: any) {
          console.warn("Failed to load GvG rankings:", err.message);
        } finally {
          setGvgSeasonLoading(false);
        }
      };
      loadRanks();
    }
  }, [activeTab, activeSubTab]);

  React.useEffect(() => {
    if (activeTab === "gvg" && activeSubTab === "daily") setActiveSubTab("season");
  }, [activeTab, activeSubTab]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 24時間以内のアクティブ基準 (デイリー)
  const oneDayAgo = useMemo(() => new Date(Date.now() - 24 * 60 * 60 * 1000), []);

  // -----------------------------------------
  // 1. 総合力ランキングの集計・ソート
  // -----------------------------------------
  const sortedPowerRankings = useMemo(() => {
    if (!powerRankings || powerRankings.length === 0) return [];
    
    let list = [...powerRankings];
    if (activeSubTab === "daily") {
      // デイリー：24時間以内に更新されたアクティブユーザーのみ
      list = list.filter((r: any) => new Date(r.updated_at) >= oneDayAgo);
    }
    return list.sort((a: any, b: any) => b.current_power - a.current_power);
  }, [powerRankings, activeSubTab, oneDayAgo]);

  // -----------------------------------------
  // 2. ギルド総合力ランキングのソート
  // -----------------------------------------
  const sortedGuildPowerRankings = useMemo(() => {
    if (!guildPowerRankings || guildPowerRankings.length === 0) return [];
    
    const list = [...guildPowerRankings];
    if (activeSubTab === "daily") {
      return list
        .filter((g: any) => g.daily_power > 0)
        .sort((a: any, b: any) => b.daily_power - a.daily_power);
    }
    return list.sort((a: any, b: any) => b.current_power - a.current_power);
  }, [guildPowerRankings, activeSubTab]);

  // -----------------------------------------
  // 3. PvPランキングのソート
  // -----------------------------------------
  const sortedPvpRankings = useMemo(() => {
    if (!pvpRankings || pvpRankings.length === 0) return [];
    
    const list = [...pvpRankings];
    if (activeSubTab === "daily") {
      return list.sort((a: any, b: any) => b.daily_wins - a.daily_wins);
    }
    return list.sort((a: any, b: any) => b.rank_points - a.rank_points);
  }, [pvpRankings, activeSubTab]);

  // -----------------------------------------
  // 4. GvGランキングの集計・ソート
  // -----------------------------------------
  const gvgRankingsData = useMemo(() => {
    if (!gvgBaseControls || gvgBaseControls.length === 0) return [];

    if (activeSubTab === "daily") {
      // 拠点ごとに支配ポイント順にギルドを並べる
      const bases = ["shinjuku", "shibuya", "ikebukuro", "roppongi", "akihabara"];
      const baseNames: { [key: string]: string } = {
        shinjuku: "新宿",
        shibuya: "渋谷",
        ikebukuro: "池袋", roppongi: "六本木", akihabara: "秋葉原",
        
      };

      return bases.map((baseId: string) => {
        const records = gvgBaseControls
          .filter((g: any) => g.base_id === baseId)
          .sort((a: any, b: any) => b.daily_points - a.daily_points);
        return {
          baseId,
          baseName: baseNames[baseId] || baseId,
          ranks: records
        };
      });
    } else {
      // ギルドごとに累計支配日数 (total_seasonal_days) を合計
      const guildMap: { [key: string]: { name: string, total_days: number } } = {};
      gvgBaseControls.forEach((ctrl: any) => {
        const guildId = ctrl.guild_id;
        const guildName = ctrl.guilds?.name || "他組織";
        if (guildId) {
          if (!guildMap[guildId]) {
            guildMap[guildId] = { name: guildName, total_days: 0 };
          }
          guildMap[guildId].total_days += (ctrl.total_seasonal_days || 0);
        }
      });

      return Object.entries(guildMap)
        .map(([id, val]) => ({
          guild_id: id,
          name: val.name,
          total_days: val.total_days
        }))
        .sort((a: any, b: any) => b.total_days - a.total_days);
    }
  }, [gvgBaseControls, activeSubTab]);

  // -----------------------------------------
  // 5. レイドランキングの集計・ソート
  // -----------------------------------------
  const raidRankingsData = useMemo(() => {
    if (activeSubTab === "daily") {
      // デイリー：現在のボスの与ダメージ
      if (!raidDamageLogs || raidDamageLogs.length === 0) return { personal: [], guild: [] };
      
      // 個人ダメージ
      const personal = [...raidDamageLogs].sort((a: any, b: any) => Number(b.damage_dealt) - Number(a.damage_dealt));

      // ギルド別合算
      const guildMap: { [key: string]: { name: string, dmg: number } } = {};
      raidDamageLogs.forEach((log: any) => {
        const guildId = log.guild_id;
        const guildName = log.guilds?.name;
        if (guildId && guildName) {
          if (!guildMap[guildId]) {
            guildMap[guildId] = { name: guildName, dmg: 0 };
          }
          guildMap[guildId].dmg += Number(log.damage_dealt);
        }
      });
      const guildRank = Object.entries(guildMap)
        .map(([id, val]: [string, any]) => ({ guild_id: id, name: val.name, damage_dealt: val.dmg }))
        .sort((a: any, b: any) => b.damage_dealt - a.damage_dealt);

      return { personal, guild: guildRank };
    } else {
      // シーズン：全ボス累計
      if (!raidSeasonRankings || raidSeasonRankings.length === 0) return { personal: [], guild: [] };

      // 個人累計
      const userMap: { [key: string]: { username: string, dmg: number } } = {};
      raidSeasonRankings.forEach((log: any) => {
        const userId = log.user_id;
        const username = log.users?.username || "名無しの極道";
        if (userId) {
          if (!userMap[userId]) {
            userMap[userId] = { username, dmg: 0 };
          }
          userMap[userId].dmg += Number(log.damage_dealt);
        }
      });
      const personal = Object.entries(userMap)
        .map(([id, val]) => ({ user_id: id, username: val.username, damage_dealt: val.dmg }))
        .sort((a: any, b: any) => b.damage_dealt - a.damage_dealt);

      // ギルド累計
      const guildMap: { [key: string]: { name: string, dmg: number } } = {};
      raidSeasonRankings.forEach((log: any) => {
        const guildId = log.guild_id;
        const guildName = log.guilds?.name;
        if (guildId && guildName) {
          if (!guildMap[guildId]) {
            guildMap[guildId] = { name: guildName, dmg: 0 };
          }
          guildMap[guildId].dmg += Number(log.damage_dealt);
        }
      });
      const guildRank = Object.entries(guildMap)
        .map(([id, val]) => ({ guild_id: id, name: val.name, damage_dealt: val.dmg }))
        .sort((a: any, b: any) => b.damage_dealt - a.damage_dealt);

      return { personal, guild: guildRank };
    }
  }, [raidDamageLogs, raidSeasonRankings, activeSubTab]);

  // -----------------------------------------
  // 6. 自分の順位とスコアの動的計算 (Sticky HUD用)
  // -----------------------------------------
  const myRankInfo = useMemo(() => {
    if (!session?.user?.id) return { rank: "集計待ち", score: "未集計" };
    const myId = session.user.id;
    const myGuildId = userGuildMember?.guild_id || userGuild?.id || currentUser?.guild_members?.[0]?.guild_id;

    if (activeTab === "power") {
      const idx = sortedPowerRankings.findIndex((r: any) => r.user_id === myId);
      if (idx !== -1) {
        return {
          rank: `${idx + 1}位`,
          score: `${sortedPowerRankings[idx].current_power.toLocaleString()}`
        };
      }
      return { rank: "圏外", score: Number(totalPower || 0).toLocaleString() };
    } else if (activeTab === "guild_power") {
      if (!myGuildId) return { rank: "無所属", score: "対象外" };
      const idx = sortedGuildPowerRankings.findIndex((g: any) => g.guild_id === myGuildId);
      if (idx !== -1) {
        const val = activeSubTab === "daily" ? sortedGuildPowerRankings[idx].daily_power : sortedGuildPowerRankings[idx].current_power;
        return {
          rank: `${idx + 1}位`,
          score: `${val.toLocaleString()}`
        };
      }
    } else if (activeTab === "pvp") {
      const idx = sortedPvpRankings.findIndex((p: any) => p.user_id === myId);
      if (idx !== -1) {
        const val = activeSubTab === "daily" ? `${sortedPvpRankings[idx].daily_wins} 勝` : `${sortedPvpRankings[idx].rank_points} pt`;
        return {
          rank: `${idx + 1}位`,
          score: val
        };
      }
    } else if (activeTab === "gvg") {
      if (activeSubTab === "daily") {
        if (!myGuildId) return { rank: "無所属", score: "対象外" };
        let maxPt = 0;
        let baseName = "";
        (gvgRankingsData as any[]).forEach((baseGroup: any) => {
          const idx = baseGroup.ranks.findIndex((item: any) => item.guild_id === myGuildId);
          if (idx !== -1 && baseGroup.ranks[idx].daily_points > maxPt) {
            maxPt = baseGroup.ranks[idx].daily_points;
            baseName = baseGroup.baseName;
          }
        });
        return {
          rank: baseName ? `${baseName}` : "圏外",
          score: maxPt > 0 ? `${maxPt.toLocaleString()} P` : "未集計"
        };
      } else {
        const idx = gvgSeasonPersonalRanks.findIndex((item: any) => item.user_id === myId);
        if (idx !== -1) {
          return {
            rank: `${idx + 1}位`,
            score: `${gvgSeasonPersonalRanks[idx].season_points.toLocaleString()} pt`
          };
        }
      }
    } else if (activeTab === "raid") {
      const personalList = (raidRankingsData as any).personal || [];
      const idx = personalList.findIndex((p: any) => p.user_id === myId);
      if (idx !== -1) {
        return {
          rank: `${idx + 1}位`,
          score: `${Number(personalList[idx].damage_dealt).toLocaleString()} Dmg`
        };
      }
    }

    return { rank: "圏外", score: "未集計" };
  }, [activeTab, activeSubTab, sortedPowerRankings, sortedGuildPowerRankings, sortedPvpRankings, gvgRankingsData, raidRankingsData, session, currentUser, userGuild, userGuildMember, totalPower]);

  const handleTabChange = (tab: TabType) => {
    setRankingActiveTab(tab);
  };

  const handleSubTabChange = (sub: SubTabType) => {
    playCyberSe("click");
    setActiveSubTab(sub);
  };

  const rankingPeriod = getRankingPeriod(clock, activeSubTab, activeTab);
  const periodFormatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rankingUpdateSources = activeTab === "power" ? powerRankings
    : activeTab === "guild_power" ? guildPowerRankings
      : activeTab === "pvp" ? pvpRankings
        : activeTab === "gvg" ? (activeSubTab === "season" ? gvgSeasonPersonalRanks : gvgBaseControls)
          : activeSubTab === "season" ? raidSeasonRankings : raidDamageLogs;
  const updateTimestamps = rankingUpdateSources
    .map((entry: any) => new Date(entry.updated_at || entry.created_at || "").getTime())
    .filter((value: number) => Number.isFinite(value));
  const latestUpdate = updateTimestamps.length > 0
    ? new Date(Math.max(...updateTimestamps))
    : null;

  return (
    <HubPage
      className="ranking-tab-view"
      eyebrow="RANKING / SEASON"
      title="ランキング"
      description="街で競う者たちの現在地。報酬と更新期間を確認できます。"
      status={readiness.status}
      onRetry={readiness.retry}
    >
      <HeroPanel className="ranking-hero">
        <div className="ranking-hero-copy">
          <Badge tone="gold">MY STATUS</Badge>
          <strong>{myRankInfo.rank}</strong>
          <span>{myRankInfo.score}</span>
        </div>
        <p>選択中の部門における、あなたの順位とスコアです。</p>
      </HeroPanel>

      <SubTabNav
        className="ranking-category-nav"
        tabs={[...RANKING_TABS]}
        activeTabId={activeTab}
        onSelect={(tabId) => handleTabChange(tabId as TabType)}
      />

      {/* サブトグル（デイリー / シーズン） */}
      <div className="ranking-sub-tabs flex justify-center py-2">
        <div className="toggle-switch-container">
          {activeTab !== "gvg" && (
            <button
              className={`toggle-switch-btn ${activeSubTab === "daily" ? "active" : ""}`}
              onClick={() => handleSubTabChange("daily")}
            >
              デイリー
            </button>
          )}
          <button
            className={`toggle-switch-btn ${activeSubTab === "season" ? "active" : ""}`}
            onClick={() => handleSubTabChange("season")}
          >
            {activeTab === "pvp" || activeTab === "raid" ? "週間" : "シーズン"}
          </button>
        </div>
      </div>

      <PeriodStatus
        label={activeSubTab === "daily" ? "デイリー集計" : activeTab === "pvp" || activeTab === "raid" ? "週間集計" : "シーズン対象期間"}
        range={`${periodFormatter.format(rankingPeriod.start)} 〜 ${periodFormatter.format(rankingPeriod.end)}`}
        remaining={formatRemaining(rankingPeriod.end.getTime() - clock.getTime())}
        cadence="15分ごとに更新"
        updatedAt={latestUpdate ? periodFormatter.format(latestUpdate) : "取得待ち"}
        tone={activeTab === "raid" ? "danger" : activeTab === "gvg" ? "magenta" : "cyan"}
      />

      {/* ランキングリスト表示 */}
      <div className="ranking-content-area">
        {/* -------------------- 1. 総合力 -------------------- */}
        {activeTab === "power" && (
          <div className="list-container">
            {sortedPowerRankings.length > 0 ? (
              sortedPowerRankings.map((item: any, idx: number) => {
                const guildName = item.users?.guild_members?.[0]?.guilds?.name || "無所属";
                return (
                  <div
                    key={item.user_id}
                    className="list-item steel-row clickable-item active-scale-effect"
                    onClick={() => { playCyberSe("click"); fetchPlayerDetail(item.user_id); }}
                  >
                    <div className="item-left flex items-center gap-3">
                      <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                      <div className="flex-column">
                        <span className="item-title font-weight-bold">{item.users?.username || "名無しの極道"}</span>
                        <span className="item-desc font-size-7 text-secondary">ギルド: {guildName}</span>
                      </div>
                    </div>
                    <span className="font-weight-bold text-color-cyan font-size-9">{item.current_power.toLocaleString()}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-5 text-secondary">データがありません</div>
            )}
          </div>
        )}

        {/* -------------------- 2. ギルド総合力 -------------------- */}
        {activeTab === "guild_power" && (
          <div className="list-container">
            {sortedGuildPowerRankings.length > 0 ? (
              sortedGuildPowerRankings.map((item: any, idx: number) => (
                <div
                  key={item.guild_id}
                  className="list-item steel-row clickable-item active-scale-effect"
                  onClick={() => { playCyberSe("click"); fetchGuildDetail(item.guild_id); }}
                >
                  <div className="item-left flex items-center gap-3">
                    <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                    <span className="item-title font-weight-bold">{item.name}</span>
                  </div>
                  <span className="font-weight-bold text-color-cyan font-size-9">
                    {activeSubTab === "daily" ? item.daily_power.toLocaleString() : item.current_power.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-secondary">データがありません</div>
            )}
          </div>
        )}

        {/* -------------------- 3. PvP -------------------- */}
        {activeTab === "pvp" && (
          <div className="list-container">
            {sortedPvpRankings.length > 0 ? (
              sortedPvpRankings.map((item: any, idx: number) => (
                <div
                  key={item.user_id}
                  className="list-item steel-row clickable-item active-scale-effect"
                  onClick={() => { playCyberSe("click"); fetchPlayerDetail(item.user_id); }}
                >
                  <div className="item-left flex items-center gap-3">
                    <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                    <span className="item-title font-weight-bold">{item.users?.username || "名無しの極道"}</span>
                  </div>
                  <span className="font-weight-bold text-color-cyan font-size-9">
                    {activeSubTab === "daily" ? `${item.daily_wins} 勝` : `${item.rank_points} pt`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-5 text-secondary">データがありません</div>
            )}
          </div>
        )}

        {/* -------------------- 4. GvG -------------------- */}
        {activeTab === "gvg" && (
          <div>
            {activeSubTab === "daily" ? (
              // デイリー：拠点別
              <div className="flex-col-gap-3">
                {(gvgRankingsData as any[]).map((baseGroup) => (
                  <div key={baseGroup.baseId} className="battle-card border-cyan p-3">
                    <span className="battle-card-title block mb-2">{baseGroup.baseName} 日次支配</span>
                    <div className="list-container max-height-90">
                      {baseGroup.ranks.length > 0 ? (
                        baseGroup.ranks.map((item: any, idx: number) => (
                          <div
                            key={item.guild_id}
                            className="list-item py-1 clickable-item active-scale-effect"
                            onClick={() => { playCyberSe("click"); fetchGuildDetail(item.guild_id); }}
                          >
                            <span className="font-size-8 font-weight-bold text-white">{idx + 1}位. {item.guilds?.name || "他組織"}</span>
                            <span className="font-size-8 text-color-cyan">{item.daily_points.toLocaleString()} P</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-2 font-size-8 text-secondary">縄張り争いの形跡がありません</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // シーズン：個人シーズン累計ポイント
              <div className="list-container">
                {gvgSeasonLoading ? (
                  <div className="text-center py-5">
                    <span className="simple-spinner" />
                  </div>
                ) : gvgSeasonPersonalRanks.length > 0 ? (
                  gvgSeasonPersonalRanks.map((item: any, idx: number) => {
                    const guildName = item.users?.guild_members?.[0]?.guilds?.name || "無所属";
                    return (
                      <div
                        key={item.user_id}
                        className="list-item steel-row clickable-item active-scale-effect"
                        onClick={() => { playCyberSe("click"); fetchPlayerDetail(item.user_id); }}
                      >
                        <div className="item-left flex items-center gap-3">
                          <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                          <div className="flex-column">
                            <span className="item-title font-weight-bold">{item.users?.username || "名無しの極道"}</span>
                            <span className="item-desc font-size-7 text-secondary">ギルド: {guildName}</span>
                          </div>
                        </div>
                        <span className="font-weight-bold text-color-cyan font-size-9">
                          {item.season_points.toLocaleString()} pt
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-5 text-secondary">データがありません</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* -------------------- 5. レイド -------------------- */}
        {activeTab === "raid" && (
          <div className="flex-col-gap-3">
            <div className="battle-card border-magenta p-3">
              <span className="battle-card-title block mb-2">個人ダメージランキング</span>
              <div className="list-container max-height-90">
                {(raidRankingsData as any).personal && (raidRankingsData as any).personal.length > 0 ? (
                  (raidRankingsData as any).personal.map((item: any, idx: number) => (
                    <div
                      key={item.user_id || idx}
                      className="list-item py-1 clickable-item active-scale-effect"
                      onClick={() => {
                        if (item.user_id) {
                          playCyberSe("click");
                          fetchPlayerDetail(item.user_id);
                        }
                      }}
                    >
                      <span className="font-size-8 font-weight-bold text-white">
                        {idx + 1}位. {item.username || item.users?.username || "名無しの極道"}
                      </span>
                      <span className="font-size-8 text-color-cyan">{Number(item.damage_dealt).toLocaleString()} Dmg</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 font-size-8 text-secondary">ダメージログがありません</div>
                )}
              </div>
            </div>

            <div className="battle-card border-magenta p-3">
              <span className="battle-card-title block mb-2">ギルドダメージランキング</span>
              <div className="list-container max-height-90">
                {(raidRankingsData as any).guild && (raidRankingsData as any).guild.length > 0 ? (
                  (raidRankingsData as any).guild.map((item: any, idx: number) => (
                    <div
                      key={item.guild_id || idx}
                      className="list-item py-1 clickable-item active-scale-effect"
                      onClick={() => {
                        if (item.guild_id) {
                          playCyberSe("click");
                          fetchGuildDetail(item.guild_id);
                        }
                      }}
                    >
                      <span className="font-size-8 font-weight-bold text-white">
                        {idx + 1}位. {item.name}
                      </span>
                      <span className="font-size-8 text-color-cyan">{Number(item.damage_dealt).toLocaleString()} Dmg</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 font-size-8 text-secondary">ダメージログがありません</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </HubPage>
  );
}
