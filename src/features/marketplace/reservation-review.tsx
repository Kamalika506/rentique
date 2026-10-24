"use client";
import { useEffect, useState } from "react";
import { api, jsonRequest } from "@/lib/api-client";
import { bookingMoney } from "@/features/boutiques/booking-management/service";
export interface RentalQuote {
  quoteId: string; expiresAt: string; pickupAt: string; returnAt: string; rentalMinor: number; rentalDays: number;
  policy: string; openingHours: string;
  boutique: { id: string; name: string; address: string; city: string; phone?: string; contactEmail?: string };
  lines: { variantId: string; productId: string; name: string; size: string; quantity: number; rentalMinor: number }[];
}
export function ReservationReview({ quote, onBooked }: { quote: RentalQuote; onBooked: (id: string) => void }) {
  const [accepted, setAccepted] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [expired, setExpired] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const delay = Math.max(0, Date.parse(quote.expiresAt) - Date.now());
    const timer = setTimeout(() => setExpired(true), delay); return () => clearTimeout(timer);
  }, [quote.expiresAt]);
  async function request() {
    if (busy || !accepted || expired) return;
    setBusy(true); setError("");
    try {
      const result = await api<{ id: string }>("/api/bookings", { ...jsonRequest("POST", { quoteId: quote.quoteId, acceptedTerms: true }), headers: { "Content-Type": "application/json", "Idempotency-Key": key } });
      onBooked(result.id);
    } catch (error) { setError(error instanceof Error ? error.message : "Reservation could not be requested."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-2xl border border-[#d9d1c9] bg-white p-6" aria-label="Review reservation estimate">
    <h2 className="font-serif text-2xl text-[#4c2544]">Review your reservation</h2>
    <p className="mt-3">{quote.boutique.name} · {quote.boutique.address}, {quote.boutique.city}</p>
    <p className="mt-2 text-sm">Shop contact: {quote.boutique.phone || "Contact the boutique"} {quote.boutique.contactEmail && ` | ${quote.boutique.contactEmail}`}</p>
    <p className="mt-2 text-sm">Pickup: {new Date(quote.pickupAt).toLocaleString("en-IN")} · Return: {new Date(quote.returnAt).toLocaleString("en-IN")}</p>
    <ul className="mt-4 space-y-3">{quote.lines.map(line => <li key={line.variantId}>{line.name} · {line.size} × {line.quantity}<span className="ml-3 font-medium">{bookingMoney(line.rentalMinor)}</span></li>)}</ul>
    <p className="mt-5 border-t pt-4 text-xl font-semibold">Full-period rental estimate: {bookingMoney(quote.rentalMinor)}</p>
    <p className="mt-2 text-sm">Informational price for {quote.rentalDays} rental day(s). No payment is collected on Rentique.</p>
    <p className="mt-3 whitespace-pre-line text-sm">{quote.policy}</p>
    <p className="mt-3 whitespace-pre-line text-sm">Shop hours: {quote.openingHours || "Contact the boutique to confirm counter hours."}</p>
    <p className="mt-3 text-sm">This estimate expires after five minutes and does not hold stock. Submitting rechecks every item.</p>
    <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />I have reviewed these items, dates, estimated prices, and shop terms. I understand the boutique must confirm my request.</label>
    {expired && <p role="status" className="mt-4">Estimate expired. Check your dates again for a new estimate.</p>}
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    <button type="button" onClick={() => void request()} disabled={busy || expired || !accepted} className="mt-5 rounded-full bg-[#4c2544] px-6 py-3 text-white disabled:opacity-50">{busy ? "Sending request…" : "Request shop reservation"}</button>
  </section>;
}
