import React from "react";
import "./StatusMetric.css";

export default function StatusMetric({ label, value, suffix, className = "" }: { label: string; value: React.ReactNode; suffix?: React.ReactNode; className?: string }) {
  return <div className={`status-metric ${className}`.trim()}><small>{label}</small><strong>{value}{suffix}</strong></div>;
}
