import React from "react";
import { useGame } from "../context/GameContext";
import "./TitleView.css";

export default function TitleView() {
  const { showTitleView, setShowTitleView, authLoading, playCyberSe } = useGame();

  if (!showTitleView) return null;

  const handleStart = () => {
    if (authLoading) return;
    playCyberSe("click");
    setShowTitleView(false);
  };

  return (
    <div className="title-view-overlay" onClick={handleStart}>
      <div className="title-view-container">
        {/* 背景画像 (CSSで指定) */}
        
        <div className="title-view-content">
          <div className="title-logo-area">
            <h1 className="title-logo-text">TRIBE<br />NEON REIGN</h1>
            <p className="title-subtitle">歌舞伎町 アウトローサバイバル</p>
          </div>

          <div className="title-tap-area">
            {authLoading ? (
              <div className="title-loading">
                <div className="spinner"></div>
                <span>通信中...</span>
              </div>
            ) : (
              <span className="title-tap-text blink-animation">TAP TO START</span>
            )}
          </div>
        </div>

        <div className="title-footer">
          <span>v0.1.0</span>
          <span>© 2026 OUTLAW GAMES</span>
        </div>
      </div>
    </div>
  );
}
