"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingLifecycle } from "./booking-lifecycle";
import { useBookingService } from "./provider";
import { bookingDate, bookingMoney, bookingError, bookingStatusLabels, type BoutiqueBooking } from "./service";
import styles from "../dashboard/dashboard.module.css";
import form from "../inventory/inventory.module.css";

export function BookingDetails() { const { id } = useParams<{ id: string }>(); return <Details key={id} id={id} />; }
function Details({ id }: { id: string }) {
  const service = useBookingService(); const [booking, setBooking] = useState<BoutiqueBooking | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [request, setRequest] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; service.getBooking(id).then((result) => { if (result.boutiqueId !== service.boutique.id) throw new Error("Unavailable"); if (active) { setBooking(result); setLoading(false); } }).catch((cause) => { if (active) { setError(bookingError(cause)); setLoading(false); } }); return () => { active = false; }; }, [id, service, request]);
  function reload() { setLoading(true); setBooking(null); setError(""); setRequest((value) => value + 1); }
  return <><Link href="/boutique/bookings" className={styles.link}>← Back to bookings</Link><div className={`${styles.pageHeading} mt-5`}><h1 className={styles.heading}>Booking {id}</h1><Button variant="outline" onClick={reload} disabled={loading || saving}>Reload booking</Button></div>
    {error && <p role="alert" className={`${form.error} mb-5`}>{error} Reload the booking to try again.</p>}
    {loading ? <p role="status">Loading booking details…</p> : booking ? <>
      <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Customer & rental</h2><span className={styles.pill} data-status={booking.status}>{bookingStatusLabels[booking.status]}</span></div><dl className={`${form.details} p-6 !mt-0`}>{[["Customer", booking.customer.name], ["Email", booking.customer.email], ["Phone", booking.customer.phone], ["Pickup", bookingDate(booking.pickupAt, service.timezone)], ["Return", bookingDate(booking.returnAt, service.timezone)], ["Requested", bookingDate(booking.createdAt, service.timezone)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="break-words">{value}</dd></div>)}</dl></section>
      <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Products & charges</h2></div><div className={styles.tableWrap} role="region" aria-label="Booking product charges" tabIndex={0}><table className={styles.table}><thead><tr>{["Product", "Size", "Quantity", "Rental", "Deposit"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{booking.products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.size}</td><td>{product.quantity}</td><td>{bookingMoney(product.rentalMinor)}</td><td>{bookingMoney(product.depositMinor)}</td></tr>)}</tbody></table></div><div className="p-6 text-sm"><p>Rental charges: <strong>{bookingMoney(booking.rentalMinor)}</strong></p><p className="mt-2">Deposit: <strong>{bookingMoney(booking.depositMinor)}</strong></p><p className={`${styles.muted} mt-3`}>Amounts are supplied by the service. Deposit is separate from rental revenue; this screen does not collect or refund payments.</p></div></section>
      {booking.rejectionReason && <p className="mb-5 text-sm">Rejection feedback: {booking.rejectionReason}</p>}
      {booking.cancellationReason && <p className="mb-5 text-sm">Cancellation feedback: {booking.cancellationReason}</p>}
      <BookingLifecycle booking={booking} onUpdated={setBooking} onBusyChange={setSaving} />
      <Link href="/boutique/calendar" className={styles.link}>View rental calendar</Link>
    </> : !loading && <div className={styles.empty}><h2>Booking unavailable</h2><p>It may not exist or belong to this boutique. Return to the booking list.</p></div>}

  </>;
}
