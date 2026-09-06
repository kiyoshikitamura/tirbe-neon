"use client";

import { useState } from "react";
import KpiDashboard from "./KpiDashboard";
import KpiDashboardV2 from "./KpiDashboardV2";

export default function KpiDashboardShell() {
  const [mode, setMode] = useState<"v2" | "legacy">("v2");
  return (
    <>
      <div className="kpi-mode-switch" role="navigation" aria-label="Dashboard version">
        <button type="button" className={mode === "v2" ? "is-active" : ""} onClick={() => setMode("v2")}>Validation V2</button>
        <button type="button" className={mode === "legacy" ? "is-active" : ""} onClick={() => setMode("legacy")}>Legacy Snapshot</button>
      </div>
      {mode === "v2" ? <KpiDashboardV2 /> : <KpiDashboard />}
    </>
  );
}
