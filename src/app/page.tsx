"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useImagePreloader } from "./hooks/useImagePreloader";
import { GameProvider, useGame } from "./context/GameContext";
import AuthView from "./components/AuthView";
import SetupView from "./components/SetupView";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomeTab from "./components/HomeTab";
const TabLoading = () => <div className="app-loading-screen"><div className="spinner" /></div>;
const PatrolTab = dynamic(() => import("./components/PatrolTab"), { loading: TabLoading });
const PvpTab = dynamic(() => import("./components/PvpTab"), { loading: TabLoading });
const GvgTab = dynamic(() => import("./components/GvgTab"), { loading: TabLoading });
const RaidTab = dynamic(() => import("./components/RaidTab"), { loading: TabLoading });
const GachaTab = dynamic(() => import("./components/GachaTab"), { loading: TabLoading });
const GuildTab = dynamic(() => import("./components/GuildTab"), { loading: TabLoading });
const CharacterTab = dynamic(() => import("./components/CharacterTab"), { loading: TabLoading });
const ShopTab = dynamic(() => import("./components/ShopTab"), { loading: TabLoading });
const MenuTab = dynamic(() => import("./components/MenuTab"), { loading: TabLoading });
const RankingTab = dynamic(() => import("./components/RankingTab"), { loading: TabLoading });
const AvatarTab = dynamic(() => import("./components/AvatarTab"), { loading: TabLoading });
const BbsTab = dynamic(() => import("./components/BbsTab"), { loading: TabLoading });
const AdvView = dynamic(() => import("./components/AdvView"));
const BagTab = dynamic(() => import("./components/BagTab"), { loading: TabLoading });
const CardBattleView = dynamic(() => import("./components/CardBattleView"));
import CommonModals from "./components/CommonModals";
import TribeChatModal from "./components/TribeChatModal";
import InboxPanel from "./components/InboxPanel";
import MissionPanel from "./components/MissionPanel";
import FriendPanel from "./components/FriendPanel";
import SettingsPanel from "./components/SettingsPanel";
import LegalPanel from "./components/LegalPanel";
import ConfirmDialog from "./components/ui/ConfirmDialog";
import GlobalInteractionBlocker from "./components/ui/GlobalInteractionBlocker";
import TitleView from "./components/TitleView";
import MoveBaseModal from "./components/MoveBaseModal";
import TutorialWorldIntro from "./components/TutorialWorldIntro";
import TutorialFreeInstant from "./components/TutorialFreeInstant";
import TutorialRuleGuide from "./components/TutorialRuleGuide";
import TutorialBattlePrompt from "./components/TutorialBattlePrompt";
import TutorialAuthentication from "./components/TutorialAuthentication";

// Assets required to render the first complete Home frame. They are loaded
// before Header/Home/Footer are revealed, preventing the staged pop-in that
// is especially noticeable on mobile Safari.
const HOME_BOOT_ASSETS = [
  "/bg/bg_base_neontower.png", "/bg/bg_base_deepdock.png", "/bg/bg_base_junkbazaar.png", "/bg/bg_base_kitakuragate.png",
  "/characters/reiji_transparent_asset.png", "/characters/rui_transparent_asset.png", "/characters/chang_transparent_asset.png",
  "/menu/menu_allies.png", "/menu/menu_fight.png", "/menu/menu_conquest.png", "/menu/menu_war.png",
  "/gacha/bg_gacha_ssr.png", "/gacha/bg_gacha_sr.png", "/gacha/bg_gacha_normal.png",
  "/ui/icon_bag.png", "/ui/icon_cash.png", "/ui/icon_community.png", "/ui/icon_dia.png", "/ui/icon_friends.png", "/ui/icon_map.png",
  "/ui/icon_mission.png", "/ui/icon_news.png", "/ui/icon_present.png", "/ui/icon_raid.png", "/ui/icon_ranking.png", "/ui/icon_settings.png",
  "/ui/icon_footer_character.png", "/ui/icon_footer_gacha.png", "/ui/icon_footer_guild.png", "/ui/icon_footer_mypage.png", "/ui/icon_footer_shop.png",
];

function AppContent() {
  const { session, authLoading, isSetupRequired, activeTab, showTitleView,
    confirmDialogConfig,
    globalInteractionBlocking
  } = useGame();
  const homeAssetsReady = useImagePreloader(HOME_BOOT_ASSETS);



  // 1. タイトル画面 (一番最初に表示)
  if (showTitleView) {
    return (
      <div className="app-container">
        <TitleView />
      </div>
    );
  }

  // 2. ログイン認証待ちローディング (アプリ枠 .app-container は変化させず、内部に完全保護スクリーンを配置)
  if (authLoading) {
    return (
      <div className="app-container">
        <div className="app-loading-screen">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // 2. 未ログイン認証画面
  if (!session) {
    return (
      <div className="app-container">
        <AuthView />
      </div>
    );
  }

  // 3. 組織設立・初期セットアップ画面
  if (isSetupRequired) {
    return (
      <div className="app-container">
        <SetupView />
      </div>
    );
  }

  if (!homeAssetsReady) {
    return (
      <div className="app-container">
        <div className="app-loading-screen"><div className="spinner" /></div>
      </div>
    );
  }

  // 4. メインゲーム画面 (全13タブ共通フレーム)
  return (
    <div className="app-container">
      {/* 全タブ共通 2行構成モバイルヘッダー */}
      <Header />

      {/* メインビューポートコンテンツ */}
      <main className="main-content">
        {activeTab === "home" && <HomeTab />}
        {(activeTab === "patrol" || activeTab === "quest") && <PatrolTab />}
        {activeTab === "pvp" && <PvpTab />}
        {activeTab === "gvg" && <GvgTab />}
        {activeTab === "raid" && <RaidTab />}
        {activeTab === "gacha" && <GachaTab />}
        {activeTab === "guild" && <GuildTab />}
        {activeTab === "character" && <CharacterTab />}
        {activeTab === "shop" && <ShopTab />}

        {activeTab === "menu" && <MenuTab />}
        {activeTab === "bag" && <BagTab />}
        {activeTab === "ranking" && <RankingTab />}
        {activeTab === "avatar" && <AvatarTab />}
        {activeTab === "bbs" && <BbsTab />}
      </main>

      {/* 全タブ共通 モバイルフッター */}
      <Footer />

      {/* Layer 3: コンパクトモーダル */}
      <CommonModals />
      <MoveBaseModal />

      {/* Layer 4: フルスクリーンパネル */}
      <TribeChatModal />
      <InboxPanel />
      <MissionPanel />
      <FriendPanel />
      <SettingsPanel />
      <LegalPanel />

      {/* Layer 5: システムオーバーレイ */}
      <AdvView />
      <CardBattleView />
      <TutorialWorldIntro />
      <TutorialFreeInstant />
      <TutorialRuleGuide />
      <TutorialBattlePrompt />
      <TutorialAuthentication />
      
      {/* Layer 6: 最上位の共通ダイアログとブロッカー */}
      <ConfirmDialog {...confirmDialogConfig} />
      <GlobalInteractionBlocker isBlocking={globalInteractionBlocking} />
    </div>
  );
}

export default function Home() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
