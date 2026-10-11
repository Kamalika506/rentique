"use client";
import { BoutiqueSidebar } from "../dashboard/boutique-sidebar";
import { BoutiqueTopNavigation } from "../dashboard/top-navigation";
import { useBookingService } from "./provider";
import styles from "../dashboard/dashboard.module.css";
export function BookingWorkspace({ children, calendar = false }: { children: React.ReactNode; calendar?: boolean }) { const service = useBookingService(); const view = calendar ? "schedule" : "bookings"; return <div className={styles.shell}><a href="#booking-content" className={styles.skip}>Skip to content</a><BoutiqueSidebar activeView={view} /><div className={styles.workspace}><BoutiqueTopNavigation activeView={view} boutiqueName={service.boutique.name} /><main className={styles.main} id="booking-content" tabIndex={-1}>{service.mode === "demo" && <div className={styles.notice}><p><strong>Demo bookings.</strong> Fictional requests as of 11 October 2026. Decisions change only this browser session; refresh resets them. No actual availability, stock reservation, payment or customer notification is performed.</p></div>}{children}</main></div></div>; }
