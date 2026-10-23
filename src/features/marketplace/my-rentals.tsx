"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api, jsonRequest } from "@/lib/api-client";
import { ReviewForm } from "./review-form";
import { bookingDate, bookingMoney, bookingStatusLabels, type BoutiqueBooking } from "@/features/boutiques/booking-management/service";
type Rental = BoutiqueBooking & { boutique: { name: string; phone: string; address: string; city: string }; policySnapshot?: { policy?: string; items?: { productId: string; measurements: string; includedPieces: string[] }[] } | null };
export default function MyRentals() {
  const [rentals, setRentals] = useState<Rental[] | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const [asOf, setAsOf] = useState(0);
  const load = useCallback(() => api<Rental[]>("/api/bookings").then(data => { setAsOf(Date.now()); setRentals(data); setError(""); }).catch(error => setError(error.message)), []);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30000); window.addEventListener("focus", load); return () => { clearInterval(timer); window.removeEventListener("focus", load); }; }, [load]);
  async function cancel(booking: Rental) {
    const reason = window.prompt("Why are you cancelling this reservation?"); if (!reason) return;
    setBusy(booking.id); setError("");
    try { await api("/api/bookings", jsonRequest("PATCH", { id: booking.id, version: booking.version, reason })); await load(); }
    catch (error) { setError(error instanceof Error ? error.message : "Cancellation failed."); }
    finally { setBusy(""); }
  }
  return <div className="min-h-screen bg-[#f7f5f1]"><CustomerHeader /><main className="mx-auto max-w-6xl px-5 py-12">
    <h1 className="font-serif text-4xl text-[#4c2544]">My reservations</h1>
    <p className="mt-4 leading-7">Track shop confirmation, collection, returns, and inspection. Only the boutique can acknowledge physical receipt of returned items.</p>
    <div className="mt-4 flex flex-wrap gap-5 text-sm"><button onClick={() => void load()} className="underline">Refresh reservations</button><Link href="/notifications" className="underline">Notifications and reminders</Link><Link href="/basket" className="underline">View basket</Link></div>
    {error && <p role="alert" className="mt-6 text-red-700">{error}</p>}
    {!rentals && !error && <p role="status" className="mt-7">Loading reservations…</p>}
    {rentals?.length === 0 && <p className="mt-8">No reservations yet. <Link href="/marketplace" className="underline">Find an outfit</Link></p>}
    <div className="mt-8 space-y-6">{rentals?.map(booking => {
      const unreviewed = [...new Map(booking.products.filter(product => !booking.reviews?.some(review => review.productId === product.id)).map(product => [product.id, product])).values()];
      const canReview = booking.status === "COMPLETED" && booking.pickedUpAt && booking.completedAt && Date.parse(booking.completedAt) >= asOf - 30 * 86400000;
      return <article key={booking.id} id={booking.id} className="scroll-mt-24 rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap justify-between gap-4"><h2 className="font-serif text-2xl text-[#4c2544]">{booking.boutique.name}</h2><span className="rounded-full bg-[#f3efe9] px-4 py-2 text-sm">{booking.partiallyReturned ? "Partially returned" : bookingStatusLabels[booking.status]}</span></div>
        <p className="mt-3 break-all text-xs">Reservation {booking.id}</p>
        {booking.status === "PENDING" && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm">Awaiting boutique confirmation. Please wait for confirmation before travelling.{booking.requestExpiresAt && " Decision deadline: " + bookingDate(booking.requestExpiresAt, "Asia/Kolkata")}</p>}
        {(booking.status === "RETURNED" || booking.status === "COMPLETED" && !booking.stockReadyAt) && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm">The returned pieces are being inspected and cleaned. The boutique will mark them ready after this step.</p>}
        <ul className="mt-5 space-y-3">{booking.products.map(product => <li key={product.itemId ?? product.id}><Link href={"/marketplace/" + product.id} className="font-medium underline">{product.name}</Link> · {product.size} × {product.quantity}<p className="mt-1 text-sm">Returned to shop: {product.returnedQuantity ?? 0} of {product.quantity}</p></li>)}</ul>
        <p className="mt-5">Pickup: {bookingDate(booking.pickupAt, "Asia/Kolkata")}</p><p className="mt-2">Return: {bookingDate(booking.returnAt, "Asia/Kolkata")}</p>
        <p className="mt-3">Full-period rental estimate: {bookingMoney(booking.rentalMinor)}</p><p className="mt-1 text-xs">Informational price. Rentique does not collect payments.</p>
        <p className="mt-4 text-sm">{booking.boutique.address}, {booking.boutique.city} · {booking.boutique.phone}</p>
        {booking.status === "PICKED_UP" && Date.parse(booking.returnAt) < asOf && <p className="mt-4 text-sm text-red-700">One or more items are overdue. Contact the boutique to arrange return.</p>}
        {booking.rejectionReason && <p className="mt-3">Rejection reason: {booking.rejectionReason}</p>}
        {booking.cancellationReason && <p className="mt-3">Cancellation reason: {booking.cancellationReason}</p>}
        {booking.inspection && <p className="mt-3 text-sm">Shop inspection: {booking.inspection.condition.replaceAll("_", " ")} · {booking.inspection.notes}</p>}
        <div className="mt-5 flex flex-wrap gap-5 text-sm">
          {["PENDING", "CONFIRMED"].includes(booking.status) && <button disabled={Boolean(busy)} onClick={() => void cancel(booking)} className="underline">{busy === booking.id ? "Cancelling…" : "Cancel before collection"}</button>}
          <Link href={"/support?bookingId=" + encodeURIComponent(booking.id)} className="underline">Report a problem</Link>
        </div>
        {booking.policySnapshot?.policy && <details className="mt-5 text-sm"><summary>Agreed reservation terms</summary><p className="mt-3 whitespace-pre-line">{booking.policySnapshot.policy}</p>{booking.policySnapshot.items?.map((item, index) => <p className="mt-2" key={index}>Measurements: {item.measurements || "Not provided"} · Included pieces: {item.includedPieces.join(", ") || "Not provided"}</p>)}</details>}
        {!!booking.timeline?.length && <details className="mt-5 text-sm"><summary>Reservation timeline</summary><ol className="mt-3 space-y-2">{booking.timeline.map(event => <li key={event.id}>{event.action.replaceAll("_", " ")} · {bookingDate(event.createdAt, "Asia/Kolkata")}{event.toStatus && " · " + event.toStatus.replaceAll("_", " ")}</li>)}</ol></details>}
        {canReview && unreviewed.length > 0 && <ReviewForm key={unreviewed.map(item => item.id).join(":")} bookingId={booking.id} products={unreviewed} onSaved={() => void load()} />}
        {!!booking.reviews?.length && <p className="mt-5 text-sm">Reviewed {booking.reviews.length} product(s).{booking.reviews.some(review => review.isHidden) && " A review is hidden from public listings after moderation."}</p>}
      </article>;
    })}</div>
  </main><CustomerFooter /></div>;
}
