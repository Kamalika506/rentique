"use client";
import { BoutiqueSidebar } from "../dashboard/boutique-sidebar";
import { BoutiqueTopNavigation } from "../dashboard/top-navigation";
import { useProductService } from "./provider";
import styles from "../dashboard/dashboard.module.css";
export function InventoryWorkspace({ children }: { children: React.ReactNode }) {
  const service = useProductService();
  return <div className={styles.shell}><a href="#inventory-content" className={styles.skip}>Skip to inventory</a><BoutiqueSidebar activeView="inventory" /><div className={styles.workspace}><BoutiqueTopNavigation activeView="inventory" boutiqueName={service.boutique.name} /><main className={styles.main} id="inventory-content" tabIndex={-1}>{service.mode === "demo" && <div className={styles.notice}><p><strong>Demo inventory.</strong> Changes and images are kept in browser memory during this boutique session and reset on refresh. No real products are changed. This example boutique is separate from your application and provides no live management access.</p></div>}{children}</main></div></div>;
}
