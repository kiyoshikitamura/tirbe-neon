"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGame } from "../context/GameContext";
import { supabase } from "@/utils/supabase";

import { PROFILE_BACKGROUNDS, CHARACTERS_MASTER, PROFILE_INTERIORS } from "@/utils/game_constants";
import "./HomeTab.css";

/**
 * MainMyPage - マイページメイン画面
 */
function MainMyPage() {
  const {
    currentBaseId,
    gvgBaseControls,
    selectedLeader,
    unreadMissionsCount,
    unclaimedPresentsCount,
    guildChats,
    chatUnreadCounts,
    bbsUnreadTotal,
    dmUnreadTotal,
    friendRequests,
    setShowMissionPanel,
    setShowFriendPanel,
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
    userGuildMember
    , fetchPlayerDetail
  } = useGame();

  const equippedTitleName = ownedTitles.find((title: { id: string }) => title.id === titleEquipped)?.name || titleEquipped;


  // イベントバナースライドインジケーター
  const [bannerIndex, setBannerIndex] = useState(0);
  const [leaderLine, setLeaderLine] = useState<string | null>(null);
  const [funnelMilestones, setFunnelMilestones] = useState<Set<string>>(new Set());
  const [socialActivities, setSocialActivities] = useState<any[]>([]);
  const lastCtaImpression = useRef<string | null>(null);
  const fallbackBanners: Array<{ id: string; title: string; img: string; destination: string }> = [
    { id: "pickup_ssr_go", title: "【ピックアップガチャ】SSR「剛」新登場！", img: "/gacha/bg_gacha_sr.png", destination: "gacha" },
    { id: "raid_raijin", title: "【レイドイベント】強敵「雷神」襲来中！", img: "/gacha/bg_gacha_normal.png", destination: "raid" }
  ];
  const [banners, setBanners] = useState(fallbackBanners);

  const openBanner = (destination: string) => {
    const [tab, subTab] = destination.split(":");
    navigateTab(tab, subTab);
    playCyberSe("click");
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    void supabase.from("home_banner_master").select("id, title, image_url, destination_value").order("priority", { ascending: false }).then(({ data, error }) => {
      const released = (data || []).filter((item) => !["gvg", "shop"].includes(String(item.destination_value || "").split(":")[0]));
      if (!error && released.length) setBanners(released.map((item) => ({ id: item.id, title: item.title, img: item.image_url, destination: item.destination_value || "home" })));
    });
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    void supabase.from("user_funnel_milestones").select("milestone").eq("user_id", session.user.id)
      .then(({ data }) => setFunnelMilestones(new Set((data || []).map((row) => row.milestone))));
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    void supabase.from("social_activity_feed").select("id,activity_type,actor_user_id,actor_display_name,guild_id,object_master_id,display_payload,permanent,created_at")
      .order("permanent", { ascending: false }).order("created_at", { ascending: false }).limit(20)
      .then(({ data, error }) => { if (!error) setSocialActivities(data || []); });
  }, [session?.user?.id]);

  const primaryCta = useMemo<{
    key: string; eyebrow: string; title: string; detail: string; tab?: string; action?: "guild_chat";
  }>(() => {
    const tutorialStep = onboardingState?.tutorial_step;
    if (tutorialStep && tutorialStep !== "AUTHENTICATION") return { key: "tutorial", eyebrow: "次にすること", title: "チュートリアルを続ける", detail: "最初の成功体験を完了しよう。", tab: tutorialStep === "FREE_GACHA" ? "gacha" : tutorialStep === "AUTO_FORMATION" ? "character" : "patrol" };
    if (!funnelMilestones.has("first_pvp")) return { key: "first_pvp", eyebrow: "次にすること", title: "最初のPvPへ挑戦", detail: "街のプレイヤーと競い、現在の強さを確かめよう。", tab: "pvp" };
    if (!funnelMilestones.has("ranking_viewed")) return { key: "ranking_viewed", eyebrow: "次にすること", title: "ランキングを確認", detail: "初戦の順位と次の目標を確認しよう。", tab: "ranking" };
    if (!funnelMilestones.has("first_raid")) return { key: "first_raid", eyebrow: "次にすること", title: "開催中レイドへ", detail: "全プレイヤーで強敵へ挑み、貢献を残そう。", tab: "raid" };
    if (!userGuildMember) return { key: "guild_discovery", eyebrow: "SOCIAL", title: "おすすめTRIBEを見る", detail: "活動中の仲間と出会い、レイド貢献を共有しよう。", tab: "guild" };
    if (!funnelMilestones.has("guild_activation")) return { key: "guild_home", eyebrow: "SOCIAL", title: "所属TRIBEへ", detail: "加入したTRIBEの仲間と次の行動を確認しよう。", tab: "guild" };
    return isRaidActive
      ? { key: "active_raid", eyebrow: "開催中", title: "レイドへ参加", detail: "出現中の強敵へ挑戦できます。", tab: "raid" }
      : { key: "normal_play", eyebrow: "FREE PLAY", title: "クエストへ派遣", detail: "育成素材と報酬を集めよう。", tab: "patrol" };
  }, [funnelMilestones, onboardingState?.tutorial_step, userGuildMember, isRaidActive]);

  useEffect(() => {
    if (!session?.user?.id || lastCtaImpression.current === primaryCta.key) return;
    lastCtaImpression.current = primaryCta.key;
    void supabase.rpc("record_client_funnel_event", { p_event_name: "home_primary_cta_impression", p_source_screen: "home", p_source_cta: primaryCta.key, p_object_id: null, p_metadata: {} });
  }, [primaryCta.key, session?.user?.id]);

  const openPrimaryCta = () => {
    void supabase.rpc("record_client_funnel_event", { p_event_name: "home_primary_cta_click", p_source_screen: "home", p_source_cta: primaryCta.key, p_object_id: null, p_metadata: {} });
    if (primaryCta.action === "guild_chat") setShowTribeChatPanel(true);
    else if (primaryCta.tab) navigateTab(primaryCta.tab);
    playCyberSe("click");
  };

  // 拠点支配ギルド名
  const currentControl = gvgBaseControls?.find((b: any) => b.base_id === currentBaseId);
  const controllerName = currentControl?.guild_name || "未支配";

  // 拠点ID → 表示名・画像ファイル名のマッピング
  const baseMap: { [key: string]: { name: string; file: string } } = {
    "shinjuku": { name: "新宿", file: "neontower" },
    "neontower": { name: "ネオンタワー", file: "neontower" },
    "shibuya": { name: "渋谷", file: "deepdock" },
    "deepdock": { name: "ディープドック", file: "deepdock" },
    "ikebukuro": { name: "池袋", file: "junkbazaar" },
    "junkbazaar": { name: "ジャンクバザール", file: "junkbazaar" },
    "roppongi": { name: "六本木", file: "kitakuragate" }, "akihabara": { name: "秋葉原", file: "junkbazaar" },
    "kitakuragate": { name: "キタクラゲート", file: "kitakuragate" },
  };
  const currentBase = baseMap[currentBaseId || "shinjuku"] || baseMap["shinjuku"];
  const baseName = currentBase.name;

  // リーダーキャラクター立ち絵URL
  const leaderMaster = CHARACTERS_MASTER.find((c) => c.id === selectedLeader) || CHARACTERS_MASTER[0];
  const leaderImgUrl = `/characters/${leaderMaster?.name || "reiji"}_transparent_asset.png`;

  // 選択中背景URL
  let bgUrl = `/bg/bg_base_${currentBase.file}.png`;
  if (selectedBgMode && selectedBgMode !== "auto") {
    const foundBg = PROFILE_BACKGROUNDS.find((b) => b.id === selectedBgMode);
    if (foundBg?.img) bgUrl = foundBg.img;
  }

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
      id: "friends",
      label: "友達",
      icon: "/ui/icon_friends.png",
      badge: friendRequests?.length || 0,
      onClick: () => setShowFriendPanel(true)
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

  const latestActivity = socialActivities.find(activity => activity.actor_user_id === session?.user?.id) || socialActivities[0];
  const activityText = latestActivity ? `${latestActivity.actor_display_name}：${latestActivity.activity_type === "GUILD_CREATED" ? "TRIBEを結成" : latestActivity.activity_type === "POWER_RANK_1" ? "総戦力ランキング1位に到達" : "SSRを獲得"}` : null;
  const latestTicker = isRaidActive
    ? { icon: "⚠", text: "レイド開催中。仲間と迎撃に参加しよう", onClick: () => navigateTab("raid") }
    : latestActivity
      ? { icon: "◆", text: activityText!, onClick: () => latestActivity.actor_user_id ? fetchPlayerDetail(latestActivity.actor_user_id) : undefined }
    : latestMessage
      ? { icon: "💬", text: `${latestMessage.author_name}: ${latestMessage.content}`, onClick: () => navigateTab("bbs") }
      : unclaimedPresentsCount > 0
        ? { icon: "🎁", text: `受け取り待ちのプレゼントが ${unclaimedPresentsCount} 件あります`, onClick: () => { setShowInboxPanel(true); setInboxPanelTab("presents"); } }
        : unreadMissionsCount > 0
          ? { icon: "✓", text: `達成済みミッションが ${unreadMissionsCount} 件あります`, onClick: () => setShowMissionPanel(true) }
          : { icon: "◆", text: "クエストで育成素材を集めよう", onClick: () => navigateTab("patrol") };

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
      {/* 1. ビジュアルエリア (50vh 固定) */}
      <div key={bgUrl} className={`mypage-visual-area mypage-background-enter mypage-event-${homeEventState}`} style={{ backgroundImage: `url(${bgUrl})` }}>
        {/* 背景グラデーションオーバーレイ */}
        <div className="mypage-visual-overlay" />

        {/* 最上段HUD (拠点情報オーバーレイ) */}
        <div className="mypage-base-overlay">
          <div className="mypage-base-overlay-info">
            <span className="mypage-base-overlay-label">拠点</span>
            <span className="mypage-base-overlay-name">{baseName}</span>
            <span className="mypage-base-overlay-sep">｜</span>
            <span className="mypage-base-overlay-controller">支配: {controllerName}</span>
          </div>
          <button
            className="mypage-base-overlay-move active-scale-effect"
            onClick={() => { setShowMoveBaseModal(true); playCyberSe("click"); }}
          >
            <img src="/ui/icon_map.png" alt="Map" className="overlay-map-icon" />
            拠点移動
          </button>
        </div>
        {homeEventState !== "calm" && (
          <button
            className={`mypage-event-chip ${homeEventState} active-scale-effect`}
            onClick={() => { navigateTab("raid"); playCyberSe("click"); }}
          >
            ⚠ レイド開催中
          </button>
        )}

        {/* 総合力 表示パネル (最上段下中央・透過グレー) */}
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
        <div className="mypage-leader-layer">
          <img src={leaderImgUrl} alt={leaderMaster.name} className="mypage-leader-img" />
        </div>
        <button className="mypage-leader-tap-target" onClick={handleLeaderTap} aria-label="リーダーに話しかける" />
        {leaderLine && <div className="mypage-leader-line">{leaderLine}</div>}

        {/* 層構造装飾: z-4 称号プレートバナー */}
        {titleEquipped && titleEquipped !== "title_none" && (
          <div className="mypage-title-banner-layer">
            <span className="mypage-title-banner-badge">{equippedTitleName}</span>
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
      <div className="mypage-circle-menu-area">
        <button
          className="circle-menu-btn allies active-scale-effect"
          onClick={() => { navigateTab("guild"); playCyberSe("click"); }}
        >
          <img src="/menu/menu_allies.png" alt="連合" className="circle-menu-img" />
        </button>

        <button
          className="circle-menu-btn fight active-scale-effect"
          onClick={() => { navigateTab("pvp"); playCyberSe("click"); }}
        >
          <img src="/menu/menu_fight.png" alt="喧嘩" className="circle-menu-img" />
        </button>

        <button
          className="circle-menu-btn conquest active-scale-effect"
          onClick={() => { navigateTab("patrol"); playCyberSe("click"); }}
        >
          <img src="/menu/menu_conquest.png" alt="制圧" className="circle-menu-img" />
          {completedPatrolsCount > 0 && <span className="circle-menu-alert-badge">{completedPatrolsCount}</span>}
        </button>

        <button
          className="circle-menu-btn war active-scale-effect"
          onClick={() => playCyberSe("click")}
          aria-label="GvGは準備中です"
          disabled
        >
          <img src="/menu/menu_war.png" alt="抗争" className="circle-menu-img" />
          <span className="circle-menu-alert-badge">準備中</span>
        </button>
      </div>

      <div className="mypage-lower-content">
        <section className="mission-hub" aria-label="ミッションハブ">
          <header><span>ミッション</span><h2>次の一歩を選ぶ</h2></header>
          <div className="mission-hub-grid">
            <button onClick={() => { navigateTab("character"); playCyberSe("click"); }}>
              <b>POWER</b><span>編成・強化</span><small>仲間を強くする</small>
            </button>
            <button onClick={() => { navigateTab("pvp"); playCyberSe("click"); }}>
              <b>DISCOVERY</b><span>PvP・ランキング</span><small>街の強者を知る</small>
            </button>
            <button onClick={() => { navigateTab("guild"); playCyberSe("click"); }}>
              <b>COMMUNITY</b><span>TRIBE・フレンド</span><small>仲間とつながる</small>
            </button>
          </div>
        </section>
        <button className="mypage-primary-cta semantic-cta semantic-cta--primary active-scale-effect" onClick={openPrimaryCta}>
          <span className="mypage-primary-cta-eyebrow">{primaryCta.eyebrow}</span>
          <strong>{primaryCta.title}</strong>
          <span>{primaryCta.detail}</span>
          <b aria-hidden="true">›</b>
        </button>
        <button className={`mypage-live-ticker ${homeEventState} active-scale-effect`} onClick={() => { latestTicker.onClick(); playCyberSe("click"); }}>
          <span className="mypage-live-ticker-icon" aria-hidden="true">{latestTicker.icon}</span>
          <span className="mypage-live-ticker-text">{latestTicker.text}</span>
          <span className="mypage-live-ticker-arrow" aria-hidden="true">›</span>
        </button>
        {/* 月額VIPパスバナー */}
        {/* 3. イベントバナーエリア (大ボタン直下) */}
        <div className="mypage-event-banner-area">
          <div className="banner-slide-wrapper">
            <button
              className="banner-arrow left"
              onClick={() => setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            >
              ‹
            </button>
            <button
              className={`banner-card${banners[bannerIndex].id === "vip_pass" ? " vip" : ""}`}
              onClick={() => openBanner(banners[bannerIndex].destination)}
            >
              <img src={banners[bannerIndex].img} alt="Banner" className="banner-bg-img" />
              <div className="banner-info-overlay">
                <span className="banner-title">{banners[bannerIndex].title}</span>
              </div>
            </button>
            <button
              className="banner-arrow right"
              onClick={() => setBannerIndex((prev) => (prev + 1) % banners.length)}
            >
              ›
            </button>
          </div>
          <div className="banner-dots">
            {banners.map((_, i) => (
              <span key={i} className={`dot ${i === bannerIndex ? "active" : ""}`} />
            ))}
          </div>
        </div>

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

export default function HomeTab() {
  return <MainMyPage />;
}
