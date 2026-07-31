import React from "react";
import "./FullScreenPanel.css";
import OutlawButton from "./OutlawButton";
import { useGame } from "../../context/GameContext";

interface FullScreenPanelProps {
  children: React.ReactNode;
  title?: string;
  onClose: () => void;
  className?: string;
  showCloseButton?: boolean;
}

export default function FullScreenPanel({
  children,
  title,
  onClose,
  className = "",
  showCloseButton = true,
}: FullScreenPanelProps) {
  const { playCyberSe } = useGame();

  const handleClose = () => {
    playCyberSe("click");
    onClose();
  };

  return (
    <div className={`outlaw-fullscreen-panel ${className}`}>
      {/* 任意のトップヘッダー（省略可能） */}
      {title && (
        <div className="fullscreen-panel-header">
          <div className="fullscreen-header-accent" />
          <h2 className="fullscreen-header-title">{title}</h2>
        </div>
      )}

      {/* メインコンテンツ領域（スクロール可能） */}
      <div className="fullscreen-panel-content custom-scrollbar">
        {children}
      </div>

      {/* フッターを隠すための位置に固定された「閉じる」ボタン */}
      {showCloseButton && (
        <div className="fullscreen-panel-footer">
          <OutlawButton variant="secondary" onClick={handleClose} fullWidth className="fullscreen-close-btn">
            閉じる
          </OutlawButton>
        </div>
      )}
    </div>
  );
}
