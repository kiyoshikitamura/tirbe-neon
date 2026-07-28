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
import MapTab from "./components/MapTab";
import MenuTab from "./components/MenuTab";
import RankingTab from "./components/RankingTab";
import AvatarTab from "./components/AvatarTab";
import AdvView from "./components/AdvView";
import BagTab from "./components/BagTab";
import CardBattleView from "./components/CardBattleView";
import CommonModals from "./components/CommonModals";
import BbsTab from "./components/BbsTab";

function AppContent() {
  const { session, authLoading, isSetupRequired, activeTab } = useGame();

  if (authLoading) {
    return (
      <div className="app-container app-container--loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  if (isSetupRequired) {
    return <SetupView />;
  }

  return (
    <div className="app-container app-container--mobile">
      {/* 共通モバイルヘッダー */}
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
        {activeTab === "map" && <MapTab />}
        {activeTab === "menu" && <MenuTab />}
        {activeTab === "bag" && <BagTab />}
        {activeTab === "ranking" && <RankingTab />}
        {activeTab === "avatar" && <AvatarTab />}
        {activeTab === "bbs" && <BbsTab />}
      </main>

      {/* 共通モバイルフッター */}
      <Footer />

      <AdvView />
      <CardBattleView />
      <CommonModals />
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
