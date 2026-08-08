import React from "react";
import "./ResourceDisplay.css";

interface ResourceDisplayProps {
  label?: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "cash" | "diamond" | "energy" | "gold";
  compact?: boolean;
}

export default function ResourceDisplay({ label, value, icon, tone = "default", compact = false }: ResourceDisplayProps) {
  return (
    <span className={`resource-display resource-display-${tone} ${compact ? "resource-display-compact" : ""}`}>
      {icon && <span className="resource-display-icon">{icon}</span>}
      <span className="resource-display-copy">
        {label && <span className="resource-display-label">{label}</span>}
        <span className="resource-display-value">{value}</span>
      </span>
    </span>
  );
}
