import React from "react";
import "./PageShell.css";

interface PageShellProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  overlays?: React.ReactNode;
  className?: string;
}

export default function PageShell({
  header,
  footer,
  children,
  overlays,
  className = "",
}: PageShellProps) {
  return (
    <div className={`page-shell ${className}`}>
      <div className="page-shell-safe-frame">
        <div className="page-shell-header">{header}</div>
        <main className="page-shell-content main-content">{children}</main>
        <div className="page-shell-footer">{footer}</div>
        {overlays}
      </div>
    </div>
  );
}
