import React from "react";
import "./PeriodStatus.css";

type PeriodStatusProps = {
  label: string;
  range?: string;
  remaining: string;
  cadence?: string;
  updatedAt?: string;
  tone?: "cyan" | "magenta" | "danger";
};

export default function PeriodStatus({
  label,
  range,
  remaining,
  cadence,
  updatedAt,
  tone = "cyan",
}: PeriodStatusProps) {
  return (
    <section className={`period-status period-status--${tone}`} aria-live="polite">
      <div className="period-status-heading">
        <span>{label}</span>
        {range && <strong>{range}</strong>}
      </div>
      <div className="period-status-meta">
        <span className="period-status-remaining">残り {remaining}</span>
        {cadence && <span>{cadence}</span>}
        {updatedAt && <span>最終更新 {updatedAt}</span>}
      </div>
    </section>
  );
}
