import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGame } from "../context/GameContext";
import CanonicalDialog from "./ui/CanonicalDialog";
import UserIdentityRow from "./profile/UserIdentityRow";
import "./TitleView.css";
import { markTitleAssetReady } from "../lib/screenAssets";

export default function TitleView() {
  const { showTitleView, setShowTitleView, authLoading, setupLoading, session, onboardingState, errorMessage, playCyberSe, handleFirstUserInteraction, handleStartNewGame, gameplayResetEligibility, gameplayResetLoading, checkGameplayResetEligibility, handleResetGameplay, username, identityLeaderCharacterId } = useGame();
  const [isGameStartTransition, setIsGameStartTransition] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const gameStartRef = useRef(false);
  const resetTargetUsername = username.trim() || null;
  const resetTargetReady = Boolean(session?.user?.id && resetTargetUsername);

  useEffect(() => {
    if (showTitleView) markTitleAssetReady();
  }, [showTitleView]);

  if (!showTitleView) return null;

  const openContinue = (event: React.MouseEvent) => {
    event?.stopPropagation();
    handleFirstUserInteraction();
    playCyberSe("click");
    setShowTitleView(false);
  };

  const beginNewGame = async (event: React.MouseEvent) => {
    event.stopPropagation();
    handleFirstUserInteraction();
    playCyberSe("click");
    if (authLoading || setupLoading) return;
    if (session && onboardingState?.has_profile) {
      setResetAcknowledged(false);
      setShowResetWarning(true);
      void checkGameplayResetEligibility();
      return;
    }
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

  const resetReasonMessage = gameplayResetEligibility?.eligible ? null : ({
    PAYMENT: "購入履歴があるアカウントはゲームデータを初期化できません。",
    GUILD: "連合に所属しているため、ゲームデータを初期化できません。",
    ACTIVE_GAMEPLAY: "進行中のゲームがあります。完了後にもう一度お試しください。",
    AUTHENTICATION: "続きからログインした後に、もう一度お試しください。",
    UNSUPPORTED: "現在のアカウントはゲームデータの初期化に対応していません。",
  } as Record<string, string>)[gameplayResetEligibility?.reason || "UNSUPPORTED"];

  const confirmReset = async () => {
    if (!resetTargetReady || !resetAcknowledged || !gameplayResetEligibility?.eligible || gameplayResetLoading || setupLoading) return;
    const succeeded = await handleResetGameplay();
    if (!succeeded) return;
    setShowResetWarning(false);
    setShowTitleView(false);
  };

  return (
    <div className="title-view-overlay">
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
            <div className="title-entry-actions">
              <button className="semantic-cta semantic-cta--primary title-entry-primary" onClick={(event) => void beginNewGame(event)} disabled={authLoading || setupLoading} aria-busy={authLoading || setupLoading}>はじめから</button>
              <button className="semantic-cta semantic-cta--secondary title-entry-secondary" onClick={openContinue}>続きから</button>
              {authLoading && <small className="title-entry-status" role="status">セッション確認中</small>}
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
      {showResetWarning && <CanonicalDialog
        title="ゲームデータの初期化"
        onClose={() => setShowResetWarning(false)}
        actions={[
          { label: "キャンセル", semantic: "secondary", onClick: () => setShowResetWarning(false) },
          { label: "データを初期化してはじめる", semantic: "danger", disabled: !resetTargetReady || !resetAcknowledged || !gameplayResetEligibility?.eligible || gameplayResetLoading || setupLoading, onClick: () => void confirmReset() },
        ]}
      >
        <div className="title-reset-warning">
          <div className="title-reset-target" aria-label={resetTargetUsername ? `初期化対象 ${resetTargetUsername}` : "初期化対象を確認中"}>
            {resetTargetUsername ? <><small>対象</small><UserIdentityRow variant="compact" userName={resetTargetUsername} leaderCharacterId={identityLeaderCharacterId || null} /></> : <small role="status">対象アカウントを確認しています…</small>}
          </div>
          <p>現在のゲームデータを初期化します。所持しているキャラクター、スキル、装備、アイテム、ゲームの進行状況は失われ、元に戻せません。</p>
          <label><input type="checkbox" checked={resetAcknowledged} onChange={(event) => setResetAcknowledged(event.target.checked)} />現在のゲームデータが初期化されることを確認しました</label>
          {gameplayResetLoading ? <small role="status">初期化できる状態か確認しています…</small> : resetReasonMessage ? <small role="alert">{resetReasonMessage}</small> : null}
        </div>
      </CanonicalDialog>}
    </div>
  );
}
