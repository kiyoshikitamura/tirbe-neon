"use client";

import React from "react";
import { GameProvider, useGame } from "./context/GameContext";
import AuthView from "./components/AuthView";
import SetupView from "./components/SetupView";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomeTab from "./components/HomeTab";
import PatrolTab from "./components/PatrolTab";
import PvpTab from "./components/PvpTab";
import GvgTab from "./components/GvgTab";
import RaidTab from "./components/RaidTab";
import GachaTab from "./components/GachaTab";
import GuildTab from "./components/GuildTab";
import CharacterTab from "./components/CharacterTab";
import ShopTab from "./components/ShopTab";

import MenuTab from "./components/MenuTab";
import RankingTab from "./components/RankingTab";
import AvatarTab from "./components/AvatarTab";
import AdvView from "./components/AdvView";
import BagTab from "./components/BagTab";
import CardBattleView from "./components/CardBattleView";
import CommonModals from "./components/CommonModals";
import BbsTab from "./components/BbsTab";
import TribeChatModal from "./components/TribeChatModal";
import InboxPanel from "./components/InboxPanel";
import MissionPanel from "./components/MissionPanel";
import FriendPanel from "./components/FriendPanel";
import SettingsPanel from "./components/SettingsPanel";
import LegalPanel from "./components/LegalPanel";
import TitleView from "./components/TitleView";
import MoveBaseModal from "./components/MoveBaseModal";

function AppContent() {
  const { session, authLoading, isSetupRequired, activeTab, showTitleView } = useGame();



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

  // 4. メインゲーム画面 (全13タブ共通フレーム)
  return (
    <div className="app-container">
      {/* 全タブ共通 2行構成モバイルヘッダー */}
      <Header />

      {/* メインビューポートコンテンツ */}
      <main className="main-content">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "patrol" && <PatrolTab />}
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
