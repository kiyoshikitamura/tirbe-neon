import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGame } from "../context/GameContext";
import "./TitleView.css";
import { markTitleAssetReady } from "../lib/screenAssets";

export default function TitleView() {
  const { showTitleView, setShowTitleView, authLoading, setupLoading, resumeLoading, resumeCurrentSession, session, errorMessage, playCyberSe, handleFirstUserInteraction, handleStartNewGame } = useGame();
  const [isGameStartTransition, setIsGameStartTransition] = useState(false);
  const gameStartRef = useRef(false);
  const entryReady = !authLoading;
  // A restored session is the recoverable account authority. This includes an
  // anonymous player who has not entered a name yet; it must resume instead of
  // creating a second anonymous lifecycle.
  const canStartNewGame = entryReady && !session;

  useEffect(() => {
    if (showTitleView) markTitleAssetReady();
  }, [showTitleView]);

  if (!showTitleView) return null;

  const openContinue = async (event: React.MouseEvent) => {
    event?.stopPropagation();
    if (resumeLoading) return;
    handleFirstUserInteraction();
    playCyberSe("click");
    if (session) await resumeCurrentSession();
    else setShowTitleView(false);
  };

  const beginNewGame = async (event: React.MouseEvent) => {
    event.stopPropagation();
    handleFirstUserInteraction();
    playCyberSe("click");
    if (authLoading || setupLoading) return;
    if (session) return;
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

  return (
    <div className="title-view-overlay">
      <div className="title-view-container">
        {/* 背景画像 (CSSで指定) */}
        
        {isGameStartTransition || resumeLoading ? (
          <div className="game-start-transition" role="status" aria-live="polite" aria-label="ゲーム開始中">
            <img src="/branding/tribe-neon-logo.png" alt="TRIBE NEON" />
            <div className="game-start-signal" aria-hidden="true"><i /><i /><i /></div>
            <strong>{resumeLoading ? "再開中" : "起動中"}</strong>
          </div>
        ) : <div className="title-view-content">
          <div className="title-tap-area">
            <div className="title-entry-actions">
              {canStartNewGame && <button className="semantic-cta semantic-cta--primary title-entry-primary" onClick={(event) => void beginNewGame(event)} disabled={setupLoading} aria-busy={setupLoading}>はじめから</button>}
              {entryReady && <button className="semantic-cta semantic-cta--secondary title-entry-secondary" onClick={(event) => void openContinue(event)} disabled={resumeLoading}>続きから</button>}
              {!entryReady && <small className="title-entry-status" role="status">セッション確認中</small>}
              {errorMessage && <div className="title-entry-error" role="alert">{errorMessage}</div>}
            </div>
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
