"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api, jsonRequest } from "@/lib/api-client";
import { ReviewForm } from "@/features/marketplace/review-form";
import { bookingDate, bookingMoney, bookingStatusLabels, type BoutiqueBooking } from "@/features/boutiques/booking-management/service";

type Rental = BoutiqueBooking & { boutique: { name: string; phone: string; address: string; city: string }; review?: { rating: number; isHidden: boolean } | null };
export default function MyRentalsPage() {
  const [rentals, setRentals] = useState<Rental[] | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const load = useCallback(() => api<Rental[]>("/api/bookings").then(data => { setRentals(data); setError(""); }).catch(error => setError(error.message)), []);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30000); window.addEventListener("focus", load); return () => { clearInterval(timer); window.removeEventListener("focus", load); }; }, [load]);
  async function cancel(booking: Rental) {
    const reason = window.prompt("Why are you cancelling this rental?"); if (!reason) return;
    setBusy(booking.id);
    try { await api("/api/bookings", jsonRequest("PATCH", { id: booking.id, version: booking.version, reason })); await load(); }
    catch (error) { setError(error instanceof Error ? error.message : "Cancellation failed."); }
    finally { setBusy(""); }
  }
  return <div className="min-h-screen bg-[#f7f5f1]"><CustomerHeader /><main className="mx-auto max-w-6xl px-5 py-12"><h1 className="font-serif text-4xl text-[#4c2544]">My rentals</h1><p className="my-4">Track your requests and updates from your boutiques.</p><button onClick={() => void load()} className="underline">Refresh orders</button>
    {error && <p role="alert" className="my-5">{error} <Link href="/login" className="underline">Sign in</Link></p>}
    {!rentals && !error && <p role="status">Loading rentals?</p>}
    {rentals?.length === 0 && <p className="my-8">No rentals yet. <Link href="/marketplace" className="underline">Explore the marketplace</Link></p>}
    <div className="mt-8 space-y-5">{rentals?.map(booking => <article key={booking.id} className="rounded-2xl border bg-white p-6">
      <div className="flex justify-between gap-4"><h2 className="font-serif text-2xl">{booking.boutique.name}</h2><span>{bookingStatusLabels[booking.status]}</span></div><p className="my-2 text-sm">Order {booking.id}</p>
      {booking.products.map((product, index) => <p key={index}><Link className="underline" href={"/marketplace/" + product.id}>{product.name}</Link> ? {product.size} ? Quantity {product.quantity}</p>)}
      <p className="mt-4">Pickup: {bookingDate(booking.pickupAt, "Asia/Kolkata")}</p><p>Return: {bookingDate(booking.returnAt, "Asia/Kolkata")}</p><p className="mt-3">Rental: {bookingMoney(booking.rentalMinor)} ? Deposit: {bookingMoney(booking.depositMinor)}</p>
      <p className="mt-3">{booking.boutique.address}, {booking.boutique.city} ? {booking.boutique.phone}</p>
      {booking.rejectionReason && <p>Reason: {booking.rejectionReason}</p>}{booking.cancellationReason && <p>Cancellation: {booking.cancellationReason}</p>}{booking.manualRefund && <p>Deposit refund: {booking.manualRefund.status.replaceAll("_", " ")} ? {booking.manualRefund.notes}</p>}
      {["PENDING", "CONFIRMED"].includes(booking.status) && <button disabled={Boolean(busy)} onClick={() => void cancel(booking)} className="mt-4 underline">{busy === booking.id ? "Cancelling?" : "Cancel request"}</button>}
      {booking.status === "COMPLETED" && !booking.review && <ReviewForm bookingId={booking.id} products={booking.products} onSaved={() => void load()} />}
      {booking.review && <p className="mt-4 text-sm">Your review: {booking.review.rating}/5{booking.review.isHidden ? " (hidden by moderation)" : ""}</p>}
    </article>)}</div>
  </main><CustomerFooter /></div>;
}
