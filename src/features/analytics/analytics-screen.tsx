"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BoutiqueSidebar } from "../boutiques/dashboard/boutique-sidebar";
import { BoutiqueTopNavigation } from "../boutiques/dashboard/top-navigation";
import { bookingMoney } from "../boutiques/booking-management/service";
import { calculateAnalytics } from "./calculations";
import { createDemoAnalyticsService } from "./adapters/mock/analytics";
import type { AnalyticsDataset, BoutiqueAnalyticsService } from "./service";
import styles from "../boutiques/dashboard/dashboard.module.css";
import charts from "./analytics.module.css";

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function AnalyticsScreen({ service: suppliedService }: { service?: BoutiqueAnalyticsService }) {
  const [demoService] = useState(createDemoAnalyticsService);
  const service = suppliedService ?? demoService;
  const [result, setResult] = useState<{ data: AnalyticsDataset; metrics: ReturnType<typeof calculateAnalytics> } | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [request, setRequest] = useState(0);
  useEffect(() => {
    let active = true;
    service.getDataset().then((data) => {
      const metrics = calculateAnalytics(data);
      if (active) { setResult({ data, metrics }); setLoading(false); }
    }).catch(() => {
      if (active) { setError("Analytics could not be loaded or the reporting data is incomplete. Please retry or contact the service owner."); setLoading(false); }
    });
    return () => { active = false; };
  }, [service, request]);
  function refresh() { setResult(null); setError(""); setLoading(true); setRequest((value) => value + 1); }
  const data = result?.data, metrics = result?.metrics;
  return <div className={styles.shell}>
    <a className={styles.skip} href="#analytics-content">Skip to analytics</a>
    <BoutiqueSidebar activeView="analytics" />
    <div className={styles.workspace}>
      <BoutiqueTopNavigation activeView="analytics" boutiqueName={data?.boutique.name ?? "Boutique workspace"} onRefresh={refresh} refreshing={loading} asOf={data?.asOf} />
      <main id="analytics-content" tabIndex={-1} className={styles.main} aria-busy={loading}>
        {service.mode === "demo" && <div className={styles.notice}><p><strong>Demo analytics.</strong> Fictional reporting snapshot, independent of demo inventory and booking edits. No PostgreSQL connection or persistent business data. Refresh reloads the same fixture.</p></div>}
        <div className={styles.pageHeading}><div><h1 className={styles.heading}>Boutique analytics</h1><p className={styles.muted}>Booking activity and completed rental charges.</p></div></div>
        {loading ? <p role="status">Loading analytics…</p> : error ? <div className={styles.empty} role="alert"><p>{error}</p><Button className="mt-4" onClick={refresh}>Try again</Button></div> : data && metrics && <>
          <p className={`${styles.muted} ${charts.period}`}>Bookings created {monthLabel(data.startMonth)} – {monthLabel(data.endMonth)} · {data.timezone} · through {new Date(data.asOf).toLocaleString("en-IN", { timeZone: data.timezone })}. All metrics use this creation cohort and snapshot statuses.</p>
          <section className={styles.metrics} aria-label="Rental metrics">
            {[
              ["Total bookings", metrics.totalBookings.toLocaleString("en-IN"), "Includes all request statuses"],
              ["Completed rentals", metrics.completedRentals.toLocaleString("en-IN"), "COMPLETED bookings only"],
              ["Completed rental revenue", bookingMoney(metrics.completedRevenueMinor), "Rental charges; excludes deposits and cancellations"],
              ["Pending bookings", metrics.pendingBookings.toLocaleString("en-IN"), "Awaiting a booking decision"],
              ["Cancelled bookings", metrics.cancelledBookings.toLocaleString("en-IN"), "CANCELLED status only"],
              ["Inventory utilization", metrics.utilizationPercent === null ? "Unavailable" : `${metrics.utilizationPercent.toFixed(1)}%`, metrics.utilizationPercent === null ? "Complete historical capacity and occupied unit-days required" : "Occupied / available unit-days for this period"],
            ].map(([label, value, hint]) => <div key={label} className={styles.metric}><h2 className={styles.metricLabel}>{label}</h2><p className={`${styles.metricValue} ${charts.value}`}>{value}</p><p className={styles.metricHint}>{hint}</p></div>)}
          </section>
          {metrics.totalBookings === 0 && <div className={styles.empty}><h2>No bookings in this reporting period</h2><p>Analytics will appear when the service supplies booking records.</p></div>}
          <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Monthly booking trend</h2><p className={styles.muted}>All statuses, grouped by creation month. The current month is partial.</p></div></div>
            <div className={charts.trend} aria-hidden="true">{metrics.months.map((item) => <div className={charts.column} key={item.month}><span>{item.bookings}</span><div className={charts.track}><div className={charts.verticalBar} style={{ height: `${item.bookings / Math.max(1, ...metrics.months.map((entry) => entry.bookings)) * 100}%` }} /></div><span>{monthLabel(item.month)}</span></div>)}</div>
            <details className={charts.details}><summary>View monthly booking data</summary><div className={styles.tableWrap}><table className={styles.table}><caption className="sr-only">Monthly booking trend data</caption><thead><tr><th scope="col">Month</th><th scope="col">Bookings</th></tr></thead><tbody>{metrics.months.map((item) => <tr key={item.month}><th scope="row">{monthLabel(item.month)}</th><td>{item.bookings}</td></tr>)}</tbody></table></div></details>
          </section>
          <div className={styles.split}>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Popular products</h2><p className={styles.muted}>Ranked by unique bookings; excludes cancelled and rejected requests.</p></div></div>{!metrics.popularProducts.length ? <div className={styles.empty}><p>No eligible product bookings.</p></div> : <div className={styles.tableWrap} role="region" aria-label="Popular products" tabIndex={0}><table className={styles.table}><caption className="sr-only">Product booking counts</caption><thead><tr><th scope="col">Product</th><th scope="col">Bookings</th><th scope="col">Units requested</th></tr></thead><tbody>{metrics.popularProducts.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.bookings}</td><td>{product.units}</td></tr>)}</tbody></table></div>}</section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Category-wise bookings</h2><p className={styles.muted}>One count per category per booking, excluding cancelled and rejected. A booking may span categories.</p></div></div>{!metrics.categories.length ? <div className={styles.empty}><p>No eligible category bookings.</p></div> : <div className={charts.categories}>{metrics.categories.map((category) => <div key={category.name}><div className={charts.categoryLabel}><span>{category.name}</span><span>{category.bookings} bookings</span></div><div className={charts.horizontalTrack} aria-hidden="true"><div className={charts.horizontalBar} style={{ width: `${category.bookings / Math.max(...metrics.categories.map((item) => item.bookings)) * 100}%` }} /></div></div>)}</div>}</section>
          </div>
          <p className={styles.muted}>Completed revenue reports rental charges on completed bookings in this creation cohort. It is not a payment settlement or refund report. No availability decisions are made here.</p>
        </>}
      </main>
    </div>
  </div>;
}
