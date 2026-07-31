import React from "react";
import "./OutlawCard.css";

interface OutlawCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowLine?: "none" | "left" | "top" | "bottom" | "right";
  isInteractive?: boolean;
}

export default function OutlawCard({
  children,
  className = "",
  glowLine = "none",
  isInteractive = false,
  ...props
}: OutlawCardProps) {
  const interactiveClass = isInteractive ? "outlaw-card-interactive active-scale-effect" : "";
  const glowClass = glowLine !== "none" ? `glow-line-${glowLine}` : "";

  return (
    <div className={`outlaw-card ${interactiveClass} ${glowClass} ${className}`} {...props}>
      <div className="outlaw-card-inner">
        {children}
      </div>
    </div>
  );
}
