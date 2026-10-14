import type { Metadata } from "next";
import { Suspense } from "react";
import { BoutiqueDashboard } from "@/features/boutiques/dashboard/boutique-dashboard";

export const metadata: Metadata = { title: "Boutique dashboard | Rentique", description: "Boutique inventory, bookings and rental activity at a glance." };
export default function DashboardPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f5f1] p-8 text-[#4c2544]" role="status">Loading boutique workspace…</main>}><BoutiqueDashboard /></Suspense>;
}
