import React from "react";
import "./ConfirmDialog.css";
import OutlawButton from "./OutlawButton";

export interface ConfirmDialogConfig {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
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
  cancelText = "キャンセル",
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogConfig) {
  if (!isOpen) return null;

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
              <OutlawButton variant="secondary" onClick={onCancel} className="confirm-btn flex-1">
                {cancelText}
              </OutlawButton>
            )}
            <OutlawButton variant="secondary" onClick={onConfirm} className="confirm-btn flex-1">
              {confirmText}
            </OutlawButton>
          </div>
        </div>
      </div>
    </div>
  );
}
