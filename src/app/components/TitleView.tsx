import React, { useState } from "react";
import Link from "next/link";
import { useGame } from "../context/GameContext";
import "./TitleView.css";

export default function TitleView() {
  const { showTitleView, setShowTitleView, authLoading, setupLoading, session, errorMessage, playCyberSe, handleStartNewGame } = useGame();
  const [showEntryActions, setShowEntryActions] = useState(false);

  if (!showTitleView) return null;

  const handleStart = () => {
    if (authLoading) return;
    playCyberSe("click");
    if (session) setShowTitleView(false);
    else setShowEntryActions(true);
  };

  const beginNewGame = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (await handleStartNewGame()) setShowTitleView(false);
  };

  const openExistingLogin = (event: React.MouseEvent) => {
    event.stopPropagation();
    playCyberSe("click");
    setShowTitleView(false);
  };

  return (
    <div className="title-view-overlay" onClick={handleStart}>
      <div className="title-view-container">
        {/* 背景画像 (CSSで指定) */}
        
        <div className="title-view-content">
          <div className="title-tap-area">
            {authLoading || setupLoading ? (
              <div className="title-loading">
                <div className="spinner"></div>
              </div>
            ) : showEntryActions && !session ? (
              <div className="title-entry-actions" onClick={(event) => event.stopPropagation()}>
                <button className="title-entry-primary" onClick={(event) => void beginNewGame(event)}>はじめから</button>
                <button className="title-entry-secondary" onClick={openExistingLogin}>既存アカウントでログイン</button>
                {errorMessage && <div className="title-entry-error" role="alert">{errorMessage}</div>}
              </div>
            ) : (
              <span className="title-tap-text blink-animation">TAP TO START</span>
            )}
          </div>
        </div>

        <div className="title-footer">
          <div className="title-legal-links" onClick={(event) => event.stopPropagation()}>
            <Link href="/legal/terms">利用規約</Link>
            <Link href="/legal/privacy">プライバシーポリシー</Link>
            <Link href="/legal/commercial">特定商取引法に基づく表記</Link>
          </div>
          <div className="title-copyright">
            <span>v0.1.0</span>
            <span>© 2026 TRIBE: NEON REIGN. All rights reserved.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
