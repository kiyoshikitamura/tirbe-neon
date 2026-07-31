import React from "react";
import { useGame } from "../context/GameContext";
import FullScreenPanel from "./ui/FullScreenPanel";
import "./FriendPanel.css";

export default function FriendPanel() {
  const { showFriendPanel, setShowFriendPanel } = useGame();

  if (!showFriendPanel) return null;

  const handleClose = () => {
    setShowFriendPanel(false);
  };

  return (
    <FullScreenPanel title="友達" onClose={handleClose}>
      <div className="friend-panel-container-inner">
        <div className="friend-empty">
          <p>フレンド機能は現在開発中です。</p>
        </div>
      </div>
    </FullScreenPanel>
  );
}
