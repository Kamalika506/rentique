"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBookingService } from "../booking-management/provider";
import { bookingError, bookingStatusLabels, type RentalCalendarEvent } from "../booking-management/service";
import { calendarDays, shiftMonth } from "./dates";
import styles from "./calendar.module.css";
import workspace from "../dashboard/dashboard.module.css";
import { AvailabilityChecker } from "./availability-checker";

export function RentalCalendar() {
  const service = useBookingService(); const [month, setMonth] = useState(service.referenceDate.slice(0, 7)); const [events, setEvents] = useState<RentalCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [request, setRequest] = useState(0);
  useEffect(() => { let active = true; service.getCalendar(month).then((result) => { if (active) { setEvents(result); setLoading(false); } }).catch((cause) => { if (active) { setError(bookingError(cause)); setLoading(false); } }); return () => { active = false; }; }, [service, month, request]);
  function navigate(value: string) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value < "2000-01" || value > "2100-12") return; setEvents([]); setLoading(true); setError(""); if (value === month) setRequest((current) => current + 1); else setMonth(value); }
  const days = calendarDays(month);
  const title = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  return <><div className={workspace.pageHeading}><div><h1 className={workspace.heading}>Rental calendar</h1><p className={workspace.muted}>Rental ranges and handovers · {service.timezone}</p></div><Link href="/boutique/bookings" className={workspace.link}>View booking requests</Link></div>
    {service.mode === "live" && <AvailabilityChecker boutiqueTimezone={service.timezone} />}
    <p className={`${workspace.notice} !mb-5`}>The calendar shows booked rental ranges and pickup or return handovers. Pending requests are tentative.</p>
    <div className={workspace.filters}><Button variant="outline" onClick={() => navigate(shiftMonth(month, -1))} disabled={month === "2000-01"} aria-label="Previous month">← Previous</Button><h2 className={workspace.panelTitle} aria-live="polite">{title}</h2><Button variant="outline" onClick={() => navigate(shiftMonth(month, 1))} disabled={month === "2100-12"} aria-label="Next month">Next →</Button><label className={workspace.field}>Go to month<input type="month" min="2000-01" max="2100-12" className={workspace.input} value={month} onChange={(event) => navigate(event.target.value)} /></label><Button variant="ghost" onClick={() => navigate(service.referenceDate.slice(0, 7))}>{service.mode === "demo" ? "Sample month" : "Current month"}</Button><Button variant="outline" onClick={() => navigate(month)} disabled={loading}>Refresh calendar</Button></div>
    <p className={`${workspace.muted} mb-4`}>Solid: scheduled or completed rental · Dashed: pending request · ↑ Pickup · ↓ Return. Range end is shown for handover context, not inventory availability.</p>
    {loading ? <p role="status">Loading calendar…</p> : error ? <div role="alert" className={workspace.empty}><p>{error}</p><Button className="mt-4" onClick={() => navigate(month)}>Try again</Button></div> : <>{!events.some((event) => event.startDate <= `${month}-31` && event.endDate >= `${month}-01`) && <div className={workspace.empty}><h3>No rental events this month</h3><p>Choose another month or return to booking requests.</p></div>}<div className={styles.scroll} tabIndex={0} role="region" aria-label={`${title} rental calendar`}><div className={styles.grid}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => <div className={styles.weekday} key={day}>{day}</div>)}{days.map((day) => <section className={styles.day} key={day} aria-label={day} data-outside={!day.startsWith(month)}><time dateTime={day} className={styles.number} data-reference={day === service.referenceDate}>{Number(day.slice(-2))}</time>{events.filter((event) => event.startDate <= day && event.endDate >= day).map((event) => <Link key={event.bookingId} className={styles.event} data-pending={event.status === "PENDING"} href={`/boutique/bookings/${encodeURIComponent(event.bookingId)}`} aria-label={`${event.bookingId}, ${event.customer}, ${bookingStatusLabels[event.status]}, ${day}`}><span className={styles.marker}>{day === event.pickupDate ? "↑ Pickup " : ""}{day === event.returnDate ? "↓ Return" : ""}</span>{event.customer}<br />{event.productLabel}<br /><span>{event.bookingId} · {bookingStatusLabels[event.status]}</span></Link>)}</section>)}</div></div></>}
  </>;
}
