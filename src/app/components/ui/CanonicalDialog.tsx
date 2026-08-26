"use client";

import React from "react";
import OutlawButton from "./OutlawButton";
import "./CanonicalDialog.css";

export type CanonicalDialogAction = {
  label: string;
  onClick: () => void;
  semantic?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

export default function CanonicalDialog({
  title,
  children,
  onClose,
  actions = [],
  size = "standard",
  ariaLabel,
  loading = false,
}: {
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  actions?: CanonicalDialogAction[];
  size?: "standard" | "large";
  ariaLabel?: string;
  loading?: boolean;
}) {
  return <div className="canonical-dialog-overlay" onMouseDown={(event) => {
    if (event.target === event.currentTarget && onClose) onClose();
  }}>
    <section className={`canonical-dialog canonical-dialog--${size}`} role="dialog" aria-modal="true" aria-label={ariaLabel || title || "ダイアログ"}>
      <header className="canonical-dialog-header">
        {title ? <h2>{title}</h2> : <span />}
        {onClose && <button type="button" className="canonical-dialog-close" onClick={onClose} aria-label="閉じる">×</button>}
      </header>
      <div className={`canonical-dialog-body ${loading ? "is-loading" : ""}`}>{children}</div>
      {actions.length > 0 && <footer className="canonical-dialog-actions">
        {actions.map((action) => <OutlawButton
          key={action.label}
          variant={action.semantic === "danger" ? "danger" : action.semantic === "primary" ? "primary" : "secondary"}
          disabled={action.disabled}
          onClick={action.onClick}
        >{action.label}</OutlawButton>)}
      </footer>}
    </section>
  </div>;
}
