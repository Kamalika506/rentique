"use client";

import { useState } from "react";
import { Menu, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoutiqueNavigation, dashboardNavigation } from "./boutique-sidebar";
import type { BoutiqueNavigationView } from "./boutique-sidebar";
import styles from "./dashboard.module.css";

export function BoutiqueTopNavigation({ activeView, boutiqueName, refreshing = false, onRefresh, asOf }: { activeView: BoutiqueNavigationView; boutiqueName: string; refreshing?: boolean; onRefresh?: () => void; asOf?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <header className={styles.topbar}>
      <div className="flex items-center gap-3">
        <Button className={styles.mobileButton} variant="outline" size="icon" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="boutique-mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
        <div><p className={styles.topTitle}>{boutiqueName}</p><p className={styles.muted}>{dashboardNavigation.find((item) => item.view === activeView)?.label} / Boutique workspace</p></div>
      </div>
      <div className={styles.topActions}>
        {asOf && <p className={`${styles.muted} ${styles.topDate}`}>Snapshot · {new Date(asOf).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</p>}
        {onRefresh && <Button variant="outline" disabled={refreshing} onClick={onRefresh}><RefreshCw className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing…" : "Refresh"}</Button>}
      </div>
    </header>
    {open && <div className={styles.mobileNav} id="boutique-mobile-navigation" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); (document.querySelector('[aria-controls="boutique-mobile-navigation"]') as HTMLButtonElement | null)?.focus(); } }}><BoutiqueNavigation activeView={activeView} label="Mobile boutique management" onNavigate={() => setOpen(false)} /></div>}
  </>;
}
