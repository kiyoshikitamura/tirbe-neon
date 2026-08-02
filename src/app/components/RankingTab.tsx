"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "../../utils/supabase";
import "./RankingTab.css";

type TabType = "power" | "guild_power" | "pvp" | "gvg" | "raid";
type SubTabType = "daily" | "season";

export default function RankingTab() {
  const {
    session,
    currentUser,
    powerRankings,
    guildPowerRankings,
    pvpRankings,
    gvgBaseControls,
    raidDamageLogs,
    raidSeasonRankings,
    handlePowerDailyReset,
    handlePowerSeasonReset,
    gvgResetLoading,
    playCyberSe,
    fetchPlayerDetail,
    fetchGuildDetail,
    rankingActiveTab,
    setRankingActiveTab
  } = useGame();

  const [activeTab, setActiveTab] = useState<TabType>("power");
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("season");
  const [gvgSeasonPersonalRanks, setGvgSeasonPersonalRanks] = useState<any[]>([]);
  const [gvgSeasonLoading, setGvgSeasonLoading] = useState<boolean>(false);

  // GameContextのタブ状態を同期
  React.useEffect(() => {
    if (rankingActiveTab) {
      setActiveTab(rankingActiveTab as TabType);
    }
  }, [rankingActiveTab]);

  React.useEffect(() => {
    if (activeTab === "gvg" && activeSubTab === "season") {
      const loadRanks = async () => {
        setGvgSeasonLoading(true);
        try {
          const { data } = await supabase
            .from("user_gvg_ranks")
            .select("*, users ( username, avatar_url )")
            .order("season_points", { ascending: false });
          if (data) {
            setGvgSeasonPersonalRanks(data);
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
    if (!session?.user?.id) return { rank: "--", score: "--" };
    const myId = session.user.id;
    const myGuildId = currentUser?.guild_members?.[0]?.guild_id;

    if (activeTab === "power") {
      const idx = sortedPowerRankings.findIndex((r: any) => r.user_id === myId);
      if (idx !== -1) {
        return {
          rank: `${idx + 1}位`,
          score: `${sortedPowerRankings[idx].current_power.toLocaleString()}`
        };
      }
    } else if (activeTab === "guild_power") {
      if (!myGuildId) return { rank: "無所属", score: "--" };
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
        if (!myGuildId) return { rank: "無所属", score: "--" };
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
          rank: baseName ? `${baseName}` : "--",
          score: maxPt > 0 ? `${maxPt.toLocaleString()} P` : "--"
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

    return { rank: "圏外", score: "--" };
  }, [activeTab, activeSubTab, sortedPowerRankings, sortedGuildPowerRankings, sortedPvpRankings, gvgRankingsData, raidRankingsData, session, currentUser]);

  const handleTabChange = (tab: TabType) => {
    playCyberSe("click");
    setActiveTab(tab);
    setRankingActiveTab(tab);
  };

  const handleSubTabChange = (sub: SubTabType) => {
    playCyberSe("click");
    setActiveSubTab(sub);
  };

  return (
    <div className="view-container ranking-tab-view">
      <h2 className="view-title">ランキング</h2>

      {/* メインカテゴリタブ */}
      <div className="tab-menu ranking-main-tabs">
        <button
          className={`tab-btn font-size-8 ${activeTab === "power" ? "active" : ""}`}
          onClick={() => handleTabChange("power")}
        >
          総合力
        </button>
        <button
          className={`tab-btn font-size-8 ${activeTab === "guild_power" ? "active" : ""}`}
          onClick={() => handleTabChange("guild_power")}
        >
          ギルド総合力
        </button>
        <button
          className={`tab-btn font-size-8 ${activeTab === "pvp" ? "active" : ""}`}
          onClick={() => handleTabChange("pvp")}
        >
          PvP
        </button>
        <button
          className={`tab-btn font-size-8 ${activeTab === "gvg" ? "active" : ""}`}
          onClick={() => handleTabChange("gvg")}
        >
          GvG
        </button>
        <button
          className={`tab-btn font-size-8 ${activeTab === "raid" ? "active" : ""}`}
          onClick={() => handleTabChange("raid")}
        >
          レイド
        </button>
      </div>

      {/* サブトグル（デイリー / シーズン） */}
      <div className="ranking-sub-tabs flex justify-center py-2">
        <div className="toggle-switch-container">
          <button
            className={`toggle-switch-btn ${activeSubTab === "daily" ? "active" : ""}`}
            onClick={() => handleSubTabChange("daily")}
          >
            デイリー
          </button>
          <button
            className={`toggle-switch-btn ${activeSubTab === "season" ? "active" : ""}`}
            onClick={() => handleSubTabChange("season")}
          >
            シーズン
          </button>
        </div>
      </div>

      {/* 自分の順位・スコアを示す固定HUD (Sticky HUD) */}
      <div className="my-rank-sticky-bar font-size-8">
        <div className="my-rank-label">あなたの現在ステータス</div>
        <div className="my-rank-details flex items-center justify-between">
          <div className="my-rank-value">
            順位: <span className="text-color-cyan font-weight-bold">{myRankInfo.rank}</span>
          </div>
          <div className="my-rank-score">
            スコア: <span className="text-color-cyan font-weight-bold">{myRankInfo.score}</span>
          </div>
        </div>
      </div>

      {/* ランキングリスト表示 */}
      <div className="scroll-container flex-1 ranking-content-area">
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

      {/* 管理者デバッグコンソール (最下部) */}
      <div className="battle-card border-warning p-3 mt-3 admin-console-panel">
        <div className="upgrade-card-title text-color-warning mb-2 font-size-8">管理者デバッグツール</div>
        <div className="flex-row-gap-3" style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handlePowerDailyReset}
            disabled={gvgResetLoading}
            className="sub-btn border-cyan-subtle flex-1 font-size-7 height-26 active-scale-effect"
          >
            総合力デイリーリセット
          </button>
          <button
            onClick={handlePowerSeasonReset}
            disabled={gvgResetLoading}
            className="sub-btn border-magenta-subtle flex-1 font-size-7 height-26 active-scale-effect text-color-magenta"
          >
            総合力シーズンリセット
          </button>
        </div>
      </div>
    </div>
  );
}
