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
      <div className="outlaw-confirm-dialog">
        <div className={`confirm-header ${isDanger ? "danger" : ""}`}>
          <div className="confirm-header-accent" />
          <span className="confirm-title">{title}</span>
        </div>
        <div className="confirm-body">
          {message}
        </div>
        <div className="confirm-actions">
          <OutlawButton variant="secondary" onClick={onCancel} className="confirm-btn">
            {cancelText}
          </OutlawButton>
          <OutlawButton variant={isDanger ? "danger" : "primary"} onClick={onConfirm} className="confirm-btn">
            {confirmText}
          </OutlawButton>
        </div>
      </div>
    </div>
  );
}
