import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { validateProductionKpiRuntime } from "@/utils/kpiRuntime";
import KpiDashboard from "./KpiDashboard";
import "./kpi-dashboard.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "内部KPI | TRIBE NEON",
  robots: { index: false, follow: false },
};

export default function KpiDashboardPage() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "preview") notFound();
  const runtime = validateProductionKpiRuntime({
    appEnvironment: process.env.NEXT_PUBLIC_APP_ENV,
    dataEnvironment: process.env.NEXT_PUBLIC_KPI_DATA_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  if (!runtime.enabled) {
    throw new Error(`KPI runtime configuration rejected: ${runtime.reason}`);
  }
  return <KpiDashboard />;
}
