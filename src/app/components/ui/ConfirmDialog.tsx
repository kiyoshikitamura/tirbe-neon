import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import "./ConfirmDialog.css";
import OutlawButton from "./OutlawButton";
import BattleResultSummary from "../battle/BattleResultSummary";
import RewardReceipt, { type RewardReceiptItem } from "./RewardReceipt";
import CanonicalDialog from "./CanonicalDialog";

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
  kind?: "confirm" | "reward" | "result";
  rewards?: RewardReceiptItem[];
  delivery?: "PRESENT" | "INVENTORY";
  presentation?: "legacy" | "canonical";
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
  kind = "confirm",
  rewards = [],
  delivery = "INVENTORY",
  presentation = "legacy",
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

  if (presentation === "canonical") {
    return (
      <CanonicalDialog
        title={title}
        onClose={() => runAndDismiss(onCancel)}
        actions={[
          ...(cancelText ? [{ label: cancelText, semantic: "secondary" as const, onClick: () => runAndDismiss(onCancel) }] : []),
          { label: confirmText, semantic: isDanger ? "danger" as const : "primary" as const, onClick: () => runAndDismiss(onConfirm) },
        ]}
      >
        {message}
      </CanonicalDialog>
    );
  }

  return (
    <div className="outlaw-confirm-overlay">
      <div className={`outlaw-confirm-dialog ${isDanger ? "danger-mode" : "neon-mode"} kind-${kind}`}>
        <div className="confirm-content-wrapper">
          <h3 className="confirm-title">{title}</h3>
          <div className="confirm-body">
            {kind === "reward" && rewards.length > 0
              ? <RewardReceipt items={rewards} delivery={delivery} note={typeof message === "string" ? message : undefined} />
              : message}
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
