"use client";

import React from "react";
import { supabase } from "@/utils/supabase";
import { useGame } from "../context/GameContext";
import { BASE_MAP_MASTER } from "@/utils/game_constants";
import "./RaidTab.css";
import Badge from "./ui/Badge";
import HeroPanel from "./ui/HeroPanel";
import HubPage from "./ui/HubPage";
import OutlawButton from "./ui/OutlawButton";
import OutlawCard from "./ui/OutlawCard";
import PeriodStatus from "./ui/PeriodStatus";
import { useScreenReadiness } from "../hooks/useScreenReadiness";
import { SCREEN_ASSET_MANIFESTS } from "../lib/screenManifests";

export default function RaidTab() {
  const {
    raidBossHp,
    raidBossMaxHp,
    raidBossSecondsLeft,
    raidTotalDamage,
    startCardBattle,
    playCyberSe,
    raidBossBaseId,
    raidBossName,
    navigateTab,
    userLevel,
    raidAttemptsToday,
    raidAttemptConfig,
    raidMaxDaily,
    setConfirmDialogConfig,
    userGuildMember,
    fetchGuildDetail,
  } = useGame();
  const readiness = useScreenReadiness({ assets: SCREEN_ASSET_MANIFESTS.raid });
  const [activeRaids, setActiveRaids] = React.useState<any[]>([]);
  const [selectedRaidId, setSelectedRaidId] = React.useState<string | null>(null);
  const [recommendedGuilds, setRecommendedGuilds] = React.useState<any[]>([]);
  React.useEffect(() => {
    void supabase.rpc("get_active_raids").then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        setActiveRaids(data);
        setSelectedRaidId((current) => current && data.some((raid: any) => raid.id === current) ? current : data[0]?.id ?? null);
      }
    });
  }, []);
  React.useEffect(() => {
    if (userGuildMember) return;
    void supabase.rpc("get_recommended_guilds", { p_limit: 5 }).then(({ data }) => {
      if (Array.isArray(data)) {
        setRecommendedGuilds(data);
        void supabase.rpc("record_client_funnel_event", { p_event_name:"guild_recommendation_impression",p_source_screen:"raid",p_source_cta:null,p_object_id:null,p_metadata:{ count:data.length } });
      }
    });
  }, [userGuildMember]);
  const selectedRaid = activeRaids.find((raid) => raid.id === selectedRaidId) ?? activeRaids[0];
  const displayHp = Number(selectedRaid?.currentHp ?? raidBossHp);
  const displayMaxHp = Number(selectedRaid?.maxHp ?? raidBossMaxHp);
  const displayBaseId = selectedRaid?.baseId ?? raidBossBaseId;
  const displayName = selectedRaid?.bossName ?? raidBossName;
  const displaySeconds = selectedRaid?.expiresAt ? Math.max(0, Math.floor((new Date(selectedRaid.expiresAt).getTime() - Date.now()) / 1000)) : raidBossSecondsLeft;

  // 残り時間のフォーマット
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "終了";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const hpPercent = displayMaxHp > 0 ? (displayHp / displayMaxHp) * 100 : 0;
  
  // 出現拠点の名称取得
  const baseName = BASE_MAP_MASTER.find(b => b.id === displayBaseId)?.name || "夜の街";

  return (
    <HubPage
      className="raid-view"
      eyebrow="RAID / SHARED BOSS"
      title="レイド"
      description="仲間と累積ダメージを重ね、出現中の強敵を撃破する。"
      status={readiness.status}
      onRetry={readiness.retry}
    >
        {/* レイドボスステータスカード */}
        <div className="flex gap-2 mb-3">
          {activeRaids.map((raid) => <OutlawButton key={raid.id} variant={raid.id === selectedRaidId ? "primary" : "secondary"} onClick={() => setSelectedRaidId(raid.id)}>{BASE_MAP_MASTER.find(b => b.id === raid.baseId)?.name || raid.baseId}</OutlawButton>)}
        </div>
        <HeroPanel className={`raid-boss-hero ${displayHp <= 0 || displaySeconds <= 0 ? "raid-boss-ended" : ""}`}>
          <div className="raid-boss-stage" aria-label={`${displayName} レベル${selectedRaid?.level || 1}`}>
            <div className="raid-boss-emblem"><img src="/menu/raid.png" alt="レイドボス" /></div>
            <div><span>RAID BOSS</span><strong>{displayName}</strong><small>Lv.{selectedRaid?.level || 1} ・ {baseName}</small></div>
          </div>
          <div className="flex-row-space-between align-center mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-size-10 font-weight-bold text-color-magenta">BOSS HP</span>
            <Badge tone={displaySeconds > 0 ? "danger" : "neutral"}>{formatTime(displaySeconds)}</Badge>
          </div>

          {/* 出現場所 */}
          <div className="flex-row-space-between align-center mb-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-size-8 text-secondary">
              出現地: <span className="text-color-cyan font-weight-bold">{baseName}</span>
            </span>
          </div>

          {/* HPバー */}
          <div className="raid-hp-bar-container">
            <div className="raid-hp-bar-fill" style={{ width: `${Math.max(hpPercent, 0)}%` }} />
            <span className="raid-hp-text font-size-8 font-weight-bold">
              HP: {displayHp.toLocaleString()} / {displayMaxHp.toLocaleString()} ({hpPercent.toFixed(1)}%)
            </span>
          </div>

            <div className="flex-col-gap-2 width-100">
              <OutlawButton
                variant="danger"
                fullWidth
                onClick={() => {
                  playCyberSe("click");
                  const nextAttempt = raidAttemptsToday + 1;
                  const costEntry = raidAttemptConfig.find((entry: any) => entry.attempt === nextAttempt);
                  if (!costEntry) return;
                  
                  if (costEntry.type !== "FREE") {
                    setConfirmDialogConfig({
                      isOpen: true,
                      title: "レイド挑戦",
                      message: `${costEntry.type === "CASH" ? "Cash" : "Diamond"} ${costEntry.cost.toLocaleString()} を消費してレイドに挑戦しますか？（本日 ${nextAttempt}/${raidMaxDaily} 回目）`,
                      confirmText: "挑戦する",
                      cancelText: "キャンセル",
                      onConfirm: () => { startCardBattle("RAID", displayName, selectedRaid?.id); setConfirmDialogConfig(null); },
                      onCancel: () => setConfirmDialogConfig(null),
                    });
                  } else {
                    startCardBattle("RAID", displayName, selectedRaid?.id);
                  }
                }}
                disabled={!selectedRaid?.id || displayHp <= 0 || displaySeconds <= 0 || userLevel < 5 || raidMaxDaily === 0 || raidAttemptsToday >= raidMaxDaily}
              >
                {userLevel < 5 ? "プレイヤーLv5以上で解放" : raidMaxDaily === 0 ? "挑戦条件を取得中" : raidAttemptsToday >= raidMaxDaily ? "本日の挑戦回数上限" : "強敵に挑む (バトル開始)"}
              </OutlawButton>
              {userLevel >= 5 && (
                <div className="text-center font-size-8 text-secondary">
                  本日挑戦: {raidAttemptsToday}/{raidMaxDaily} 回
                  {raidAttemptConfig[raidAttemptsToday] && ` (次回コスト: ${raidAttemptConfig[raidAttemptsToday].type === "FREE" ? "無料" : `${raidAttemptConfig[raidAttemptsToday].cost} ${raidAttemptConfig[raidAttemptsToday].type}`})`}
                </div>
              )}
            </div>
        </HeroPanel>

        <PeriodStatus
          label="レイド開催期間"
          range="出現から24時間"
          remaining={formatTime(displaySeconds)}
          cadence="ボスHP・個人ダメージは随時更新"
          tone="danger"
        />

        {/* 自組織の累積与ダメージ状況 */}
        <OutlawCard>
          <div className="upgrade-card-title flex items-center justify-between" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>自身の累計与ダメージ</span>
            <span className="text-color-cyan font-weight-bold">{raidTotalDamage.toLocaleString()} Dmg</span>
          </div>
          <div className="raid-contribution-progress"><span style={{ width: `${Math.min(100, raidTotalDamage / 1000)}%` }} /></div>
          <p className="font-size-7 text-secondary mt-1">報酬獲得ライン: 100,000 Dmg (現在 {raidTotalDamage >= 100000 ? "達成済み" : "未達成"})</p>
          <div className="raid-contribution-grid"><span><small>今回の成果</small><strong>バトル結果で確定</strong></span><span><small>所属価値</small><strong>{userGuildMember ? "TRIBE Contribution対象" : "個人Contribution"}</strong></span></div>
        </OutlawCard>

        {/* ランキング画面への遷移 */}
        <OutlawCard className="text-center">
          <div className="upgrade-card-title mb-2">ダメージランキング</div>
          <p className="font-size-8 text-secondary mb-3">全プレイヤー名の与ダメージランキングは、ランキング画面で確認できます。</p>
          <OutlawButton
            variant="secondary"
            fullWidth
            onClick={() => { navigateTab("ranking", "raid"); playCyberSe("click"); }}
          >
            ランキングで確認
          </OutlawButton>
        </OutlawCard>
        {!userGuildMember && recommendedGuilds.length > 0 && <OutlawCard>
          <div className="upgrade-card-title mb-2">おすすめTRIBE</div>
          <p className="font-size-8 text-secondary mb-3">加入するとレイドのGuild Contribution・Guild Rankingに参加できます。</p>
          <div className="flex-col-gap-2">
            {recommendedGuilds.map((guild) => <button key={guild.guild_id} className="sub-btn active-scale-effect width-100" onClick={() => {
              void supabase.rpc("record_client_funnel_event",{p_event_name:"guild_recommendation_click",p_source_screen:"raid",p_source_cta:"recommended_guild",p_object_id:guild.guild_id,p_metadata:{score:guild.recommendation_score}});
              void fetchGuildDetail(guild.guild_id);
            }}>{guild.name}　{guild.member_count}/{guild.member_limit}人　活動{guild.active_members_7d}人</button>)}
          </div>
        </OutlawCard>}
    </HubPage>
  );
}
