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
import PCLeftChat from "./components/PCLeftChat";
import PCRightSidebar from "./components/PCRightSidebar";
import BbsTab from "./components/BbsTab";

function AppContent() {
  const { session, authLoading, isSetupRequired, activeTab } = useGame();
  const [mounted, setMounted] = React.useState(false);
  const [isPc, setIsPc] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const handleResize = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth <= 100) return;
      setIsPc(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const showPcLayout = mounted && isPc;

  return (
    <div className={`app-container ${showPcLayout ? "app-container--pc" : "app-container--mobile"}`}>
      {/* PC: 全幅ヘッダー */}
      {showPcLayout && <Header isPcLayout={true} />}

      {/* メインレイアウトボディ */}
      <div className="app-layout-body">
        {/* PC: 左チャットカラム */}
        {showPcLayout && (
          <div className="app-col-left">
            <PCLeftChat />
          </div>
        )}

        {/* 中央メインカラム */}
        <div className="app-col-center">
          {/* モバイル: ヘッダーをメインカラム上部に配置 */}
          {!showPcLayout && <Header isPcLayout={false} />}

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

          {/* モバイル: フッター */}
          {!showPcLayout && <Footer />}
        </div>

        {/* PC: 右キャラクターサイドバー (マイページ時のみ) */}
        {showPcLayout && activeTab === "home" && (
          <div className="app-col-right">
            <PCRightSidebar />
          </div>
        )}
      </div>

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
