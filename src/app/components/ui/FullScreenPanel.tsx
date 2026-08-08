import React from "react";
import "./FullScreenPanel.css";
import OutlawButton from "./OutlawButton";
import ModalShell from "./ModalShell";
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
    <ModalShell
      title={title}
      className={`outlaw-fullscreen-panel ${className}`}
      footer={showCloseButton ? (
          <OutlawButton variant="secondary" onClick={handleClose} fullWidth className="fullscreen-close-btn">
            閉じる
          </OutlawButton>
      ) : undefined}
    >
      {children}
    </ModalShell>
  );
}
