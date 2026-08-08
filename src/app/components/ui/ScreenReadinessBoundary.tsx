import React from "react";
import { ScreenReadinessStatus } from "../../hooks/useScreenReadiness";
import ScreenState from "./ScreenState";

interface ScreenReadinessBoundaryProps {
  status: ScreenReadinessStatus;
  onRetry?: () => void;
  errorMessage?: string;
  children: React.ReactNode;
}

export default function ScreenReadinessBoundary({ status, onRetry, errorMessage, children }: ScreenReadinessBoundaryProps) {
  if (status === "loading") return <ScreenState kind="loading" />;
  if (status === "error") {
    return (
      <ScreenState
        kind="error"
        message={errorMessage || "通信状態を確認して、もう一度お試しください。"}
        actionLabel={onRetry ? "再試行" : undefined}
        onAction={onRetry}
      />
    );
  }
  return <>{children}</>;
}
