"use client";

import React, { useState, useMemo } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "../../utils/supabase";
import HubPage from "./ui/HubPage";
import HeroPanel from "./ui/HeroPanel";
import Badge from "./ui/Badge";
import SubTabNav from "./ui/SubTabNav";
import PeriodStatus from "./ui/PeriodStatus";
import OutlawButton from "./ui/OutlawButton";
import { useScreenReadiness } from "../hooks/useScreenReadiness";
import { SCREEN_ASSET_MANIFESTS } from "../lib/screenManifests";
import "./RankingTab.css";

type TabType = "power" | "guild_power" | "pvp" | "gvg" | "raid";
type SubTabType = "daily" | "season";

const RANKING_TABS = [
  { id: "power", label: "総合力" },
  { id: "guild_power", label: "TRIBE総合力" },
  { id: "pvp", label: "PvP" },
  { id: "gvg", label: "GvG" },
  { id: "raid", label: "レイド" },
] as const;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getRankingPeriod(now: Date, subTab: SubTabType, category: TabType, season?: { starts_at: string; ends_at: string }) {
  const shifted = new Date(now.getTime() + JST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  if (subTab === "season") {
    if (season) return { start: new Date(season.starts_at), end: new Date(season.ends_at) };
    return {
      start: new Date(Date.UTC(year, month, 1) - JST_OFFSET_MS),
      end: new Date(Date.UTC(year, month + 1, 1) - JST_OFFSET_MS),
    };
  }
  const resetHour = 0;
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
    playCyberSe,
    fetchPlayerDetail,
    fetchGuildDetail,
    rankingActiveTab,
    setRankingActiveTab,
    setActiveTab
  } = useGame();

  const activeTab: TabType = RANKING_TABS.some((tab) => tab.id === rankingActiveTab)
    ? rankingActiveTab as TabType
    : "power";
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("season");
  const [gvgSeasonPersonalRanks, setGvgSeasonPersonalRanks] = useState<any[]>([]);
  const [gvgSeasonLoading, setGvgSeasonLoading] = useState<boolean>(false);
  const [clock, setClock] = useState(() => new Date());
  const [activationMilestones, setActivationMilestones] = useState<Set<string>>(new Set());
  const [freshPowerRankings, setFreshPowerRankings] = useState<any[] | null>(null);
  const [freshGuildPowerRankings, setFreshGuildPowerRankings] = useState<any[] | null>(null);
  const [freshPvpRankings, setFreshPvpRankings] = useState<any[] | null>(null);
  const [officialRaidRankings, setOfficialRaidRankings] = useState<any>({ personal: [], guild: [] });
  const [activeRaidInstances, setActiveRaidInstances] = useState<any[]>([]);
  const [selectedRaidInstanceId, setSelectedRaidInstanceId] = useState<string | null>(null);
  const [officialGvgRankings, setOfficialGvgRankings] = useState<any>({ guild: [], individual: [] });
  const [activeSeasons, setActiveSeasons] = useState<Record<string, any>>({});
  const rankingMilestoneStarted = React.useRef(false);
  const readiness = useScreenReadiness({
    assets: SCREEN_ASSET_MANIFESTS.ranking,
    dataReady: !(activeTab === "gvg" && activeSubTab === "season" && gvgSeasonLoading),
  });

  const effectivePowerRankings = freshPowerRankings ?? powerRankings;
  const effectiveGuildPowerRankings = freshGuildPowerRankings ?? guildPowerRankings;
  const effectivePvpRankings = freshPvpRankings ?? pvpRankings;

  React.useEffect(() => {
    let cancelled = false;
    void supabase.rpc("get_active_ranking_seasons").then(({ data }) => {
      if (cancelled || !Array.isArray(data)) return;
      setActiveSeasons(Object.fromEntries(data.map((season: any) => [season.ranking_type, season])));
    });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (activeTab === "power") {
        const { data } = await supabase.rpc("get_public_power_rankings", { p_daily: activeSubTab === "daily", p_limit: 100, p_offset: 0 });
        if (!cancelled && data) setFreshPowerRankings(data.map((row: any) => ({
          user_id: row.user_id, current_power: Number(row.current_power || 0), updated_at: row.updated_at,
          is_daily_active: Boolean(row.is_daily_active), rank_position: row.rank_position,
          users: { username: row.username, avatar_url: row.avatar_url, guild_members: row.guild_id ? [{ guild_id: row.guild_id, guilds: row.guild_name ? { name: row.guild_name } : null }] : [] },
        })));
      } else if (activeTab === "guild_power") {
        const { data } = await supabase.rpc("get_public_guild_power_rankings", { p_daily: activeSubTab === "daily", p_limit: 100, p_offset: 0 });
        if (!cancelled && data) setFreshGuildPowerRankings(data.map((row: any) => ({ ...row, current_power: Number(row.current_power || 0), daily_power: Number(row.daily_power || 0) })));
      } else if (activeTab === "pvp") {
        const { data } = await supabase.rpc("get_public_pvp_rankings", { p_daily: activeSubTab === "daily", p_limit: 100, p_offset: 0 });
        if (!cancelled && data) setFreshPvpRankings(data.map((row: any) => ({
          ...row,
          users: { username: row.username, avatar_url: row.avatar_url, guild_members: row.guild_id ? [{ guild_id: row.guild_id, guilds: row.guild_name ? { name: row.guild_name } : null }] : [] },
        })));
      } else if (activeTab === "gvg") {
        const { data } = await supabase.rpc("get_public_gvg_rankings", { p_limit: 100, p_offset: 0 });
        if (!cancelled && data) setOfficialGvgRankings(data);
      } else if (activeTab === "raid") {
        if (activeSubTab === "season") {
          const { data } = await supabase.rpc("get_raid_season_rankings", { p_limit: 100, p_offset: 0 });
          if (!cancelled && data) setOfficialRaidRankings(data);
        } else {
          const { data: raids } = await supabase.rpc("get_active_raids");
          const instances = Array.isArray(raids) ? raids : [];
          if (cancelled) return;
          setActiveRaidInstances(instances);
          const instanceId = selectedRaidInstanceId && instances.some((raid: any) => raid.id === selectedRaidInstanceId)
            ? selectedRaidInstanceId
            : instances[0]?.id || null;
          setSelectedRaidInstanceId(instanceId);
          if (instanceId) {
            const { data } = await supabase.rpc("get_raid_rankings", { p_instance_id: instanceId });
            if (!cancelled && data) setOfficialRaidRankings(data);
          } else {
            setOfficialRaidRankings({ personal: [], guild: [] });
          }
        }
      }
    };
    void refresh();
    return () => { cancelled = true; };
  }, [activeTab, activeSubTab, selectedRaidInstanceId]);

  React.useEffect(() => {
    setGvgSeasonPersonalRanks((officialGvgRankings.individual || []).map((row: any) => ({
      ...row,
      season_points: Number(row.actual_damage || 0),
      users: { username: row.username, guild_members: row.guild_id ? [{ guild_id: row.guild_id, guilds: row.guild_name ? { name: row.guild_name } : null }] : [] },
    })));
    setGvgSeasonLoading(false);
  }, [officialGvgRankings]);

  React.useEffect(() => {
    if (activeTab === "gvg" && activeSubTab === "daily") setActiveSubTab("season");
  }, [activeTab, activeSubTab]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (!session?.user?.id || rankingMilestoneStarted.current) return;
    rankingMilestoneStarted.current = true;
    void supabase.from("user_funnel_milestones").select("milestone").eq("user_id", session.user.id)
      .then(async ({ data }) => {
        const milestones = new Set<string>((data || []).map((row: any) => row.milestone));
        if (!milestones.has("ranking_viewed")) {
          const { error } = await supabase.rpc("record_client_funnel_event", {
            p_event_name: "ranking_viewed", p_source_screen: "ranking", p_source_cta: "screen_view",
            p_object_id: null, p_metadata: {},
          });
          if (!error) milestones.add("ranking_viewed");
        }
        setActivationMilestones(milestones);
      });
  }, [session?.user?.id]);

  // -----------------------------------------
  // 1. 総合力ランキングの集計・ソート
  // -----------------------------------------
  const sortedPowerRankings = useMemo(() => {
    if (!effectivePowerRankings || effectivePowerRankings.length === 0) return [];
    
    let list = [...effectivePowerRankings];
    if (activeSubTab === "daily") {
      // デイリー：24時間以内に更新されたアクティブユーザーのみ
      list = list.filter((r: any) => r.is_daily_active !== false);
    }
    return list.sort((a: any, b: any) => b.current_power - a.current_power);
  }, [effectivePowerRankings, activeSubTab]);

  // -----------------------------------------
  // 2. ギルド総合力ランキングのソート
  // -----------------------------------------
  const sortedGuildPowerRankings = useMemo(() => {
    if (!effectiveGuildPowerRankings || effectiveGuildPowerRankings.length === 0) return [];
    
    const list = [...effectiveGuildPowerRankings];
    if (activeSubTab === "daily") {
      return list
        .filter((g: any) => g.daily_power > 0)
        .sort((a: any, b: any) => b.daily_power - a.daily_power);
    }
    return list.sort((a: any, b: any) => b.current_power - a.current_power);
  }, [effectiveGuildPowerRankings, activeSubTab]);

  // -----------------------------------------
  // 3. PvPランキングのソート
  // -----------------------------------------
  const sortedPvpRankings = useMemo(() => {
    if (!effectivePvpRankings || effectivePvpRankings.length === 0) return [];
    
    const list = [...effectivePvpRankings];
    if (activeSubTab === "daily") {
      return list.sort((a: any, b: any) => b.daily_wins - a.daily_wins);
    }
    return list.sort((a: any, b: any) => b.rank_points - a.rank_points);
  }, [effectivePvpRankings, activeSubTab]);

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
    return {
      personal: (officialRaidRankings.personal || []).map((row: any) => ({
        ...row, damage_dealt: Number(row.contribution || row.damage_dealt || 0),
      })),
      guild: (officialRaidRankings.guild || []).map((row: any) => ({
        ...row, name: row.guild_name || row.name, damage_dealt: Number(row.contribution || row.damage_dealt || 0),
      })),
    };
  }, [officialRaidRankings]);

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

  const rankingUserId = session?.user?.id;
  const rankGap = useMemo(() => {
    if (!rankingUserId) return null;
    const list = activeTab === "power" ? sortedPowerRankings : activeTab === "pvp" ? sortedPvpRankings : [];
    const index = list.findIndex((entry: any) => entry.user_id === rankingUserId);
    if (index <= 0) return index === 0 ? "現在トップ" : null;
    const score = (entry: any) => activeTab === "power" ? Number(entry.current_power || 0) : activeSubTab === "daily" ? Number(entry.daily_wins || 0) : Number(entry.rank_points || 0);
    return `上位まであと ${(score(list[index - 1]) - score(list[index]) + 1).toLocaleString()}`;
  }, [activeTab, activeSubTab, rankingUserId, sortedPowerRankings, sortedPvpRankings]);

  const handleTabChange = (tab: TabType) => {
    setRankingActiveTab(tab);
  };

  const handleSubTabChange = (sub: SubTabType) => {
    playCyberSe("click");
    setActiveSubTab(sub);
  };

  const openPlayerFromRanking = (userId: string, source: string) => {
    if (!userId) return;
    playCyberSe("click");
    void supabase.rpc("record_client_funnel_event", {
      p_event_name: "ranking_player_detail", p_source_screen: "ranking", p_source_cta: source,
      p_object_id: userId, p_metadata: { category: activeTab }
    });
    fetchPlayerDetail(userId);
  };

  const openGuildFromRanking = (guildId: string, source: string) => {
    if (!guildId) return;
    playCyberSe("click");
    void supabase.rpc("record_client_funnel_event", {
      p_event_name: "ranking_guild_detail", p_source_screen: "ranking", p_source_cta: source,
      p_object_id: guildId, p_metadata: { category: activeTab }
    });
    fetchGuildDetail(guildId);
  };

  const rankingType = activeTab === "guild_power" ? "GUILD_POWER" : activeTab.toUpperCase();
  const rankingPeriod = getRankingPeriod(clock, activeSubTab, activeTab, activeSeasons[rankingType]);
  const periodFormatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rankingUpdateSources = activeTab === "power" ? effectivePowerRankings
    : activeTab === "guild_power" ? effectiveGuildPowerRankings
      : activeTab === "pvp" ? effectivePvpRankings
        : activeTab === "gvg" ? (activeSubTab === "season" ? gvgSeasonPersonalRanks : gvgBaseControls)
          : [...(officialRaidRankings.personal || []), ...(officialRaidRankings.guild || [])];
  const updateTimestamps = rankingUpdateSources
    .map((entry: any) => new Date(entry.updated_at || entry.created_at || "").getTime())
    .filter((value: number) => Number.isFinite(value));
  const latestUpdate = updateTimestamps.length > 0
    ? new Date(Math.max(...updateTimestamps))
    : null;
  const activeCategoryLabel = RANKING_TABS.find((tab) => tab.id === activeTab)?.label || "総合力";
  const scoreLabel = activeTab === "power" ? "総合力"
    : activeTab === "guild_power" ? "ギルド総合力"
      : activeTab === "pvp" ? (activeSubTab === "daily" ? "勝利数" : "PvPポイント")
        : activeTab === "gvg" ? "シーズンポイント"
          : "累計ダメージ";

  return (
    <HubPage
      className="ranking-tab-view"
      eyebrow="RANKING / SEASON"
      title="ランキング"
      description="街で競う者たちの現在地。報酬と更新期間を確認できます。"
      status={readiness.status}
      onRetry={readiness.retry}
    >
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
            シーズン
          </button>
        </div>
      </div>

      <HeroPanel className="ranking-hero">
        <div className="ranking-hero-category">{activeCategoryLabel}</div>
        <div className="ranking-hero-copy">
          <Badge tone="gold">あなたの現在地</Badge>
          <strong>{myRankInfo.rank}</strong>
          <span>{scoreLabel}　<b>{myRankInfo.score}</b></span>
        </div>
        <p>{rankGap || "上位者との差と、次回集計までの残り時間を確認できます。"}</p>
      </HeroPanel>

      <PeriodStatus
        label={activeSubTab === "daily" ? "デイリー集計" : activeTab === "pvp" || activeTab === "raid" ? "週間集計" : "シーズン対象期間"}
        range={`${periodFormatter.format(rankingPeriod.start)} 〜 ${periodFormatter.format(rankingPeriod.end)}`}
        remaining={formatRemaining(rankingPeriod.end.getTime() - clock.getTime())}
        cadence="15分ごとに更新"
        updatedAt={latestUpdate ? periodFormatter.format(latestUpdate) : "取得待ち"}
        tone={activeTab === "raid" ? "danger" : activeTab === "gvg" ? "magenta" : "cyan"}
      />

      {/* ランキングリスト表示 */}
      <div className="ranking-section-heading">
        <div>
          <span>LEADERBOARD</span>
          <strong>{activeCategoryLabel}ランキング</strong>
        </div>
        <small>{activeSubTab === "daily" ? "デイリー" : activeTab === "pvp" || activeTab === "raid" ? "週間" : "シーズン"}</small>
      </div>
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
                    onClick={() => openPlayerFromRanking(item.user_id, "power_player")}
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
                  onClick={() => openGuildFromRanking(item.guild_id, "guild_power")}
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
              sortedPvpRankings.map((item: any, idx: number) => {
                const guildName = item.users?.guild_members?.[0]?.guilds?.name || "無所属";
                const power = effectivePowerRankings.find((entry: any) => entry.user_id === item.user_id)?.current_power;
                return (
                <div
                  key={item.user_id}
                  className="list-item steel-row clickable-item active-scale-effect"
                  onClick={() => openPlayerFromRanking(item.user_id, "pvp_player")}
                >
                  <div className="item-left flex items-center gap-3">
                    <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                    <div className="flex-column"><span className="item-title font-weight-bold">{item.users?.username || "名無しの極道"}</span><span className="item-desc font-size-7 text-secondary">{guildName} ・ 戦力 {Number(power || 0).toLocaleString()}</span></div>
                  </div>
                  <span className="font-weight-bold text-color-cyan font-size-9">
                    {activeSubTab === "daily" ? `${item.daily_wins} 勝` : `${item.rank_points} pt`}
                  </span>
                </div>
              );})
            ) : (
              <div className="text-center py-5 text-secondary">データがありません</div>
            )}
          </div>
        )}

        {activationMilestones.has("first_pvp") && !activationMilestones.has("first_raid") ? (
          <OutlawButton variant="primary" fullWidth className="ranking-return-cta" onClick={() => { playCyberSe("click"); setActiveTab("raid"); }}>次はレイドへ挑戦</OutlawButton>
        ) : activeTab === "pvp" ? (
          <OutlawButton variant="secondary" fullWidth className="ranking-return-cta" onClick={() => { playCyberSe("click"); setActiveTab("pvp"); }}>PvPへ戻る</OutlawButton>
        ) : null}

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
              <div className="flex-col-gap-3">
                <div className="battle-card border-cyan p-3">
                  <span className="battle-card-title block mb-2">TRIBE GvGレート</span>
                  <div className="list-container max-height-90">
                    {(officialGvgRankings.guild || []).map((item: any, idx: number) => (
                      <div key={item.guild_id} className="list-item py-1 clickable-item" onClick={() => openGuildFromRanking(item.guild_id, "gvg_guild")}>
                        <span>{idx + 1}位. {item.guild_name}</span>
                        <span>{Number(item.rate || 0).toLocaleString()} Rate</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                          {item.season_points.toLocaleString()} Dmg
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-5 text-secondary">データがありません</div>
                )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------- 5. レイド -------------------- */}
        {activeTab === "raid" && (
          <div className="flex-col-gap-3">
            {activeSubTab === "daily" && activeRaidInstances.length > 1 && (
              <SubTabNav
                tabs={activeRaidInstances.map((raid: any) => ({ id: raid.id, label: raid.base_name || raid.boss_name || "レイド" }))}
                activeTabId={selectedRaidInstanceId || activeRaidInstances[0]?.id}
                onSelect={setSelectedRaidInstanceId}
              />
            )}
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
                          openPlayerFromRanking(item.user_id, "raid_player");
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
                          openGuildFromRanking(item.guild_id, "raid_guild");
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
