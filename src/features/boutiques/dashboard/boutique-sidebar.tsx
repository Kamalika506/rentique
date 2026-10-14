"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList, LayoutDashboard, Package, ShieldCheck } from "lucide-react";
import type { DashboardView } from "./service";
import styles from "./dashboard.module.css";
export type BoutiqueNavigationView = DashboardView | "analytics";

export const dashboardNavigation = [
  { view: "overview", label: "Overview", Icon: LayoutDashboard },
  { view: "inventory", label: "Inventory", Icon: Package },
  { view: "bookings", label: "Bookings", Icon: ClipboardList },
  { view: "schedule", label: "Rental schedule", Icon: CalendarDays },
  { view: "analytics", label: "Analytics", Icon: BarChart3 },
] as const;

export function BoutiqueNavigation({ activeView, onNavigate, label = "Boutique management" }: { activeView: BoutiqueNavigationView; onNavigate?: () => void; label?: string }) {
  return <nav aria-label={label} className={styles.nav}>
    {dashboardNavigation.map(({ view, label: name, Icon }) => <Link key={view} href={view === "analytics" ? "/boutique/analytics" : view === "inventory" ? "/boutique/products" : view === "bookings" ? "/boutique/bookings" : view === "schedule" ? "/boutique/calendar" : "/boutique/dashboard"} onClick={onNavigate} className={styles.navLink} aria-current={activeView === view ? "page" : undefined}><Icon size={18} strokeWidth={1.6} />{name}</Link>)}
    <Link href="/boutique/pending" className={styles.navLink} onClick={onNavigate}><ShieldCheck size={18} strokeWidth={1.6} />Application status</Link>
  </nav>;
}

export function BoutiqueSidebar({ activeView }: { activeView: BoutiqueNavigationView }) {
  return <aside className={styles.sidebar} aria-label="Boutique sidebar">
    <Link href="/boutique/dashboard" className={styles.brand}>rentique.</Link><p className={styles.sidebarLabel}>Boutique workspace</p>
    <BoutiqueNavigation activeView={activeView} />
    <div className={styles.sidebarFoot}><p className={`${styles.muted} px-3`}>Management requires an approved boutique and backend authorization.</p></div>
  </aside>;
}
