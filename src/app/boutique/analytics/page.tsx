import type { Metadata } from "next";
import { AnalyticsScreen } from "@/features/analytics/analytics-screen";

export const metadata: Metadata = { title: "Boutique analytics | Rentique" };
export default function Page() { return <AnalyticsScreen />; }
