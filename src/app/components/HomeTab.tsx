"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";
import { resolveAvailableMyPageCreatives } from "@/domain/presentation/production_creatives";
import { HOME_ACTION_PRESENTATION_SLOTS } from "@/domain/presentation/homeActionPresentation";
import { resolveHomeCharacterDialogueLines } from "@/domain/presentation/homeCharacterDialogue";
import { isDestinationAvailable } from "@/domain/operations/operations";
import { resolvePresentableAssetUrl } from "@/utils/assetPresentation";
import { getJstDateString } from "@/utils/jst_date";
import CharacterPresentation from "./character/CharacterPresentation";
import UserIdentityRow from "./profile/UserIdentityRow";
import CanonicalDialog from "./ui/CanonicalDialog";
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

  const tracked = promise.then((loaded) => {
    if (!loaded) homeVisualAssetPromises.delete(src);
    return loaded;
  });
  homeVisualAssetPromises.set(src, tracked);
  return tracked;
}

type HomeTabQaState = Readonly<{
  socialActivities?: readonly any[];
  funnelMilestones?: readonly string[];
  ctaAuthorityReady?: boolean;
  guildDiscoveryState?: "pending" | "error" | "empty" | "available";
}>;

type HomeActivity = {
  id: string;
  activity_type?: string | null;
  actor_user_id?: string | null;
  actor_display_name?: string | null;
  actor_favorite_character_id?: string | null;
  actor_guild_name?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type HomeBanner = {
  id: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  img: string | null;
  destination: string | null;
  eventId?: string;
};

function activityDescription(activity: HomeActivity) {
  if (activity.activity_type === "GUILD_CREATED") return "TRIBEを結成";
  if (activity.activity_type === "POWER_RANK_1") return "総戦力ランキング1位に到達";
  return "SSRを獲得";
}

function activityTimeLabel(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

/**
 * MainMyPage - マイページメイン画面
 */
function MainMyPage({ qaState }: { qaState?: HomeTabQaState }) {
  const {
    currentBaseId,
    identityLeaderCharacterId,
    identityLeaderAuthorityReady,
    refreshIdentityLeaderAuthority,
    unreadMissionsCount,
    guildChats,
    chatUnreadCounts,
    setShowMissionPanel,
    setMissionTab,
    setShowLoginBonusModal,
    setShowAccountAuthenticationModal,
    setShowMoveBaseModal,
    setShowTribeChatPanel,
    navigateTab,
    playCyberSe,
    selectedBgMode,
    titleEquipped,
    ownedTitles,
    interiorItem,
    equippedFrontEffect,
    isRaidActive,
    session,
    activePatrols,
    onboardingState,
    userGuildMember,
    pendingGuildJoinRequests,
    guildMembershipAuthorityReady,
    guildDiscoveryState,
    featureOperatingStates,
    fetchPlayerDetail,
    setErrorMessage,
    setGuideGachaCategory
  } = useGame();

  const equippedTitleName = ownedTitles.find((title: { id: string }) => title.id === titleEquipped)?.name || titleEquipped;
  const visibleEquippedTitle = equippedTitleName && !["title_none", "称号なし", "No Title", "半グレの首領"].includes(equippedTitleName)
    ? equippedTitleName
    : null;


  // イベントバナースライドインジケーター
  const [bannerIndex, setBannerIndex] = useState(0);
  const [leaderLine, setLeaderLine] = useState<{ characterId: string; text: string } | null>(null);
  const leaderLineTimerRef = useRef<number | null>(null);
  const [funnelMilestones, setFunnelMilestones] = useState<Set<string>>(new Set(qaState?.funnelMilestones || []));
  const [funnelAuthorityOwnerUserId, setFunnelAuthorityOwnerUserId] = useState(qaState?.funnelMilestones ? "qa" : "");
  const [activationHandoffPending, setActivationHandoffPending] = useState(false);
  const [socialActivities, setSocialActivities] = useState<HomeActivity[]>([...(qaState?.socialActivities || [])] as HomeActivity[]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const lastCtaImpression = useRef<string | null>(null);
  const lastBannerImpression = useRef<string | null>(null);
  const [banners, setBanners] = useState<HomeBanner[]>(() => PRODUCTION_MY_PAGE_CREATIVES?.map((creative) => ({
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
    const currentBanner = visibleBanners[activeBannerIndex];
    if (currentBanner?.eventId) void supabase.rpc("record_mission_event_telemetry", {
      p_event_id: currentBanner.eventId,
      p_event_name: "banner_click",
      p_source: "rotation_banner",
      p_mission_id: null,
      p_metadata: { jst_date: getJstDateString() },
    });
    if (destination === "mission:SPECIAL") {
      setMissionTab("SPECIAL");
      setShowMissionPanel(true);
      playCyberSe("click");
      return;
    }
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
    const banner = visibleBanners[activeBannerIndex];
    if (!banner?.eventId || lastBannerImpression.current === banner.id) return;
    lastBannerImpression.current = banner.id;
    void supabase.rpc("record_mission_event_telemetry", {
      p_event_id: banner.eventId,
      p_event_name: "banner_impression",
      p_source: "rotation_banner",
      p_mission_id: null,
      p_metadata: { jst_date: getJstDateString() },
    });
  }, [activeBannerIndex, visibleBanners]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    void supabase.rpc("get_active_mission_events").then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data)) return;
      const eventBanners: HomeBanner[] = data.flatMap((event: any) => {
        const eventId = String(event.event_id || event.id || "");
        if (!eventId || event.banner_visible === false) return [];
        return [{
          id: `mission-event-${eventId}`,
          eventId,
          title: String(event.banner_title || "ギルドバトル開幕に備えよ"),
          subtitle: String(event.banner_subtitle || "準備ミッション開催中"),
          ctaLabel: String(event.banner_cta_label || "ミッションを見る"),
          img: resolvePresentableAssetUrl(event.banner_image_url),
          destination: "mission:SPECIAL",
        }];
      });
      if (eventBanners.length > 0) setBanners((current) => [
        ...current.filter((banner) => !banner.eventId),
        ...eventBanners,
      ]);
    });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (PRODUCTION_MY_PAGE_CREATIVES) return;
    void supabase.from("home_banner_master").select("id, title, image_url, destination_value").order("priority", { ascending: false }).then(({ data, error }) => {
      const released = (data || []).filter((item) => isDestinationAvailable(item.destination_value || "home", featureOperatingStates));
      const presentable = released.flatMap((item) => {
        const imageUrl = resolvePresentableAssetUrl(item.image_url);
        return imageUrl ? [{ id: item.id, title: item.title, img: imageUrl, destination: item.destination_value || "home" }] : [];
      });
      if (!error && presentable.length) setBanners(presentable);
    });
  }, [featureOperatingStates]);

  useEffect(() => {
    setBanners((current) => current.filter((banner) => !banner.destination || isDestinationAvailable(banner.destination, featureOperatingStates)));
  }, [featureOperatingStates]);

  useEffect(() => {
    if (qaState?.funnelMilestones) return;
    if (!session?.user?.id) return;
    let active = true;
    void supabase.from("user_funnel_milestones").select("milestone").eq("user_id", session.user.id)
      .then(({ data, error }) => {
        if (!active || error) return;
        setFunnelMilestones(new Set((data || []).map((row) => row.milestone)));
        setFunnelAuthorityOwnerUserId(session.user.id);
      });
    return () => { active = false; };
  }, [qaState?.funnelMilestones, session?.user?.id, userGuildMember?.guild_id]);

  useEffect(() => {
    if (qaState?.socialActivities) return;
    if (!session?.user?.id) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase.from("social_activity_feed").select("id,activity_type,actor_user_id,actor_display_name,guild_id,object_master_id,display_payload,permanent,created_at")
        .order("permanent", { ascending: false }).order("created_at", { ascending: false }).limit(20);
      if (error || !active) return;
      const visible = (data || []).filter((event: HomeActivity) => !["FRIEND", "GVG", "SHOP", "PAYMENT"].includes(String(event.activity_type || "").toUpperCase()));
      const actorIds = [...new Set(visible.map((event: HomeActivity) => event.actor_user_id).filter((id): id is string => Boolean(id)))];
      const profilesById = new Map<string, { username?: string | null; favorite_character_id?: string | null; guild_name?: string | null }>();
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_public_profiles", { p_user_ids: actorIds });
        if (Array.isArray(profiles)) {
          for (const profile of profiles) profilesById.set(String(profile.user_id || profile.id), profile);
        }
      }
      if (!active) return;
      setSocialActivities(visible.map((event: HomeActivity) => {
        const profile = event.actor_user_id ? profilesById.get(event.actor_user_id) : undefined;
        return {
          ...event,
          actor_display_name: profile?.username || event.actor_display_name,
          actor_favorite_character_id: profile?.favorite_character_id || null,
          actor_guild_name: profile?.guild_name || null,
        };
      }));
    })();
    return () => { active = false; };
  }, [qaState?.socialActivities, session?.user?.id]);

  const primaryCta = useMemo<{
    key: string; title: string; tab?: string; action?: "guild_chat" | "mission_handoff";
  } | null>(() => {
    const ctaAuthorityReady = qaState
      ? qaState.ctaAuthorityReady !== false
      : Boolean(session?.user?.id
        && onboardingState
        && funnelAuthorityOwnerUserId === session.user.id
        && guildMembershipAuthorityReady);
    if (!ctaAuthorityReady) return null;
    const tutorialStep = onboardingState?.tutorial_step;
    if (tutorialStep && !onboardingState?.gameplay_authorized) return { key: "tutorial", title: "チュートリアルを続ける", tab: tutorialStep === "FREE_GACHA" ? "gacha" : tutorialStep === "AUTO_FORMATION" ? "character" : "patrol" };
    if (!funnelMilestones.has("first_free_skill_ten_pull")) return { key: "first_free_asset_gacha", title: "無料スキル／装備ガチャを引こう", tab: "gacha" };
    if (!funnelMilestones.has("first_free_equipment_ten_pull")) return { key: "first_free_asset_gacha", title: "無料スキル／装備ガチャを引こう", tab: "gacha" };
    if (!funnelMilestones.has("first_main_loadout")) return { key: "first_main_loadout", title: "装備を整えよう", tab: "character" };
    if (!funnelMilestones.has("first_pvp")) return { key: "first_pvp", title: "最初のバトルへ挑戦", tab: "pvp" };
    if (!funnelMilestones.has("first_raid") && isRaidActive) return { key: "first_raid", title: "開催中レイドへ", tab: "raid" };
    if (!userGuildMember) {
      if (pendingGuildJoinRequests.length > 0) return { key: "guild_pending", title: "ギルド申請を確認", tab: "guild" };
      const discoveryState = qaState?.guildDiscoveryState || guildDiscoveryState;
      if (discoveryState === "empty") return { key: "guild_creation", title: "ギルドを設立しよう", tab: "guild" };
      if (discoveryState === "available") return { key: "guild_discovery", title: "ギルドに加入しよう", tab: "guild" };
      return null;
    }
    if (!funnelMilestones.has("activation_mission_handoff")) return {
      key: "activation_mission_handoff",
      title: "ミッションを進めよう",
      action: "mission_handoff",
    };
    return null;
  }, [funnelMilestones, funnelAuthorityOwnerUserId, guildDiscoveryState, guildMembershipAuthorityReady, onboardingState, pendingGuildJoinRequests.length, qaState, session?.user?.id, userGuildMember, isRaidActive]);

  useEffect(() => {
    if (!session?.user?.id || !primaryCta || lastCtaImpression.current === primaryCta.key) return;
    lastCtaImpression.current = primaryCta.key;
    void supabase.rpc("record_client_funnel_event", { p_event_name: "home_primary_cta_impression", p_source_screen: "home", p_source_cta: primaryCta.key, p_object_id: null, p_metadata: {} });
  }, [primaryCta, session?.user?.id]);

  const openPrimaryCta = async () => {
    if (activationHandoffPending || !primaryCta) return;
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
    else if (primaryCta.tab) {
      if (primaryCta.key === "first_free_asset_gacha") {
        setGuideGachaCategory(funnelMilestones.has("first_free_skill_ten_pull") ? "EQUIPMENT" : "SKILL");
      }
      navigateTab(primaryCta.tab, primaryCta.key === "first_main_loadout" ? "party" : undefined);
    }
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
  const leaderCharacterId = identityLeaderCharacterId || null;
  const leaderMaster = leaderCharacterId
    ? CHARACTERS_MASTER.find((c) => c.id === leaderCharacterId)
    : undefined;
  const leaderDialogueLines = resolveHomeCharacterDialogueLines(leaderCharacterId);
  const leaderImgUrl = leaderMaster ? getCharacterTransparentImg(leaderMaster.name) : null;
  const isSsrLeader = leaderMaster?.rarity === "SSR";

  // 選択中背景URL
  let bgUrl = `/bg/bg_street_${currentBase.file}.jpg`;
  if (selectedBgMode && selectedBgMode !== "auto") {
    const foundBg = PROFILE_BACKGROUNDS.find((b) => b.id === selectedBgMode);
    if (foundBg?.img) bgUrl = foundBg.img;
  }

  const leaderAuthorityReady = identityLeaderAuthorityReady !== false;
  const visualAssetKey = `${bgUrl}|${leaderAuthorityReady ? leaderImgUrl || "favorite-placeholder" : "leader-authority-pending"}`;
  const [resumeVisualSnapshot] = useState(readHomeResumeSnapshot);
  const currentResumeVisualSnapshot = leaderImgUrl
    && resumeVisualSnapshot?.leaderImageUrl === leaderImgUrl
    && resumeVisualSnapshot.backgroundUrl === bgUrl
      ? resumeVisualSnapshot
      : null;
  const [readyVisualAssetKey, setReadyVisualAssetKey] = useState<string | null>(null);
  const visualReady = readyVisualAssetKey === visualAssetKey;

  useEffect(() => {
    markHomeReloadStage("homeShellReady");
    return () => {
      if (leaderLineTimerRef.current !== null) window.clearTimeout(leaderLineTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (identityLeaderAuthorityReady === false) void refreshIdentityLeaderAuthority?.();
  }, [identityLeaderAuthorityReady, refreshIdentityLeaderAuthority]);

  useEffect(() => {
    if (!leaderAuthorityReady) return;
    let active = true;
    let retryTimer: number | undefined;
    const prepare = async (attempt = 0) => {
      const [townLoaded, leaderLoaded] = await Promise.all([
        preloadAndDecodeHomeImage(bgUrl),
        leaderImgUrl ? preloadAndDecodeHomeImage(leaderImgUrl) : Promise.resolve(true),
      ]);
      if (!active) return;
      if (townLoaded) markHomeReloadStage("townImageDecoded");
      if (leaderImgUrl && leaderLoaded) markHomeReloadStage("leaderImageDecoded");
      if (townLoaded && leaderLoaded) {
        setReadyVisualAssetKey(visualAssetKey);
        return;
      }
      if (attempt < 2) retryTimer = window.setTimeout(() => void prepare(attempt + 1), 220 * (attempt + 1));
    };
    void prepare();
    return () => {
      active = false;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [bgUrl, leaderAuthorityReady, leaderImgUrl, visualAssetKey]);

  useEffect(() => {
    if (!visualReady || !leaderImgUrl || !leaderMaster) return;
    markHomeReloadStage("homeVisualReady");
    if (session?.user?.id) {
      writeHomeResumeSnapshot({ userId: session.user.id, backgroundUrl: bgUrl, leaderImageUrl: leaderImgUrl, leaderName: leaderMaster.name });
    }
  }, [bgUrl, leaderImgUrl, leaderMaster, session?.user?.id, visualReady]);

  // チャットプレビュー最新1行
  const latestMessage = (guildChats || []).length > 0 ? guildChats[guildChats.length - 1] : null;
  const unreadChatCount = Number(chatUnreadCounts?.GLOBAL || 0) + Number(chatUnreadCounts?.GUILD || 0);

  const miniNavigationItems = [
    {
      id: "login-bonus",
      label: "ボーナス",
      icon: "/ui/icon_present.png",
      onClick: () => setShowLoginBonusModal(true)
    },
    {
      id: "mission",
      label: "ミッション",
      icon: "/menu/home_nav_mission.png",
      badge: unreadMissionsCount,
      onClick: () => setShowMissionPanel(true)
    },
    {
      id: "ranking",
      label: "ランキング",
      icon: "/menu/home_nav_ranking.png",
      onClick: () => navigateTab("ranking")
    },
    {
      id: "raid",
      label: "レイド",
      icon: "/menu/home_nav_raid.png",
      onClick: () => navigateTab("raid")
    }
  ];

  const latestActivity = socialActivities[0];
  const activityText = latestActivity ? activityDescription(latestActivity) : null;

  const interiorName = PROFILE_INTERIORS.find((item) => item.id === interiorItem)?.name;
  const homeEventState = isRaidActive ? "raid" : "calm";
  const completedPatrolsCount = activePatrols?.filter((patrol: { secondsLeft?: number }) => (patrol.secondsLeft || 0) <= 0).length || 0;
  const handleLeaderTap = () => {
    if (!leaderCharacterId || leaderDialogueLines.length === 0) return;
    const text = leaderDialogueLines[Math.floor(Math.random() * leaderDialogueLines.length)];
    setLeaderLine({ characterId: leaderCharacterId, text });
    if (leaderLineTimerRef.current !== null) window.clearTimeout(leaderLineTimerRef.current);
    leaderLineTimerRef.current = window.setTimeout(() => {
      setLeaderLine(null);
      leaderLineTimerRef.current = null;
    }, 2600);
    playCyberSe("click");
  };

  return (
    <div
      className={`mypage-view ${visualReady ? "is-interactive" : "is-interaction-locked"}`}
      data-home-interaction={visualReady ? "ready" : "blocked"}
      aria-busy={!visualReady}
      inert={!visualReady}
    >
      <section
        key={latestActivity?.id || "empty"}
        className={`mypage-live-ticker mypage-live-ticker--visual ${homeEventState}`}
        aria-label="アクティビティ履歴を開く"
        role="button"
        tabIndex={0}
        onClick={() => { setShowActivityLog(true); playCyberSe("click"); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setShowActivityLog(true);
            playCyberSe("click");
          }
        }}
      >
        <span className="mypage-live-ticker-label">ACTIVITY</span>
        {latestActivity ? <>
          <UserIdentityRow
            variant="compact"
            userName={String(latestActivity.actor_display_name || "プレイヤー")}
            guildName={latestActivity.actor_guild_name}
            leaderCharacterId={latestActivity.actor_favorite_character_id}
          />
          <span className="mypage-live-ticker-text">{activityText}</span>
          <span className="mypage-live-ticker-arrow" aria-hidden="true">›</span>
        </> : <span className="mypage-live-ticker-text">まだ街の動きはありません</span>}
      </section>

      {showActivityLog && <CanonicalDialog
        title="アクティビティ"
        size="large"
        ariaLabel="アクティビティ履歴"
        onClose={() => setShowActivityLog(false)}
        actions={[{ label: "閉じる", semantic: "secondary", onClick: () => setShowActivityLog(false) }]}
      >
        {socialActivities.length > 0 ? <div className="mypage-activity-log" data-testid="activity-log">
          {socialActivities.map((activity) => <article className="mypage-activity-log-row" key={activity.id}>
            <UserIdentityRow
              variant="compact"
              userName={String(activity.actor_display_name || "プレイヤー")}
              guildName={activity.actor_guild_name}
              leaderCharacterId={activity.actor_favorite_character_id}
              onOpen={activity.actor_user_id ? () => { void fetchPlayerDetail(activity.actor_user_id!); playCyberSe("click"); } : undefined}
            />
            <div className="mypage-activity-log-detail">
              <strong>{activityDescription(activity)}</strong>
              {activity.created_at && <time dateTime={activity.created_at}>{activityTimeLabel(activity.created_at)}</time>}
            </div>
          </article>)}
        </div> : <p className="mypage-activity-empty">まだアクティビティはありません</p>}
      </CanonicalDialog>}

      {/* 1. ビジュアルエリア (50vh 固定) */}
      <div
        key={visualAssetKey || bgUrl}
        className={`mypage-visual-area ${visualReady ? "is-ready mypage-background-enter" : `is-preparing ${currentResumeVisualSnapshot ? "has-resume-snapshot" : ""}`} mypage-event-${homeEventState}`}
        style={{ backgroundImage: visualReady ? `url(${bgUrl})` : currentResumeVisualSnapshot ? `url(${currentResumeVisualSnapshot.backgroundUrl})` : "none" }}
        data-visual-readiness={visualReady ? "ready" : "preparing"}
        aria-busy={!visualReady}
      >
        {!visualReady && <div className="mypage-visual-loading" aria-label="リーダーを準備中">
          {currentResumeVisualSnapshot && <img className="mypage-visual-loading-leader" src={currentResumeVisualSnapshot.leaderImageUrl} alt="" aria-hidden="true" />}
          <span />
        </div>}
        {/* 背景グラデーションオーバーレイ */}
        <div className="mypage-visual-overlay" />

        <button
          type="button"
          className="mypage-current-location active-scale-effect"
          onClick={() => { setShowMoveBaseModal(true); playCyberSe("click"); }}
          aria-label={`${baseName}から拠点移動を開く`}
        >
          <span>{baseName}</span><small>{currentBase.file.toUpperCase()}</small><b aria-hidden="true">›</b>
        </button>

        {onboardingState?.is_anonymous && onboardingState?.authentication_pending && <button
          type="button"
          className="mypage-authentication-status active-scale-effect"
          onClick={() => { setShowAccountAuthenticationModal(true); playCyberSe("click"); }}
          aria-label="未認証：アカウント認証を開く"
        >
          <span className="mypage-authentication-lock" aria-hidden="true"><i /><b /></span>
          <small>未認証</small>
        </button>}

        <div className="mypage-sub-icons-left">
          {miniNavigationItems.map((item) => (
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
        {visualReady && <>
          <div className={`mypage-leader-layer ${isSsrLeader ? "is-ssr" : ""}`} data-character-authority={leaderMaster ? leaderCharacterId : "placeholder"}>
            <CharacterPresentation src={leaderImgUrl || undefined} alt={leaderMaster?.name || "お気に入りキャラクター未設定"} variant="home-hero" rarity={leaderMaster?.rarity} frameKind={false} metadata={false} />
          </div>
          {leaderMaster && leaderDialogueLines.length > 0 && <button className="mypage-leader-tap-target" onClick={handleLeaderTap} aria-label={`${leaderMaster.jpName}に話しかける`} />}
        </>}
        {leaderLine && leaderLine.characterId === leaderCharacterId && <div className="mypage-leader-line">{leaderLine.text}</div>}

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
        <div className="mypage-stage-transition" aria-hidden="true" />
      </div>

      <div className="mypage-lower-content">
        <nav className="mypage-circle-menu-area" data-home-action-assets="production-delivered" aria-label="メインコンテンツ">
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
                <span className="circle-menu-label"><strong>{action.label}</strong></span>
                {action.id === "conquest" && completedPatrolsCount > 0 && <span className="circle-menu-alert-badge">{completedPatrolsCount}</span>}
                {upcoming && <span className="circle-menu-state-overlay">準備中</span>}
              </button>
            );
          })}
        </nav>

        {primaryCta && <button className="mypage-primary-cta semantic-cta semantic-cta--primary active-scale-effect" onClick={() => void openPrimaryCta()} disabled={activationHandoffPending} aria-busy={activationHandoffPending}>
          <strong>{activationHandoffPending ? "確認中…" : primaryCta.title}</strong>
          <b aria-hidden="true">›</b>
        </button>}

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
              {visibleBanners[activeBannerIndex].img
                ? <img src={visibleBanners[activeBannerIndex].img!} alt="" className="banner-bg-img" onError={() => {
                    const failedId = visibleBanners[activeBannerIndex].id;
                    setBanners((current) => current.map((banner) => banner.id === failedId ? { ...banner, img: null } : banner));
                  }} />
                : <span className="banner-fallback-art" aria-hidden="true" />}
              <div className="banner-info-overlay">
                <span className="banner-title">{visibleBanners[activeBannerIndex].title}</span>
                {visibleBanners[activeBannerIndex].subtitle && <span className="banner-subtitle">{visibleBanners[activeBannerIndex].subtitle}</span>}
                {visibleBanners[activeBannerIndex].ctaLabel && <span className="banner-cta-label">{visibleBanners[activeBannerIndex].ctaLabel}</span>}
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
