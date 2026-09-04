import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KPI Password | TRIBE NEON",
  robots: { index: false, follow: false },
};

export default function KpiPasswordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
