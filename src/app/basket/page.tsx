"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api, jsonRequest } from "@/lib/api-client";
import { ReservationRequirements, ReservationReview, type RentalQuote } from "@/features/marketplace/reservation-review";
type BasketItem = { id: string; variantId: string; productId: string; name: string; boutiqueName: string; size: string; quantity: number; unavailable: boolean };
export default function BasketPage() {
  const [items, setItems] = useState<BasketItem[] | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [pickup, setPickup] = useState(""), [returned, setReturned] = useState(""), [quote, setQuote] = useState<RentalQuote | null>(null), [bookingId, setBookingId] = useState("");
  useEffect(() => { const controller = new AbortController(); api<BasketItem[]>("/api/basket", { signal: controller.signal }).then(setItems).catch(error => { if (!controller.signal.aborted) setError(error.message); }); return () => controller.abort(); }, []);
  async function remove(variantId: string) {
    setBusy(true); setQuote(null); setError("");
    try { await api("/api/basket", jsonRequest("DELETE", { variantId })); setItems(items => items?.filter(item => item.variantId !== variantId) ?? []); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not remove item."); }
    finally { setBusy(false); }
  }
  async function estimate(event: React.FormEvent) {
    event.preventDefault(); if (!items?.length || busy) return;
    setBusy(true); setError(""); setQuote(null);
    try { setQuote(await api<RentalQuote>("/api/quotes", jsonRequest("POST", { items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity })), pickupAt: new Date(pickup).toISOString(), returnAt: new Date(returned).toISOString() }))); }
    catch (error) { setError(error instanceof Error ? error.message : "Estimate unavailable."); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-[#f7f5f1]"><CustomerHeader /><main className="mx-auto max-w-4xl px-5 py-12">
    <h1 className="font-serif text-4xl text-[#4c2544]">Your reservation basket</h1><p className="mt-4 text-sm leading-7">Reserve an outfit and accessories from one boutique for the same dates. Adding items does not hold stock.</p>
    <ReservationRequirements />
    {error && <p role="alert" className="my-5 text-red-700">{error}</p>}
    {bookingId ? <div role="status" className="mt-6 rounded-xl bg-white p-6"><h2 className="text-xl">Request sent</h2><p className="mt-2">The boutique must confirm before you visit.</p><Link className="mt-4 inline-block underline" href={"/my-rentals#" + bookingId}>Track reservation</Link></div> : <>
      {!items ? <p role="status">Loading basket…</p> : !items.length ? <p className="mt-8">Your basket is empty. <Link href="/marketplace" className="underline">Explore outfits</Link></p> : <>
        <h2 className="mt-8 font-serif text-2xl">{items[0].boutiqueName}</h2>
        <ul className="mt-5 space-y-4">{items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5"><div><Link href={"/marketplace/" + item.productId} className="font-medium underline">{item.name}</Link><p className="mt-1 text-sm">{item.size} · Quantity {item.quantity}</p>{item.unavailable && <p className="text-sm text-red-700">This listing is unavailable. Remove it before requesting.</p>}</div><button disabled={busy} onClick={() => void remove(item.variantId)} className="underline">Remove</button></li>)}</ul>
        <form onSubmit={estimate} className="mt-7 grid gap-5 rounded-xl border bg-white p-6 sm:grid-cols-2">
          <label className="text-sm">Shop pickup<input type="datetime-local" value={pickup} required disabled={busy} onChange={event => { setPickup(event.target.value); setQuote(null); }} className="mt-2 block w-full rounded border p-3" /></label>
          <label className="text-sm">Shop return<input type="datetime-local" value={returned} required min={pickup} disabled={busy} onChange={event => { setReturned(event.target.value); setQuote(null); }} className="mt-2 block w-full rounded border p-3" /></label>
          <p className="text-sm sm:col-span-2">Times use your device timezone. Request pickup at least 24 hours ahead; rentals can last up to 14 days.</p>
          <button disabled={busy || items.some(item => item.unavailable)} className="rounded-full border border-[#4c2544] px-5 py-3 text-[#4c2544] disabled:opacity-50">{busy ? "Checking every item…" : "Check dates and review estimate"}</button>
        </form>
        {quote && <ReservationReview key={quote.quoteId} quote={quote} onBooked={setBookingId} />}
      </>}
    </>}
  </main><CustomerFooter /></div>;
}
