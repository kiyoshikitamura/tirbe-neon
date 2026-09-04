import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KpiDashboard from "./KpiDashboard";
import "./kpi-dashboard.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "内部KPI | TRIBE NEON",
  robots: { index: false, follow: false },
};

export default function KpiDashboardPage() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "preview") notFound();
  return <KpiDashboard />;
}
