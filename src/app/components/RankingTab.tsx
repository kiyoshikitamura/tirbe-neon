"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "../../utils/supabase";
import { CHARACTERS_MASTER, getCharacterTransparentImg } from "@/utils/game_constants";
import HubPage from "./ui/HubPage";
import SubTabNav from "./ui/SubTabNav";
import OutlawButton from "./ui/OutlawButton";
import CharacterPresentation from "./character/CharacterPresentation";
import UserIdentityRow from "./profile/UserIdentityRow";
import RankPresentation from "./presentation/RankPresentation";
import StatusMetric from "./presentation/StatusMetric";
import { useScreenReadiness } from "../hooks/useScreenReadiness";
import { SCREEN_ASSET_MANIFESTS } from "../lib/screenManifests";
import RankingRewardDialog from "./ranking/RankingRewardDialog";
import "./ranking/RankingRewardButton.css";
import "./RankingTab.css";
import "./RaidRankingMetric.css";

type RankingCategory = "power" | "guild_power" | "pvp" | "raid";
type RankingPeriod = "daily" | "season";

type PublicProfile = {
  user_id: string;
  username?: string | null;
  guild_id?: string | null;
  guild_name?: string | null;
  favorite_character_id?: string | null;
  main_formation_character_ids?: string[] | null;
};

const RANKING_TABS = [
  { id: "power", label: "総合力" },
  { id: "guild_power", label: "ギルド" },
  { id: "pvp", label: "バトル" },
  { id: "raid", label: "レイド" },
] as const;

const PERIOD_TABS = [
  { id: "daily", label: "デイリー" },
  { id: "season", label: "シーズン" },
] as const;

const validRank = (value: unknown) => {
  const rank = Number(value);
  return Number.isInteger(rank) && rank > 0 ? rank : null;
};

function RankingDeck({ characterIds = [] }: { characterIds?: string[] | null }) {
  const canonicalIds = (characterIds || []).filter(Boolean).slice(0, 5);
  if (canonicalIds.length === 0) return null;
  return (
    <div className="ranking-deck" aria-label={`公開デッキ ${canonicalIds.length}人`}>
      {canonicalIds.map((characterId, index) => {
        const master = CHARACTERS_MASTER.find((entry) => entry.id === characterId);
        return (
          <CharacterPresentation
            key={`${characterId}-${index}`}
            src={master ? getCharacterTransparentImg(master.name) : undefined}
            alt={master?.jpName || "公開キャラクター"}
            variant="icon"
            rarity={master?.rarity}
            frameKind="character"
            metadata={false}
          />
        );
      })}
    </div>
  );
}

export default function RankingTab() {
  const {
    session,
    currentUser,
    userGuild,
    userGuildMember,
    playCyberSe,
    fetchPlayerDetail,
    fetchGuildDetail,
    rankingActiveTab,
    setRankingActiveTab,
    setActiveTab,
    isRaidActive,
  } = useGame();

  const activeTab: RankingCategory = RANKING_TABS.some((tab) => tab.id === rankingActiveTab)
    ? rankingActiveTab as RankingCategory
    : "power";
  const [activePeriod, setActivePeriod] = useState<RankingPeriod>("season");
  const [rows, setRows] = useState<any[]>([]);
  const [guildRows, setGuildRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [currentIdentity, setCurrentIdentity] = useState<{ userId: string; profile: PublicProfile } | null>(null);
  const [selfRank, setSelfRank] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [activationMilestones, setActivationMilestones] = useState<Set<string>>(new Set());
  const rankingMilestoneStarted = useRef(false);
  const requestVersion = useRef(0);
  const readiness = useScreenReadiness({ assets: SCREEN_ASSET_MANIFESTS.ranking, dataReady: !loading });

  const loadRanking = useCallback(async () => {
    const requestId = ++requestVersion.current;
    setLoading(true);
    setError(false);
    setRows([]);
    setGuildRows([]);
    setProfiles({});
    setSelfRank(null);

    try {
      let nextRows: any[] = [];
      let nextGuildRows: any[] = [];
      let nextSelfRank: any | null = null;

      if (activeTab === "power") {
        const { data, error: rpcError } = await supabase.rpc("get_public_power_rankings", { p_daily: activePeriod === "daily", p_limit: 100, p_offset: 0 });
        if (rpcError) throw rpcError;
        nextRows = Array.isArray(data) ? data : [];
      } else if (activeTab === "guild_power") {
        const { data, error: rpcError } = await supabase.rpc("get_public_guild_power_rankings", { p_daily: activePeriod === "daily", p_limit: 100, p_offset: 0 });
        if (rpcError) throw rpcError;
        nextGuildRows = Array.isArray(data) ? data : [];
      } else if (activeTab === "pvp") {
        const { data, error: rpcError } = await supabase.rpc("get_public_pvp_rankings", { p_daily: activePeriod === "daily", p_limit: 100, p_offset: 0 });
        if (rpcError) throw rpcError;
        nextRows = Array.isArray(data) ? data : [];
      } else if (activePeriod === "daily") {
        const { data: raids, error: raidError } = await supabase.rpc("get_active_raids");
        if (raidError) throw raidError;
        const activeRaid = Array.isArray(raids) ? raids[0] : null;
        if (activeRaid?.id) {
          const { data, error: rpcError } = await supabase.rpc("get_raid_rankings", { p_instance_id: activeRaid.id });
          if (rpcError) throw rpcError;
          nextRows = Array.isArray(data?.individual) ? data.individual : [];
          nextGuildRows = Array.isArray(data?.guild) ? data.guild : [];
          nextSelfRank = data?.selfRank || null;
        }
      } else {
        const { data, error: rpcError } = await supabase.rpc("get_raid_season_rankings", { p_limit: 100, p_offset: 0 });
        if (rpcError) throw rpcError;
        nextRows = Array.isArray(data?.individual) ? data.individual : Array.isArray(data?.personal) ? data.personal : [];
        nextGuildRows = Array.isArray(data?.guild) ? data.guild : [];
        nextSelfRank = data?.selfRank || null;
      }

      const publicUserIds = [...new Set([...nextRows.map((row) => row.user_id).filter(Boolean), session?.user?.id].filter(Boolean))] as string[];
      let nextProfiles: Record<string, PublicProfile> = {};
      if (publicUserIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase.rpc("get_public_profiles", { p_user_ids: publicUserIds });
        if (profileError) throw profileError;
        nextProfiles = Object.fromEntries((Array.isArray(profileData) ? profileData : []).map((profile: PublicProfile) => [profile.user_id, profile]));
      }

      if (requestId !== requestVersion.current) return;
      setRows(nextRows);
      setGuildRows(nextGuildRows);
      setProfiles(nextProfiles);
      setSelfRank(nextSelfRank);
    } catch {
      if (requestId === requestVersion.current) setError(true);
    } finally {
      if (requestId === requestVersion.current) setLoading(false);
    }
  }, [activePeriod, activeTab, session]);

  useEffect(() => { void loadRanking(); }, [loadRanking]);
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let cancelled = false;
    void supabase.rpc("get_public_profiles", { p_user_ids: [userId] }).then(({ data, error: profileError }) => {
      if (cancelled || profileError) return;
      const profile = Array.isArray(data) ? data.find((entry: PublicProfile) => entry.user_id === userId) : null;
      if (profile) setCurrentIdentity({ userId, profile });
    });
    return () => { cancelled = true; };
  }, [session?.user?.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!session?.user?.id || rankingMilestoneStarted.current) return;
    rankingMilestoneStarted.current = true;
    void supabase.from("user_funnel_milestones").select("milestone").eq("user_id", session.user.id)
      .then(async ({ data }) => {
        const milestones = new Set<string>((data || []).map((row: any) => row.milestone));
        if (!milestones.has("ranking_viewed")) {
          const { error: recordError } = await supabase.rpc("record_client_funnel_event", {
            p_event_name: "ranking_viewed", p_source_screen: "ranking", p_source_cta: "screen_view", p_object_id: null, p_metadata: {},
          });
          if (!recordError) milestones.add("ranking_viewed");
        }
        setActivationMilestones(milestones);
      });
  }, [session?.user?.id]);

  const currentUserId = session?.user?.id;
  const currentGuildId = userGuildMember?.guild_id || userGuild?.id || currentUser?.guild_members?.[0]?.guild_id;
  const currentRow = rows.find((row) => row.user_id === currentUserId);
  const currentGuildRow = guildRows.find((row) => row.guild_id === currentGuildId);
  const currentIdentityProfile = currentIdentity && currentIdentity.userId === currentUserId ? currentIdentity.profile : null;
  const currentProfile = currentIdentityProfile || (currentUserId ? profiles[currentUserId] : undefined);
  const currentIdentityName = currentProfile?.username || currentUser?.username;
  const currentRank = activeTab === "guild_power" ? validRank(currentGuildRow?.rank_position) : validRank(currentRow?.rank_position ?? selfRank?.rank_position);
  const currentMetric = useMemo(() => {
    if (activeTab === "power") return Number(currentRow?.current_power || currentUser?.total_power || 0).toLocaleString();
    if (activeTab === "guild_power") {
      if (!currentGuildId) return "対象外";
      return Number(activePeriod === "daily" ? currentGuildRow?.daily_power : currentGuildRow?.current_power || 0).toLocaleString();
    }
    if (activeTab === "pvp") return activePeriod === "daily" ? `${Number(currentRow?.daily_wins || 0).toLocaleString()}勝` : `${Number(currentRow?.rank_points || 0).toLocaleString()} RATE`;
    return Number(currentRow?.contribution ?? selfRank?.contribution ?? 0).toLocaleString();
  }, [activePeriod, activeTab, currentGuildId, currentGuildRow, currentRow, currentUser?.total_power, selfRank]);

  const activeCategoryLabel = RANKING_TABS.find((tab) => tab.id === activeTab)?.label || "総合力";
  const metricLabel = activeTab === "power" ? "総合力" : activeTab === "guild_power" ? "ギルド総合力" : activeTab === "pvp" ? "RATE" : "累計ダメージ";
  const periodLabel = activePeriod === "daily" ? "デイリー" : "シーズン";
  const updateLabel = `${clock.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 更新`;

  const openPlayer = (userId: string) => { if (userId) { playCyberSe("click"); void fetchPlayerDetail(userId); } };
  const openGuild = (guildId: string) => { if (guildId) { playCyberSe("click"); void fetchGuildDetail(guildId); } };

  return (
    <HubPage className="ranking-tab-view" title="ランキング" hideVisualHeader status={readiness.status} onRetry={readiness.retry}>
      <div className="ranking-context"><div><small>RANKING</small><strong>{activeCategoryLabel}</strong></div><button type="button" onClick={() => void loadRanking()} disabled={loading}>更新</button></div>
      <SubTabNav className="ranking-category-nav" tabs={[...RANKING_TABS]} activeTabId={activeTab} onSelect={(tabId) => setRankingActiveTab(tabId)} />
      <div className="ranking-period-row"><div role="group" aria-label="集計期間">{PERIOD_TABS.map((period) => <button key={period.id} type="button" className={activePeriod === period.id ? "is-active" : ""} onClick={() => setActivePeriod(period.id)}>{period.label}</button>)}</div><span>{periodLabel}・{updateLabel}</span><button type="button" className="ranking-reward-button" onClick={() => setRewardDialogOpen(true)}>報酬確認</button></div>

      <section className="ranking-current" aria-label="あなたの現在地">
        <div className="ranking-current-identity">
          {activeTab === "guild_power" ? <div><small>YOUR GUILD</small><strong>{userGuild?.name || "未所属"}</strong></div> : currentIdentityName ? <UserIdentityRow userName={currentIdentityName} guildName={currentProfile?.guild_name || userGuild?.name} leaderCharacterId={currentProfile?.favorite_character_id || currentUser?.favorite_character_id} onOpen={currentUserId ? () => openPlayer(currentUserId) : undefined} variant="compact" /> : <div className="ranking-current-identity-loading" role="status">ユーザー情報を取得中</div>}
        </div>
        <StatusMetric label="順位" value={<RankPresentation rank={currentRank} />} />
        <StatusMetric label={metricLabel} value={currentMetric} />
      </section>

      <div className="ranking-list-heading"><strong>上位ランキング</strong><span>{periodLabel}</span></div>
      {error ? <div className="ranking-state" role="alert"><span>ランキングを取得できませんでした</span><button type="button" onClick={() => void loadRanking()}>再試行</button></div>
        : loading ? <div className="ranking-skeleton" aria-label="ランキング取得中">{[0, 1, 2].map((key) => <span key={key} />)}</div>
          : activeTab === "guild_power" ? <div className="ranking-list">{guildRows.length > 0 ? guildRows.map((row) => {
            const rank = validRank(row.rank_position);
            return <button type="button" key={row.guild_id} className={`ranking-guild-row ${row.guild_id === currentGuildId ? "is-current" : ""}`} onClick={() => openGuild(row.guild_id)}><span className={`ranking-position is-${rank || "out"}`}><RankPresentation rank={rank} /></span><span className="ranking-guild-identity"><strong>{row.name || row.guild_name || "ギルド"}</strong><small>{Number(row.member_count || row.participant_count || 0)} MEMBERS</small></span><span className="ranking-metric">{Number(activePeriod === "daily" ? row.daily_power : row.current_power || row.contribution || 0).toLocaleString()}<small>総合力</small></span></button>;
          }) : <div className="ranking-empty">まだランキングデータがありません</div>}</div>
            : <div className="ranking-list">{rows.length > 0 ? rows.map((row) => {
              const profile = profiles[row.user_id];
              const rank = validRank(row.rank_position);
              const metric = activeTab === "power" ? Number(row.current_power || 0).toLocaleString() : activeTab === "pvp" ? activePeriod === "daily" ? `${Number(row.daily_wins || 0)}勝` : Number(row.rank_points || 0).toLocaleString() : Number(row.contribution || row.damage_dealt || 0).toLocaleString();
              return <article key={row.user_id} className={`ranking-user-row ${row.user_id === currentUserId ? "is-current" : ""}`}><span className={`ranking-position is-${rank || "out"}`}><RankPresentation rank={rank} /></span><div className="ranking-user-main"><UserIdentityRow userName={profile?.username || row.username || "プレイヤー"} guildName={profile?.guild_name || row.guild_name} leaderCharacterId={profile?.favorite_character_id} onOpen={() => openPlayer(row.user_id)} variant="compact" /><RankingDeck characterIds={profile?.main_formation_character_ids} /></div><span className={`ranking-metric ${activeTab === "raid" ? "is-raid-metric" : ""}`}>{metric}<small>{activeTab === "power" ? "総合力" : activeTab === "pvp" ? activePeriod === "daily" ? "WIN" : "RATE" : "ダメージ"}</small></span></article>;
            }) : <div className="ranking-empty">まだランキングデータがありません</div>}</div>}

      {activeTab === "raid" && guildRows.length > 0 && <section className="ranking-raid-guilds"><div className="ranking-list-heading"><strong>ギルドランキング</strong><span>{periodLabel}</span></div>{guildRows.slice(0, 3).map((row) => { const rank = validRank(row.rank_position); return <button type="button" key={row.guild_id} className="ranking-guild-row" onClick={() => openGuild(row.guild_id)}><span className={`ranking-position is-${rank || "out"}`}><RankPresentation rank={rank} /></span><span className="ranking-guild-identity"><strong>{row.guild_name || "ギルド"}</strong><small>{Number(row.participant_count || 0)} MEMBERS</small></span><span className="ranking-metric is-raid-metric">{Number(row.contribution || 0).toLocaleString()}<small>ダメージ</small></span></button>; })}</section>}
      {activationMilestones.has("first_pvp") && !activationMilestones.has("first_raid") && isRaidActive ? <OutlawButton variant="primary" fullWidth className="ranking-return-cta" onClick={() => setActiveTab("raid")}>次はレイドへ挑戦</OutlawButton>
        : activationMilestones.has("first_pvp") && !userGuildMember ? <OutlawButton variant="primary" fullWidth className="ranking-return-cta" onClick={() => setActiveTab("guild")}>おすすめTRIBEを見る</OutlawButton>
          : activationMilestones.has("first_pvp") && userGuildMember && !activationMilestones.has("guild_activation") ? <OutlawButton variant="primary" fullWidth className="ranking-return-cta" onClick={() => setActiveTab("guild")}>所属TRIBEへ</OutlawButton>
            : activeTab === "pvp" ? <OutlawButton variant="secondary" fullWidth className="ranking-return-cta" onClick={() => setActiveTab("pvp")}>バトルへ戻る</OutlawButton> : null}
      {rewardDialogOpen && <RankingRewardDialog category={activeTab} period={activePeriod} onClose={() => setRewardDialogOpen(false)} />}
    </HubPage>
  );
}
