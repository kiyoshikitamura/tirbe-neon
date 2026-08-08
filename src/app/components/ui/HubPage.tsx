import React from "react";
import { ScreenReadinessStatus } from "../../hooks/useScreenReadiness";
import PageHeader from "./PageHeader";
import ScreenReadinessBoundary from "./ScreenReadinessBoundary";
import "./HubPage.css";

interface HubPageProps {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  headerAction?: React.ReactNode;
  status?: ScreenReadinessStatus;
  onRetry?: () => void;
  errorMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export default function HubPage({
  title,
  eyebrow,
  description,
  headerAction,
  status = "ready",
  onRetry,
  errorMessage,
  children,
  className = "",
}: HubPageProps) {
  return (
    <div className={`ui-hub-page ${className}`}>
      <PageHeader title={title} eyebrow={eyebrow} description={description} action={headerAction} />
      <div className="ui-hub-page-scroll custom-scrollbar">
        <ScreenReadinessBoundary status={status} onRetry={onRetry} errorMessage={errorMessage}>
          <div className="ui-hub-page-content">{children}</div>
        </ScreenReadinessBoundary>
      </div>
    </div>
  );
}
