import React from "react";

export function formatRankPosition(rank: unknown): string {
  const value = Number(rank);
  return Number.isInteger(value) && value > 0 ? `${value}位` : "圏外";
}

export default function RankPresentation({ rank, label, className = "" }: { rank: unknown; label?: string; className?: string }) {
  return <span className={`rank-presentation ${className}`.trim()}>{label ? `${label} ` : ""}{formatRankPosition(rank)}</span>;
}
