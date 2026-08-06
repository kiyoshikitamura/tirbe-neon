"use client";

import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";

import { useImagePreloader } from "../hooks/useImagePreloader";
import { PROFILE_BACKGROUNDS, CHARACTERS_MASTER } from "@/utils/game_constants";
import MonthlyPassBanner from "./MonthlyPassBanner";
import "./HomeTab.css";

const PRELOAD_IMAGES = [
  "/bg/bg_base_neontower.png",
  "/bg/bg_base_deepdock.png",
  "/bg/bg_base_junkbazaar.png",
  "/bg/bg_base_kitakuragate.png",
  "/ui/icon_bag.png",
  "/ui/icon_cash.png",
  "/ui/icon_community.png",
  "/ui/icon_dia.png",
  "/ui/icon_footer_character.png",
  "/ui/icon_footer_gacha.png",
  "/ui/icon_footer_guild.png",
  "/ui/icon_footer_mypage.png",
  "/ui/icon_footer_shop.png",
  "/ui/icon_friends.png",
  "/ui/icon_map.png",
  "/ui/icon_mission.png",
  "/ui/icon_news.png",
  "/ui/icon_present.png",
  "/ui/icon_raid.png",
  "/ui/icon_ranking.png",
  "/ui/icon_settings.png"
];

/**
 * MainMyPage - マイページメイン画面
 */
function MainMyPage() {
  useImagePreloader(PRELOAD_IMAGES);

  const {
    currentBaseId,
    gvgBaseControls,
    selectedLeader,
    unreadMissionsCount,
    unclaimedPresentsCount,
    guildChats,
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
    totalPower
  } = useGame();

  const equippedTitleName = ownedTitles.find((title: { id: string }) => title.id === titleEquipped)?.name || titleEquipped;


  // イベントバナースライドインジケーター
  const [bannerIndex, setBannerIndex] = useState(0);
  const banners = [
    { id: "b1", title: "【GvG抗争】第2シーズン 覇権争奪戦 開幕", img: "/gacha/bg_gacha_ssr.png" },
    { id: "b2", title: "【ピックアップガチャ】SSR「剛」新登場！", img: "/gacha/bg_gacha_sr.png" },
    { id: "b3", title: "【レイドイベント】強敵「雷神」襲来中！", img: "/gacha/bg_gacha_normal.png" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

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
      onClick: () => setShowFriendPanel(true)
    },
    {
      id: "community",
      label: "コミュニティ",
      icon: "/ui/icon_community.png",
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

  return (
    <div className="mypage-view">
      {/* 1. ビジュアルエリア (50vh 固定) */}
      <div className="mypage-visual-area" style={{ backgroundImage: `url(${bgUrl})` }}>
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

        {/* 総合力 表示パネル (最上段下中央・透過グレー) */}
        <div className="mypage-power-panel">
          <span className="mypage-power-label">総合力</span>
          <span className="mypage-power-val">{(totalPower || 0).toLocaleString()}</span>
        </div>

        {/* 左側小アイコン群 (動的配列レンダリング) */}
        <div className="mypage-sub-icons-left">
          {leftSubIcons.map((item) => (
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
          {rightSubIcons.map((item) => (
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
          <div className="mypage-interior-layer">
            <span className="mypage-interior-badge">{interiorItem}</span>
          </div>
        )}

        {/* 層構造装飾: z-3 リーダー立ち絵キャラクター */}
        <div className="mypage-leader-layer">
          <img src={leaderImgUrl} alt={leaderMaster.name} className="mypage-leader-img" />
        </div>

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
        </button>

        <button
          className="circle-menu-btn war active-scale-effect"
          onClick={() => { navigateTab("gvg"); playCyberSe("click"); }}
        >
          <img src="/menu/menu_war.png" alt="抗争" className="circle-menu-img" />
        </button>
      </div>

      <div className="px-3 pb-3 flex-col-gap-2">
        {/* 月額VIPパスバナー */}
        <MonthlyPassBanner />

        {/* 3. イベントバナーエリア (大ボタン直下) */}
        <div className="mypage-event-banner-area">
          <div className="banner-slide-wrapper">
            <button
              className="banner-arrow left"
              onClick={() => setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            >
              ‹
            </button>
            <div className="banner-card">
              <img src={banners[bannerIndex].img} alt="Banner" className="banner-bg-img" />
              <div className="banner-info-overlay">
                <span className="banner-title">{banners[bannerIndex].title}</span>
              </div>
            </div>
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
