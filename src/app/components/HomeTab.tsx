"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import { resolveAvailableMyPageCreatives } from "@/domain/presentation/production_creatives";
import { HOME_ACTION_PRESENTATION_SLOTS } from "@/domain/presentation/homeActionPresentation";
import { isDestinationAvailable } from "@/domain/operations/operations";
import {
  markHomeReloadStage,
  readHomeResumeSnapshot,
  writeHomeResumeSnapshot,
} from "../lib/homeResumePresentation";

import {
  PROFILE_BACKGROUNDS,
  CHARACTERS_MASTER,
  PROFILE_INTERIORS,
  getCharacterTransparentImg,
} from "@/utils/game_constants";
import "./HomeTab.css";

const PRODUCTION_MY_PAGE_CREATIVES = resolveAvailableMyPageCreatives();
const homeVisualAssetPromises = new Map<string, Promise<boolean>>();

function preloadAndDecodeHomeImage(src: string, timeoutMs = 8000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  const cached = homeVisualAssetPromises.get(src);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(loaded);
    };
    const decode = () => {
      if (typeof image.decode !== "function") {
        finish(image.naturalWidth > 0);
        return;
      }
      void image.decode().then(() => finish(image.naturalWidth > 0)).catch(() => finish(image.naturalWidth > 0));
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    image.onload = decode;
    image.onerror = () => finish(false);
    image.src = src;
    if (image.complete && image.naturalWidth > 0) decode();
  });

  homeVisualAssetPromises.set(src, promise);
  return promise;
}

type HomeTabQaState = Readonly<{
  socialActivities?: readonly any[];
  funnelMilestones?: readonly string[];
}>;

/**
 * MainMyPage - マイページメイン画面
 */
function MainMyPage({ qaState }: { qaState?: HomeTabQaState }) {
  const {
    currentBaseId,
    selectedLeader,
    selectedMembers,
    unreadMissionsCount,
    unclaimedPresentsCount,
    guildChats,
    chatUnreadCounts,
    bbsUnreadTotal,
    dmUnreadTotal,
    setShowMissionPanel,
    setShowInboxPanel,
    setInboxPanelTab,
    setShowSettingsPanel,
    setShowMoveBaseModal,
    setShowTribeChatPanel,
    navigateTab,
    playCyberSe,
    selectedBgMode,
    titleEquipped,
    ownedTitles,
    interiorItem,
    equippedFrontEffect,
    totalPower,
    totalPowerLoading,
    monthlyPassActive,
    isRaidActive,
    session,
    activePatrols,
    onboardingState,
    userGuildMember,
    pendingGuildJoinRequests,
    featureOperatingStates,
    fetchPlayerDetail,
    setErrorMessage
  } = useGame();

  const equippedTitleName = ownedTitles.find((title: { id: string }) => title.id === titleEquipped)?.name || titleEquipped;
  const visibleEquippedTitle = equippedTitleName && !["title_none", "称号なし", "No Title", "半グレの首領"].includes(equippedTitleName)
    ? equippedTitleName
    : null;


  // イベントバナースライドインジケーター
  const [bannerIndex, setBannerIndex] = useState(0);
  const [leaderLine, setLeaderLine] = useState<string | null>(null);
  const [funnelMilestones, setFunnelMilestones] = useState<Set<string>>(new Set(qaState?.funnelMilestones || []));
  const [activationHandoffPending, setActivationHandoffPending] = useState(false);
  const [socialActivities, setSocialActivities] = useState<any[]>([...(qaState?.socialActivities || [])]);
  const lastCtaImpression = useRef<string | null>(null);
  const [banners, setBanners] = useState(() => PRODUCTION_MY_PAGE_CREATIVES?.map((creative) => ({
    id: creative.id,
    title: "",
    img: creative.assetPath,
    destination: creative.destination
  })).filter((banner) => !banner.destination || isDestinationAvailable(banner.destination)) ?? []);
  const visibleBanners = useMemo(
    () => banners.filter((banner) => banner.destination !== "raid" || isRaidActive),
    [banners, isRaidActive],
  );
  const activeBannerIndex = visibleBanners.length ? bannerIndex % visibleBanners.length : 0;

  const openBanner = (destination: string | null) => {
    if (!destination) return;
    const [tab, subTab] = destination.split(":");
    navigateTab(tab, subTab);
    playCyberSe("click");
  };

  useEffect(() => {
    if (visibleBanners.length < 2) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % visibleBanners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [visibleBanners.length]);

  useEffect(() => {
    if (PRODUCTION_MY_PAGE_CREATIVES) return;
    void supabase.from("home_banner_master").select("id, title, image_url, destination_value").order("priority", { ascending: false }).then(({ data, error }) => {
      const released = (data || []).filter((item) => isDestinationAvailable(item.destination_value || "home", featureOperatingStates));
      if (!error && released.length) setBanners(released.map((item) => ({ id: item.id, title: item.title, img: item.image_url, destination: item.destination_value || "home" })));
    });
  }, [featureOperatingStates]);

  useEffect(() => {
    setBanners((current) => current.filter((banner) => !banner.destination || isDestinationAvailable(banner.destination, featureOperatingStates)));
  }, [featureOperatingStates]);

  useEffect(() => {
    if (qaState?.funnelMilestones) return;
    if (!session?.user?.id) return;
    void supabase.from("user_funnel_milestones").select("milestone").eq("user_id", session.user.id)
      .then(({ data }) => setFunnelMilestones(new Set((data || []).map((row) => row.milestone))));
  }, [qaState?.funnelMilestones, session?.user?.id, userGuildMember?.guild_id]);

  useEffect(() => {
    if (qaState?.socialActivities) return;
    if (!session?.user?.id) return;
    void supabase.from("social_activity_feed").select("id,activity_type,actor_user_id,actor_display_name,guild_id,object_master_id,display_payload,permanent,created_at")
      .order("permanent", { ascending: false }).order("created_at", { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (!error) setSocialActivities((data || []).filter((event: any) => !["FRIEND", "GVG", "SHOP", "PAYMENT"].includes(String(event.activity_type || "").toUpperCase())));
      });
  }, [qaState?.socialActivities, session?.user?.id]);

  const primaryCta = useMemo<{
    key: string; eyebrow: string; title: string; detail: string; tab?: string; action?: "guild_chat" | "mission" | "mission_handoff";
  }>(() => {
    const tutorialStep = onboardingState?.tutorial_step;
    if (tutorialStep && tutorialStep !== "AUTHENTICATION") return { key: "tutorial", eyebrow: "次にすること", title: "チュートリアルを続ける", detail: "最初の成功体験を完了しよう。", tab: tutorialStep === "FREE_GACHA" ? "gacha" : tutorialStep === "AUTO_FORMATION" ? "character" : "patrol" };
    if (!funnelMilestones.has("first_pvp")) return { key: "first_pvp", eyebrow: "次にすること", title: "最初のPvPへ挑戦", detail: "街のプレイヤーと競い、現在の強さを確かめよう。", tab: "pvp" };
    if (!funnelMilestones.has("ranking_viewed")) return { key: "ranking_viewed", eyebrow: "次にすること", title: "ランキングを確認", detail: "初戦の順位と次の目標を確認しよう。", tab: "ranking" };
    if (!funnelMilestones.has("first_raid") && isRaidActive) return { key: "first_raid", eyebrow: "次にすること", title: "開催中レイドへ", detail: "全プレイヤーで強敵へ挑み、貢献を残そう。", tab: "raid" };
    if (!userGuildMember) {
      if (pendingGuildJoinRequests.length > 0) return { key: "guild_pending", eyebrow: "ギルド", title: "ギルド申請を確認", detail: "申請状況を確認できます。", tab: "guild" };
      return { key: "guild_discovery", eyebrow: "ギルド", title: "ギルドに参加", detail: "おすすめギルドから仲間を探そう。", tab: "guild" };
    }
    if (!funnelMilestones.has("guild_activation")) return { key: "guild_home", eyebrow: "SOCIAL", title: "所属TRIBEへ", detail: "加入したTRIBEの仲間と次の行動を確認しよう。", tab: "guild" };
    if (!funnelMilestones.has("activation_mission_handoff")) return {
      key: "activation_mission_handoff",
      eyebrow: "次のステップ",
      title: "あとはミッションをこなしながらゲームを進めていこう",
      detail: "ミッションへ",
      action: "mission_handoff",
    };
    if (unreadMissionsCount > 0) return { key: "mission_reward", eyebrow: "報酬", title: "達成報酬を受け取る", detail: `受取可能なミッションが ${unreadMissionsCount} 件あります。`, action: "mission" };
    return isRaidActive
      ? { key: "active_raid", eyebrow: "開催中", title: "レイドへ参加", detail: "出現中の強敵へ挑戦できます。", tab: "raid" }
      : { key: "normal_play", eyebrow: "FREE PLAY", title: "クエストへ派遣", detail: "育成素材と報酬を集めよう。", tab: "patrol" };
  }, [funnelMilestones, onboardingState?.tutorial_step, unreadMissionsCount, userGuildMember, pendingGuildJoinRequests.length, isRaidActive]);

  useEffect(() => {
    if (!session?.user?.id || lastCtaImpression.current === primaryCta.key) return;
    lastCtaImpression.current = primaryCta.key;
    void supabase.rpc("record_client_funnel_event", { p_event_name: "home_primary_cta_impression", p_source_screen: "home", p_source_cta: primaryCta.key, p_object_id: null, p_metadata: {} });
  }, [primaryCta.key, session?.user?.id]);

  const openPrimaryCta = async () => {
    if (activationHandoffPending) return;
    void supabase.rpc("record_client_funnel_event", { p_event_name: "home_primary_cta_click", p_source_screen: "home", p_source_cta: primaryCta.key, p_object_id: null, p_metadata: {} });
    if (primaryCta.action === "mission_handoff") {
      setActivationHandoffPending(true);
      const { error } = await supabase.rpc("complete_activation_mission_handoff");
      if (error) {
        setActivationHandoffPending(false);
        setErrorMessage("ミッションへの案内を完了できませんでした。もう一度お試しください。");
        return;
      }
      const { data, error: projectionError } = await supabase.from("user_funnel_milestones")
        .select("milestone")
        .eq("user_id", session.user.id)
        .eq("milestone", "activation_mission_handoff")
        .maybeSingle();
      if (projectionError || !data) {
        setActivationHandoffPending(false);
        setErrorMessage("最新状態を確認できませんでした。もう一度お試しください。");
        return;
      }
      setFunnelMilestones((current) => new Set(current).add("activation_mission_handoff"));
      setActivationHandoffPending(false);
      setShowMissionPanel(true);
    } else if (primaryCta.action === "guild_chat") setShowTribeChatPanel(true);
    else if (primaryCta.action === "mission") setShowMissionPanel(true);
    else if (primaryCta.tab) navigateTab(primaryCta.tab);
    playCyberSe("click");
  };

  // 拠点ID → 表示名・画像ファイル名のマッピング
  const baseMap: { [key: string]: { name: string; file: string } } = {
    shinjuku: { name: "新宿", file: "shinjuku" },
    shibuya: { name: "渋谷", file: "shibuya" },
    ikebukuro: { name: "池袋", file: "ikebukuro" },
    roppongi: { name: "六本木", file: "roppongi" },
    akihabara: { name: "秋葉原", file: "akihabara" },
    kawasaki: { name: "川崎", file: "kawasaki" },
    yokohama: { name: "横浜", file: "yokohama" },
  };
  const currentBase = baseMap[currentBaseId || "shinjuku"] || baseMap["shinjuku"];
  const baseName = currentBase.name;

  // リーダーキャラクター立ち絵URL
  const leaderCharacterId = selectedLeader || selectedMembers?.[0] || null;
  const leaderMaster = leaderCharacterId
    ? CHARACTERS_MASTER.find((c) => c.id === leaderCharacterId)
    : undefined;
  const leaderImgUrl = leaderMaster ? getCharacterTransparentImg(leaderMaster.name) : null;
  const isSsrLeader = leaderMaster?.rarity === "SSR";

  // 選択中背景URL
  let bgUrl = `/bg/bg_street_${currentBase.file}.png`;
  if (selectedBgMode && selectedBgMode !== "auto") {
    const foundBg = PROFILE_BACKGROUNDS.find((b) => b.id === selectedBgMode);
    if (foundBg?.img) bgUrl = foundBg.img;
  }

  const visualAssetKey = leaderImgUrl ? `${bgUrl}|${leaderImgUrl}` : null;
  const [resumeVisualSnapshot] = useState(readHomeResumeSnapshot);
  const [readyVisualAssetKey, setReadyVisualAssetKey] = useState<string | null>(null);
  const visualReady = visualAssetKey !== null && readyVisualAssetKey === visualAssetKey;

  useEffect(() => {
    markHomeReloadStage("homeShellReady");
  }, []);

  useEffect(() => {
    if (!visualAssetKey || !leaderImgUrl) return;
    let active = true;
    const townReady = preloadAndDecodeHomeImage(bgUrl).then((loaded) => {
      if (loaded) markHomeReloadStage("townImageDecoded");
      return loaded;
    });
    const leaderReady = preloadAndDecodeHomeImage(leaderImgUrl).then((loaded) => {
      if (loaded) markHomeReloadStage("leaderImageDecoded");
      return loaded;
    });
    void Promise.all([townReady, leaderReady]).then(() => {
      if (active) setReadyVisualAssetKey(visualAssetKey);
    });
    return () => {
      active = false;
    };
  }, [bgUrl, leaderImgUrl, visualAssetKey]);

  useEffect(() => {
    if (!visualReady || !leaderImgUrl || !leaderMaster) return;
    markHomeReloadStage("homeVisualReady");
    if (session?.user?.id) {
      writeHomeResumeSnapshot({ backgroundUrl: bgUrl, leaderImageUrl: leaderImgUrl, leaderName: leaderMaster.name });
    }
  }, [bgUrl, leaderImgUrl, leaderMaster, session?.user?.id, visualReady]);

  // チャットプレビュー最新1行
  const latestMessage = (guildChats || []).length > 0 ? guildChats[guildChats.length - 1] : null;
  const unreadChatCount = Number(chatUnreadCounts?.GLOBAL || 0) + Number(chatUnreadCounts?.GUILD || 0);
  const unreadCommunityCount = unreadChatCount + Number(bbsUnreadTotal || 0) + Number(dmUnreadTotal || 0);

  // 🚀 動的拡張性: 左右小アイコン定義配列 (将来の新機能追加も配列追加で即座に対応)
  const leftSubIcons = [
    {
      id: "mission",
      label: "ミッション",
      icon: "/ui/icon_mission.png",
      badge: unreadMissionsCount,
      onClick: () => setShowMissionPanel(true)
    },
    {
      id: "ranking",
      label: "ランキング",
      icon: "/ui/icon_ranking.png",
      onClick: () => navigateTab("ranking")
    },
    {
      id: "community",
      label: "コミュニティ",
      icon: "/ui/icon_community.png",
      badge: unreadCommunityCount,
      onClick: () => navigateTab("bbs")
    }
  ];

  const rightSubIcons = [
    {
      id: "bag",
      label: "マイバッグ",
      icon: "/ui/icon_bag.png",
      onClick: () => navigateTab("bag")
    },
    {
      id: "news",
      label: "お知らせ",
      icon: "/ui/icon_news.png",
      onClick: () => { setShowInboxPanel(true); setInboxPanelTab("news"); }
    },
    {
      id: "present",
      label: "プレゼント",
      icon: "/ui/icon_present.png",
      badge: unclaimedPresentsCount,
      onClick: () => { setShowInboxPanel(true); setInboxPanelTab("presents"); }
    },
    {
      id: "settings",
      label: "設定",
      icon: "/ui/icon_settings.png",
      onClick: () => setShowSettingsPanel(true)
    },
    {
      id: "raid",
      label: "レイド",
      icon: "/ui/icon_raid.png",
      onClick: () => navigateTab("raid")
    }
  ];

  // Ranking is reached from the power panel, and raid is surfaced from the
  // header only while active. Keep the home rails focused on six direct
  // personal, social, inbox, and system actions.
  const visibleLeftSubIcons = leftSubIcons.filter((item) => item.id !== "ranking");
  const visibleRightSubIcons = rightSubIcons.filter((item) => item.id !== "raid");

  const latestActivity = socialActivities[0];
  const activityText = latestActivity ? `${latestActivity.actor_display_name}：${latestActivity.activity_type === "GUILD_CREATED" ? "TRIBEを結成" : latestActivity.activity_type === "POWER_RANK_1" ? "総戦力ランキング1位に到達" : "SSRを獲得"}` : null;
  const latestTicker = latestActivity
    ? { text: activityText!, onClick: () => latestActivity.actor_user_id ? fetchPlayerDetail(latestActivity.actor_user_id) : undefined }
    : { text: "まだ街の動きはありません", onClick: () => undefined };

  const interiorName = PROFILE_INTERIORS.find((item) => item.id === interiorItem)?.name;
  const homeEventState = isRaidActive ? "raid" : "calm";
  const completedPatrolsCount = activePatrols?.filter((patrol: { secondsLeft?: number }) => (patrol.secondsLeft || 0) <= 0).length || 0;
  const handleLeaderTap = () => {
    const lines = ["今夜も、ここを守る。", "行くぞ。街は俺たちのものだ。", "仲間の準備はできてるか？"];
    setLeaderLine(lines[Math.floor(Math.random() * lines.length)]);
    window.setTimeout(() => setLeaderLine(null), 2600);
    playCyberSe("click");
  };

  return (
    <div className="mypage-view">
      <button className={`mypage-live-ticker mypage-live-ticker--visual ${homeEventState} active-scale-effect`} onClick={() => { latestTicker.onClick(); playCyberSe("click"); }}>
        <span className="mypage-live-ticker-label">ACTIVITY</span>
        <span className="mypage-live-ticker-icon" aria-hidden="true">◆</span>
        <span className="mypage-live-ticker-text">{latestTicker.text}</span>
        <span className="mypage-live-ticker-arrow" aria-hidden="true">›</span>
      </button>

      {/* 1. ビジュアルエリア (50vh 固定) */}
      <div
        key={visualAssetKey || bgUrl}
        className={`mypage-visual-area ${visualReady ? "is-ready mypage-background-enter" : `is-preparing ${resumeVisualSnapshot ? "has-resume-snapshot" : ""}`} mypage-event-${homeEventState}`}
        style={{ backgroundImage: visualReady ? `url(${bgUrl})` : resumeVisualSnapshot ? `url(${resumeVisualSnapshot.backgroundUrl})` : "none" }}
        data-visual-readiness={visualReady ? "ready" : "preparing"}
        aria-busy={!visualReady}
      >
        {!visualReady && <div className="mypage-visual-loading" aria-label="リーダーを準備中">
          {resumeVisualSnapshot && <img className="mypage-visual-loading-leader" src={resumeVisualSnapshot.leaderImageUrl} alt="" aria-hidden="true" />}
          <span />
        </div>}
        {/* 背景グラデーションオーバーレイ */}
        <div className="mypage-visual-overlay" />

        {/* 最上段HUD (拠点情報オーバーレイ) */}
        <div className="mypage-base-overlay">
          <div className="mypage-base-overlay-info">
            <span className="mypage-base-overlay-label">拠点</span>
            <span className="mypage-base-overlay-name">{baseName}</span>
          </div>
          <button
            className="mypage-base-overlay-move active-scale-effect"
            onClick={() => { setShowMoveBaseModal(true); playCyberSe("click"); }}
          >
            <img src="/ui/icon_map.png" alt="Map" className="overlay-map-icon" />
            拠点移動
          </button>
        </div>
        <div className="mypage-secondary-hud">
          {homeEventState !== "calm" && (
            <button
              className={`mypage-event-chip ${homeEventState} active-scale-effect`}
              onClick={() => { navigateTab("raid"); playCyberSe("click"); }}
            >
              ⚠ レイド開催中
            </button>
          )}

          {/* 総合力 表示パネル (HUD 2段目右) */}
          <div
            className="mypage-power-panel active-scale-effect"
            role="button"
            tabIndex={0}
            aria-label="総合力ランキングを開く"
            onClick={() => { navigateTab("ranking"); playCyberSe("click"); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                navigateTab("ranking");
                playCyberSe("click");
              }
            }}
          >
            <span className="mypage-power-label">総合力</span>
            <span className={`mypage-power-val${totalPowerLoading ? " is-loading" : ""}`}>
              {totalPowerLoading ? "—" : totalPower.toLocaleString()}
            </span>
            <span className="mypage-power-rank-link">RANK</span>
          </div>
        </div>

        {/* 左側小アイコン群 (動的配列レンダリング) */}
        <div className="mypage-sub-icons-left">
          {visibleLeftSubIcons.map((item) => (
            <button
              key={item.id}
              className="sub-icon-unit active-scale-effect"
              onClick={() => { item.onClick(); playCyberSe("click"); }}
            >
              <img src={item.icon} alt={item.label} className="sub-png-icon" />
              <span className="sub-icon-label">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="small-badge-alert">{item.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* 右側小アイコン群 (動的配列レンダリング) */}
        <div className="mypage-sub-icons-right">
          {visibleRightSubIcons.map((item) => (
            <button
              key={item.id}
              className="sub-icon-unit active-scale-effect"
              onClick={() => { item.onClick(); playCyberSe("click"); }}
            >
              <img src={item.icon} alt={item.label} className="sub-png-icon" />
              <span className="sub-icon-label">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="small-badge-alert">{item.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* 層構造装飾: z-2 置物インテリア */}
        {interiorItem && interiorItem !== "none" && (
          <div className={`mypage-interior-layer ${interiorItem}`} aria-label={interiorName}>
            <span className="mypage-interior-name">{interiorName}</span>
          </div>
        )}

        {/* 層構造装飾: z-3 リーダー立ち絵キャラクター */}
        {visualReady && leaderMaster && leaderImgUrl && <>
          <div className={`mypage-leader-layer ${isSsrLeader ? "is-ssr" : ""}`}>
            <img src={leaderImgUrl} alt={leaderMaster.name} className="mypage-leader-img" loading="eager" decoding="async" />
          </div>
          <button className="mypage-leader-tap-target" onClick={handleLeaderTap} aria-label="リーダーに話しかける" />
        </>}
        {leaderLine && <div className="mypage-leader-line">{leaderLine}</div>}

        {/* 層構造装飾: z-4 称号プレートバナー */}
        {visibleEquippedTitle && (
          <div className="mypage-title-banner-layer">
            <span className="mypage-title-banner-badge">{visibleEquippedTitle}</span>
          </div>
        )}

        {/* 層構造装飾: z-5 前面エフェクト */}
        {equippedFrontEffect && equippedFrontEffect !== "effect_none" && (
          <div className="mypage-front-effect-layer">
            <div className={`front-effect-particle ${equippedFrontEffect}`} />
          </div>
        )}
      </div>

      {/* 2. 丸型漢字メニューボタン (4個均等配置・ネガティブマージン -48px 重ね配置) */}
      <div className="mypage-circle-menu-area" data-home-action-assets="pending-production-delivery">
        {HOME_ACTION_PRESENTATION_SLOTS.map((action) => {
          const upcoming = action.exposure === "UPCOMING";
          return (
            <button
              key={action.id}
              className={`circle-menu-btn ${action.id} ${upcoming ? "upcoming" : "active-scale-effect"}`}
              disabled={upcoming}
              aria-label={upcoming ? `${action.label}は準備中です` : action.label}
              data-action-slot={action.id}
              data-asset-delivery={action.deliveryStatus.toLowerCase()}
              onClick={upcoming ? undefined : () => { if (action.destination) navigateTab(action.destination); playCyberSe("click"); }}
            >
              <img src={action.assetPath} alt="" className="circle-menu-img" aria-hidden="true" />
              {action.id === "conquest" && completedPatrolsCount > 0 && <span className="circle-menu-alert-badge">{completedPatrolsCount}</span>}
              {upcoming && <span className="circle-menu-state-overlay">準備中</span>}
            </button>
          );
        })}
      </div>

      <div className="mypage-lower-content">
        <button className="mypage-primary-cta semantic-cta semantic-cta--primary active-scale-effect" onClick={() => void openPrimaryCta()} disabled={activationHandoffPending} aria-busy={activationHandoffPending}>
          <span className="mypage-primary-cta-eyebrow">{primaryCta.eyebrow}</span>
          <strong>{activationHandoffPending ? "確認中…" : primaryCta.title}</strong>
          <span>{primaryCta.detail}</span>
          <b aria-hidden="true">›</b>
        </button>
        {/* 月額VIPパスバナー */}
        {/* 3. イベントバナーエリア (大ボタン直下) */}
        {visibleBanners.length > 0 && <div className="mypage-event-banner-area">
          <div className="banner-slide-wrapper">
            <button
              className="banner-arrow left"
              onClick={() => setBannerIndex((prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length)}
            >
              ‹
            </button>
            <button
              className={`banner-card${visibleBanners[activeBannerIndex].id === "vip_pass" ? " vip" : ""}`}
              onClick={() => openBanner(visibleBanners[activeBannerIndex].destination)}
              aria-disabled={!visibleBanners[activeBannerIndex].destination}
            >
              <img src={visibleBanners[activeBannerIndex].img} alt="Banner" className="banner-bg-img" />
              <div className="banner-info-overlay">
                <span className="banner-title">{visibleBanners[activeBannerIndex].title}</span>
              </div>
            </button>
            <button
              className="banner-arrow right"
              onClick={() => setBannerIndex((prev) => (prev + 1) % visibleBanners.length)}
            >
              ›
            </button>
          </div>
          <div className="banner-dots">
            {visibleBanners.map((_, i) => (
              <span key={i} className={`dot ${i === activeBannerIndex ? "active" : ""}`} />
            ))}
          </div>
        </div>}

        {/* 4. 1行チャットプレビュー ＆ 暗号メッセージアプリ『トライブ』起動 */}
        <div className="mypage-chat-preview-area">
          <div
            className="chat-preview-bar active-scale-effect"
            onClick={() => { setShowTribeChatPanel(true); playCyberSe("click"); }}
          >
            <span className="chat-tag">[チャット]</span>
            {unreadChatCount > 0 && (
              <span className="chat-unread-badge">
                未読 {unreadChatCount}
              </span>
            )}
            <span className="chat-text">
              {latestMessage ? `${latestMessage.author_name}: ${latestMessage.content}` : "チャットメッセージはありません"}
            </span>
            <span className="tribe-app-link">💬 『トライブ』を開く ›</span>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function HomeTab({ qaState }: { qaState?: HomeTabQaState } = {}) {
  return <MainMyPage qaState={qaState} />;
}
