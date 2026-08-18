import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import "./ConfirmDialog.css";
import OutlawButton from "./OutlawButton";
import BattleResultSummary from "../battle/BattleResultSummary";

export interface ConfirmDialogConfig {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  confirmVariant?: "primary" | "secondary" | "ghost" | "danger" | "neon";
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "OK",
  confirmVariant = "secondary",
  cancelText = "キャンセル",
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogConfig) {
  const [dismissed, setDismissed] = useState(false);
  const actionStartedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    actionStartedRef.current = false;
    setDismissed(false);
  }, [isOpen, title, message]);

  const runAndDismiss = (action: () => void) => {
    if (actionStartedRef.current) return;
    actionStartedRef.current = true;
    // Remove the dialog in this input event. Parent cleanup and any async work
    // may continue without making the close button appear unresponsive.
    flushSync(() => setDismissed(true));
    action();
  };

  if (!isOpen || dismissed) return null;
  const isBattleResult = title === "バトル結果";
  const isVictory = isBattleResult && typeof message === "string" && message.includes("勝利");

  if (isBattleResult) {
    return (
      <div className="outlaw-confirm-overlay">
        <BattleResultSummary victory={isVictory} onContinue={() => runAndDismiss(onConfirm)} />
      </div>
    );
  }

  return (
    <div className="outlaw-confirm-overlay">
      <div className={`outlaw-confirm-dialog ${isDanger ? "danger-mode" : "neon-mode"}`}>
        <div className="confirm-content-wrapper">
          <h3 className="confirm-title">{title}</h3>
          <div className="confirm-body">
            {message}
          </div>

          <div className="confirm-actions">
            {onCancel && cancelText && (
              <OutlawButton variant="secondary" onClick={() => runAndDismiss(onCancel)} className="confirm-btn flex-1">
                {cancelText}
              </OutlawButton>
            )}
            <OutlawButton variant={confirmVariant} onClick={() => runAndDismiss(onConfirm)} className="confirm-btn flex-1">
              {confirmText}
            </OutlawButton>
          </div>
        </div>
      </div>
    </div>
  );
}
