import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGame } from "../context/GameContext";
import "./TitleView.css";
import { markTitleAssetReady } from "../lib/screenAssets";

export default function TitleView() {
  const { showTitleView, setShowTitleView, authLoading, setupLoading, session, errorMessage, playCyberSe, handleFirstUserInteraction, handleStartNewGame } = useGame();
  const [showEntryActions, setShowEntryActions] = useState(false);
  const [isGameStartTransition, setIsGameStartTransition] = useState(false);
  const gameStartRef = useRef(false);

  useEffect(() => {
    if (showTitleView) markTitleAssetReady();
  }, [showTitleView]);

  if (!showTitleView) return null;

  const handleStart = (event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    if (authLoading) return;
    handleFirstUserInteraction();
    playCyberSe("click");
    if (session) setShowTitleView(false);
    else setShowEntryActions(true);
  };

  const beginNewGame = async (event: React.MouseEvent) => {
    event.stopPropagation();
    handleFirstUserInteraction();
    if (gameStartRef.current) return;
    gameStartRef.current = true;
    setIsGameStartTransition(true);
    const succeeded = await handleStartNewGame();
    if (succeeded) {
      setShowTitleView(false);
      return;
    }
    gameStartRef.current = false;
    setIsGameStartTransition(false);
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
        
        {isGameStartTransition ? (
          <div className="game-start-transition" role="status" aria-live="polite" aria-label="ゲーム開始中">
            <img src="/branding/tribe-neon-logo.png" alt="TRIBE NEON" />
            <div className="game-start-signal" aria-hidden="true"><i /><i /><i /></div>
            <strong>起動中</strong>
          </div>
        ) : <div className="title-view-content">
          <div className="title-tap-area">
            {showEntryActions && !session ? (
              <div className="title-entry-actions" onClick={(event) => event.stopPropagation()}>
                <button className="semantic-cta semantic-cta--primary title-entry-primary" onClick={(event) => void beginNewGame(event)} disabled={setupLoading}>はじめから</button>
                <button className="semantic-cta semantic-cta--secondary title-entry-secondary" onClick={openExistingLogin}>既存アカウントでログイン</button>
                {errorMessage && <div className="title-entry-error" role="alert">{errorMessage}</div>}
              </div>
            ) : (
              <button className="semantic-cta semantic-cta--primary title-tap-text blink-animation" onClick={handleStart} disabled={authLoading} aria-busy={authLoading}>
                {authLoading ? "セッション確認中" : "TAP TO START"}
              </button>
            )}
          </div>
        </div>}

        <div className="title-footer">
          <div className="title-legal-links" onClick={(event) => event.stopPropagation()}>
            <Link href="/legal/terms">利用規約</Link>
            <Link href="/legal/privacy">プライバシーポリシー</Link>
            <Link href="/legal/commercial">特定商取引法に基づく表記</Link>
          </div>
          <div className="title-copyright">
            <span>v0.1.0</span>
            <span>© 2026 TRIBE NEON</span>
          </div>
        </div>
      </div>
    </div>
  );
}
