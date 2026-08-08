import React from "react";
import "./Badge.css";

type BadgeTone = "neutral" | "cyan" | "magenta" | "gold" | "success" | "warning" | "danger";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export default function Badge({ tone = "neutral", className = "", children, ...props }: BadgeProps) {
  return <span className={`ui-badge ui-badge-${tone} ${className}`} {...props}>{children}</span>;
}
