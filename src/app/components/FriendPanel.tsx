import React from "react";
import { useGame } from "../context/GameContext";
import "./FriendPanel.css";

export default function FriendPanel() {
  const { showFriendPanel, setShowFriendPanel, playCyberSe } = useGame();

  if (!showFriendPanel) return null;

  const handleClose = () => {
    playCyberSe("click");
    setShowFriendPanel(false);
  };

  return (
    <div className="friend-panel-overlay">
      <div className="friend-panel-container">
        {/* ヘッダー */}
        <div className="friend-panel-header">
          <button className="friend-back-btn active-scale-effect" onClick={handleClose}>
            ‹ 戻る
          </button>
          <div className="friend-title">
            <span>友達</span>
          </div>
          <div className="friend-header-spacer"></div>
        </div>

        {/* コンテンツエリア */}
        <div className="friend-panel-body">
          <div className="friend-empty">
            <p>フレンド機能は現在開発中です。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
