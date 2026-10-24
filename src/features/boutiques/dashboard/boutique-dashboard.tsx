"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@base-ui/react/input";
import { ArrowDownToLine, ArrowUpRight, CalendarDays, ClipboardList, Info, LoaderCircle, Package, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLiveDashboardService } from "@/features/boutiques/adapters/live";
import { BoutiqueSidebar } from "./boutique-sidebar";
import { BoutiqueTopNavigation } from "./top-navigation";
import { DashboardServiceError, dashboardSummaryCsv, formatDashboardMoney, parseDashboardView, type BoutiqueDashboardService, type DashboardBooking, type DashboardSnapshot } from "./service";
import styles from "./dashboard.module.css";
import { bookingStatusLabels } from "../booking-management/service";

const statusLabels = bookingStatusLabels;
const money = (minor: number, data: DashboardSnapshot) => formatDashboardMoney(minor, data.currency);
const date = (value: string, data: DashboardSnapshot, withTime = false) => new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", ...(withTime ? { hour: "numeric" as const, minute: "2-digit" as const } : {}), timeZone: data.timezone });

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className={styles.empty}><h3>{title}</h3><p>{description}</p></div>;
}

function BookingTable({ bookings, data, caption }: { bookings: DashboardBooking[]; data: DashboardSnapshot; caption: string }) {
  if (!bookings.length) return <EmptyState title="No bookings to show" description="No bookings match this view. Try another filter or check back when bookings arrive." />;
  return <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={caption}><table className={styles.table}>
    <caption className="sr-only">{caption}</caption>
    <thead><tr>{["Booking", "Customer / product", "Rental dates", "Status", "Rental amount"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
    <tbody>{bookings.map((booking) => <tr key={booking.id}>
      <td><Link href={`/boutique/dashboard?view=bookings&booking=${encodeURIComponent(booking.id)}#booking-detail`} className={styles.link} aria-label={`View booking ${booking.id}`}>{booking.id}</Link></td>
      <td><p>{booking.customer}</p><p className={styles.muted}>{booking.product}</p></td>
      <td>{date(booking.pickupAt, data)} – {date(booking.returnAt, data)}</td>
      <td><span className={styles.pill} data-status={booking.status}>{statusLabels[booking.status]}</span></td>
      <td>{money(booking.rentalAmountMinor, data)}</td>
    </tr>)}</tbody>
  </table></div>;
}

function RentalEvents({ data, kind }: { data: DashboardSnapshot; kind: "pickups" | "returns" }) {
  const events = kind === "pickups" ? data.upcomingPickups : data.upcomingReturns;
  return <section className={styles.panel}>
    <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Upcoming {kind}</h2><p className={styles.muted}>Next 7 days · showing {events.length} of {kind === "pickups" ? data.summary.upcomingPickups : data.summary.upcomingReturns} scheduled</p></div><Link href={`/boutique/dashboard?view=schedule#${kind}`} className={styles.link}>View schedule</Link></div>
    {!events.length ? <EmptyState title={`No upcoming ${kind}`} description={`There are no scheduled ${kind} in this reporting window.`} /> : events.map((booking) => {
      const when = kind === "pickups" ? booking.pickupAt : booking.returnAt;
      return <div className={styles.event} key={booking.id}>
        <div className={styles.dateBox}>{date(when, data)}</div>
        <div className={styles.eventBody}><p className={styles.eventName}>{booking.customer}</p><p className={styles.muted}>{booking.product}</p><p className={styles.muted}>{date(when, data, true)}</p></div>
        <Link className={styles.link} href={`/boutique/dashboard?view=bookings&booking=${encodeURIComponent(booking.id)}#booking-detail`} aria-label={`View ${kind === "pickups" ? "pickup" : "return"} booking ${booking.id}`}><ArrowUpRight size={16} /></Link>
      </div>;
    })}
  </section>;
}

function Overview({ data, onExport }: { data: DashboardSnapshot; onExport: () => void }) {
  const summary = data.summary;
  const metrics = [
    { label: "Active products", value: summary.activeProducts, hint: "Published catalog items", href: "/boutique/products" },
    { label: "Total bookings", value: summary.totalBookings, hint: "All statuses · all time", href: "?view=bookings" },
    { label: "Pending requests", value: summary.pendingRequests, hint: "Awaiting a booking decision", href: "?view=bookings&filter=PENDING" },
    { label: "Upcoming pickups", value: summary.upcomingPickups, hint: "Confirmed · next 7 days", href: "?view=schedule#pickups" },
    { label: "Upcoming returns", value: summary.upcomingReturns, hint: "Scheduled · next 7 days", href: "?view=schedule#returns" },
    { label: "Completed rentals", value: summary.completedRentals, hint: "Completed bookings · all time", href: "?view=bookings&filter=COMPLETED" },
    { label: "Estimated listed rental value", value: money(summary.completedRentalRevenueMinor, data), hint: "Informational estimates on completed rentals", href: "?view=bookings&filter=COMPLETED" },
  ];
  return <>
    <div className={styles.metrics}>{metrics.map((metric) => <Link key={metric.label} href={metric.href.startsWith("/") ? metric.href : `/boutique/dashboard${metric.href}`} className={styles.metric}><h2 className={styles.metricLabel}>{metric.label}<ArrowUpRight size={14} /></h2><p className={styles.metricValue}>{metric.value}</p><p className={styles.metricHint}>{metric.hint}</p></Link>)}</div>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Recent bookings</h2><p className={styles.muted}>Latest booking activity</p></div><Link href="/boutique/dashboard?view=bookings" className={styles.link}>View all bookings</Link></div><BookingTable bookings={data.recentBookings.slice(0, 5)} data={data} caption="Five most recent boutique bookings" /></section>
    <div className={styles.split}><RentalEvents data={data} kind="pickups" /><RentalEvents data={data} kind="returns" /></div>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Quick actions</h2></div><div className={styles.quickActions}>
      <Link className={styles.action} href="/boutique/products"><Package size={17} />Browse inventory</Link>
      <Link className={styles.action} href="/boutique/dashboard?view=bookings&filter=PENDING"><ClipboardList size={17} />View pending requests</Link>
      <Link className={styles.action} href="/boutique/dashboard?view=schedule"><CalendarDays size={17} />Open rental schedule</Link>
      <Button variant="outline" className="h-auto px-4 py-3 text-xs" onClick={onExport}><ArrowDownToLine />Download summary</Button>
    </div></section>
  </>;
}

function InventoryView({ data, filter }: { data: DashboardSnapshot; filter: string | null }) {
  const [search, setSearch] = useState("");
  const activeOnly = filter === "active";
  const items = data.products.filter((item) => (!activeOnly || item.active) && `${item.name} ${item.id} ${item.category}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className={styles.filters}><label className={styles.field}>Search loaded products<Input className={styles.input} value={search} onValueChange={setSearch} placeholder="Product, category or ID" type="search" /></label><Link className={styles.link} href={`/boutique/dashboard?view=inventory${activeOnly ? "" : "&filter=active"}`}>{activeOnly ? "Show all products" : "Show active products"}</Link></div>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>{activeOnly ? "Active inventory" : "Inventory preview"}</h2><span className={styles.muted}>{items.length} loaded products</span></div>
      {!items.length ? <EmptyState title="No matching products" description="Try a different search or include inactive products. Inventory editing awaits backend integration." /> : <div className={styles.tableWrap} role="region" aria-label="Inventory preview" tabIndex={0}><table className={styles.table}><caption className="sr-only">Loaded boutique inventory</caption><thead><tr>{["Product", "Category", "Stock quantity", "Rental price", "Listing"].map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.name}<p className={styles.muted}>{item.id}</p></td><td>{item.category}</td><td>{item.stock}</td><td>{money(item.rentalPriceMinor, data)}</td><td><span className={styles.pill}>{item.active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div>}
    </section><p className={styles.muted}>Catalog preview only. Stock is not an availability guarantee; editing and uploads require the inventory backend.</p>
  </>;
}

function BookingsView({ data, filter, selectedId }: { data: DashboardSnapshot; filter: string | null; selectedId: string | null }) {
  const [search, setSearch] = useState("");
  const selected = data.recentBookings.find((booking) => booking.id === selectedId);
  const bookings = data.recentBookings.filter((booking) => (!filter || booking.status === filter) && `${booking.id} ${booking.customer} ${booking.product}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    {selectedId && <section className={styles.panel} id="booking-detail"><div className={styles.panelHead}><h2 className={styles.panelTitle}>Booking {selectedId}</h2><Link className={styles.link} href="/boutique/dashboard?view=bookings">Close details</Link></div>{selected ? <div className="p-6"><p className="mb-2 text-sm font-medium">{selected.customer} · {selected.product}</p><p className={styles.muted}>Pickup: {date(selected.pickupAt, data, true)}</p><p className={styles.muted}>Return: {date(selected.returnAt, data, true)}</p><p className={styles.muted}>Rental amount: {money(selected.rentalAmountMinor, data)}</p><span className={`${styles.pill} mt-3`} data-status={selected.status}>{statusLabels[selected.status]}</span><p className={`${styles.muted} mt-4`}>Read-only booking preview. Accept, reject, cancellation and payment actions require Member 2’s booking APIs.</p></div> : <EmptyState title="Booking not in this snapshot" description="This reference is not among the loaded bookings. Close details to return to the booking list." />}</section>}
    <div className={styles.filters}><label className={styles.field}>Search loaded bookings<Input className={styles.input} value={search} onValueChange={setSearch} type="search" placeholder="Reference, customer or product" /></label></div>
    <nav aria-label="Booking status filters" className="mb-5 flex flex-wrap gap-3">{[null, ...Object.keys(statusLabels)].map((status) => <Link key={status ?? "all"} className={styles.link} aria-current={filter === status ? "page" : undefined} href={`/boutique/dashboard?view=bookings${status ? `&filter=${status}` : ""}`}>{status ? statusLabels[status as keyof typeof statusLabels] : "All"}{filter === status ? " ✓" : ""}</Link>)}</nav>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Bookings</h2><span className={styles.muted}>{bookings.length} loaded records</span></div><BookingTable bookings={bookings} data={data} caption="Filtered boutique booking preview" /></section>
    <p className={styles.muted}>This view contains snapshot records, not a complete booking-management system. Summary totals may exceed loaded rows when connected to a backend.</p>
  </>;
}

export function BoutiqueDashboard({ service: providedService }: { service?: BoutiqueDashboardService }) {
  const params = useSearchParams();
  const router = useRouter();
  const queryString = params.toString();
  const view = parseDashboardView(params.get("view"));
  const [emptyDemo, setEmptyDemo] = useState(false);
  const live = useMemo(() => createLiveDashboardService(), []);
  const service = providedService ?? live;
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardServiceError | null>(null);
  const [request, setRequest] = useState(0);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    if (service.mode === "live" && view !== "overview") {
      const query = new URLSearchParams(queryString);
      const booking = query.get("booking"), filter = query.get("filter");
      router.replace(view === "inventory" ? "/boutique/products" : view === "schedule" ? "/boutique/calendar" : booking ? `/boutique/bookings/${encodeURIComponent(booking)}` : `/boutique/bookings${filter ? `?status=${encodeURIComponent(filter)}` : ""}`);
      return;
    }
    let active = true;
    service.getSnapshot().then((snapshot) => { if (active) { setData(snapshot); setLoading(false); } }).catch((cause: unknown) => { if (active) { setError(cause instanceof DashboardServiceError ? cause : new DashboardServiceError("UNAVAILABLE", "The dashboard couldn't be loaded. Please try again.")); setLoading(false); } });
    return () => { active = false; };
  }, [service, request, view, queryString, router]);

  function refresh() { setData(null); setError(null); setLoading(true); setFeedback(""); setRequest((value) => value + 1); }
  function exportSummary() {
    if (!data) return;
    try {
      const url = URL.createObjectURL(new Blob([dashboardSummaryCsv(data, service.mode)], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `rentique-${service.mode}-summary.csv`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(`${service.mode === "demo" ? "Demo " : ""}summary downloaded as CSV.`);
    } catch { setFeedback("The summary could not be downloaded. Please try again."); }
  }
  const title = { overview: "Boutique overview", inventory: "Your inventory", bookings: "Booking activity", schedule: "Rental schedule" }[view];
  const statusFilter = params.get("filter");
  const bookingFilter = statusFilter && Object.hasOwn(statusLabels, statusFilter) ? statusFilter : null;
  return <div className={styles.shell}>
    <a className={styles.skip} href="#dashboard-content">Skip to content</a><BoutiqueSidebar activeView={view} />
    <div className={styles.workspace}><BoutiqueTopNavigation activeView={view} boutiqueName={data?.boutiqueName ?? "Boutique workspace"} asOf={data?.asOf} refreshing={loading} onRefresh={refresh} />
      <main id="dashboard-content" className={styles.main} tabIndex={-1}>
        {service.mode === "demo" && <div className={styles.notice}><Info size={17} className="mt-0.5 shrink-0" /><p><strong>Demo workspace.</strong> Frozen sample snapshot as of 11 October 2026, independent of demo product and booking edits. This is separate from your application and does not grant management access. Nothing here changes real products or bookings.</p></div>}
        <div className={styles.pageHeading}><div><h1 className={styles.heading}>{title}</h1><p className={styles.muted}>{view === "overview" ? "A clear view of your collection, bookings and upcoming rentals." : "Read-only snapshot · explore the records behind your dashboard."}</p></div>{data && <Button variant="outline" onClick={exportSummary}><ArrowDownToLine />Export summary</Button>}</div>
        <p role="status" className="mb-3 text-xs text-[#4c2544]">{feedback}</p>
        {loading ? <div className={styles.panel}><div className="flex items-center gap-3 p-8" role="status"><LoaderCircle className="animate-spin" size={18} />Loading boutique data…</div></div>
          : error ? <section className={styles.panel}><div className={styles.empty}><ShieldCheck className="mx-auto mb-4 text-[#4c2544]" /><h2 className={styles.panelTitle}>{error.code === "FORBIDDEN" ? "Boutique access unavailable" : "We couldn't load your dashboard"}</h2><p className={`${styles.muted} my-4`} role="alert">{error.message}</p>{error.code === "FORBIDDEN" ? <Link href="/boutique/pending" className={styles.link}>Check application status</Link> : <Button onClick={refresh}>Try again</Button>}</div></section>
          : data && <>{view === "overview" && <Overview data={data} onExport={exportSummary} />}{view === "inventory" && <InventoryView data={data} filter={statusFilter} />}{view === "bookings" && <BookingsView data={data} filter={bookingFilter} selectedId={params.get("booking")} />}{view === "schedule" && <><p className={`${styles.muted} mb-5`}>Reporting window: {date(data.asOf, data)} – {date(data.scheduleUntil, data)} (end exclusive) · {data.timezone}. Pending requests are not scheduled rentals.</p><div id="pickups"><RentalEvents data={data} kind="pickups" /></div><div id="returns"><RentalEvents data={data} kind="returns" /></div></>}</>}
        <footer className={styles.footer}><span>{data ? `Snapshot as of ${date(data.asOf, data, true)} · ${data.timezone}` : "Boutique management preview"}</span>{service.mode === "demo" && <label className={styles.demoControl}><input type="checkbox" checked={emptyDemo} disabled={loading} onChange={(event) => { setData(null); setError(null); setLoading(true); setFeedback(""); setEmptyDemo(event.target.checked); }} />Preview empty boutique</label>}</footer>
      </main>
    </div>
  </div>;
}
