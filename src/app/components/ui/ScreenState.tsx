import React from "react";
import OutlawButton from "./OutlawButton";
import "./ScreenState.css";

export type ScreenStateKind =
  | "loading"
  | "empty"
  | "error"
  | "locked"
  | "forbidden"
  | "processing"
  | "success";

interface ScreenStateProps {
  kind: ScreenStateKind;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const DEFAULT_TITLES: Record<ScreenStateKind, string> = {
  loading: "読み込み中",
  empty: "表示できる情報がありません",
  error: "読み込みに失敗しました",
  locked: "未解放です",
  forbidden: "権限がありません",
  processing: "処理中",
  success: "完了しました",
};

export default function ScreenState({
  kind,
  title = DEFAULT_TITLES[kind],
  message,
  actionLabel,
  onAction,
  compact = false,
}: ScreenStateProps) {
  const showSpinner = kind === "loading" || kind === "processing";

  return (
    <section
      className={`screen-state screen-state-${kind} ${compact ? "screen-state-compact" : ""}`}
      role={kind === "error" || kind === "forbidden" ? "alert" : "status"}
      aria-live={kind === "processing" || kind === "error" ? "assertive" : "polite"}
      aria-busy={showSpinner}
    >
      {showSpinner ? <span className="spinner screen-state-spinner" aria-hidden="true" /> : <span className="screen-state-mark" aria-hidden="true" />}
      <h2 className="screen-state-title">{title}</h2>
      {message && <p className="screen-state-message">{message}</p>}
      {actionLabel && onAction && (
        <OutlawButton variant="secondary" onClick={onAction}>
          {actionLabel}
        </OutlawButton>
      )}
    </section>
  );
}
