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
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  confirmPendingText?: string;
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
  confirmPendingText = "処理中…",
}: ConfirmDialogConfig) {
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const actionStartedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    actionStartedRef.current = false;
    setDismissed(false);
    setPending(false);
  }, [isOpen, title, message]);

  const runAndDismiss = (action: () => void | Promise<void>) => {
    if (actionStartedRef.current) return;
    actionStartedRef.current = true;
    let result: void | Promise<void>;
    try {
      result = action();
    } catch (error) {
      actionStartedRef.current = false;
      throw error;
    }
    if (result && typeof result.then === "function") {
      setPending(true);
      void result.catch(() => {
        actionStartedRef.current = false;
        setPending(false);
      });
      return;
    }
    // Synchronous actions close in the same input event. Async mutation
    // handlers keep the dialog mounted and replace it with their result state.
    flushSync(() => setDismissed(true));
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
        onClose={pending ? undefined : () => runAndDismiss(onCancel)}
        actions={[
          ...(cancelText ? [{ label: cancelText, semantic: "secondary" as const, disabled: pending, onClick: () => runAndDismiss(onCancel) }] : []),
          { label: pending ? confirmPendingText : confirmText, semantic: isDanger ? "danger" as const : "primary" as const, disabled: pending, onClick: () => runAndDismiss(onConfirm) },
        ]}
      >
        {kind === "reward" && rewards.length > 0
          ? <RewardReceipt items={rewards} delivery={delivery} note={typeof message === "string" ? message : undefined} />
          : message}
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
              <OutlawButton variant="secondary" disabled={pending} onClick={() => runAndDismiss(onCancel)} className="confirm-btn flex-1">
                {cancelText}
              </OutlawButton>
            )}
            <OutlawButton variant={confirmVariant} disabled={pending} onClick={() => runAndDismiss(onConfirm)} className="confirm-btn flex-1">
              {pending ? confirmPendingText : confirmText}
            </OutlawButton>
          </div>
        </div>
      </div>
    </div>
  );
}
