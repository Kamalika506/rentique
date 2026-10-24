"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sparkles } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { recommendationInputSchema, type RecommendationResponse } from "@/features/recommendations/contracts";
import { InspirationUpload } from "@/features/recommendations/inspiration-upload";
import { bookingMoney } from "@/features/boutiques/booking-management/service";

const inputClass = "mt-2 w-full rounded-xl border border-[#d9d1c9] bg-white p-3 text-sm";

export default function StylingPage() {
  const { status } = useSession();
  const [result, setResult] = useState<RecommendationResponse | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const preferencesForm = useRef<HTMLFormElement | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function recommend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "authenticated") { setError("Sign in to access rental dates and available looks."); return; }
    const form = new FormData(event.currentTarget);
    const start = String(form.get("start")), end = String(form.get("end"));
    const input = recommendationInputSchema.safeParse({ occasion: form.get("occasion"), totalRentalBudget: Number(form.get("budget")), outfitType: form.get("outfitType"), colourPreference: String(form.get("colourPreference")).trim() || "any", jewelleryPreference: form.get("jewelleryPreference"), ...(String(form.get("city")).trim() ? { city: String(form.get("city")).trim() } : {}), rentalDates: { start, end } });
    if (!input.success) { setError("Choose an occasion, a positive budget and a return date after pickup."); return; }
    const pickupAt = Date.parse(`${start}T00:00:00+05:30`), days = (Date.parse(`${end}T00:00:00+05:30`) - pickupAt) / 86400000;
    if (pickupAt < Date.now() + 24 * 3600000 || pickupAt > Date.now() + 180 * 86400000 || days > 14) { setError("Choose pickup at least 24 hours ahead, within 180 days, and a rental of up to 14 days."); return; }
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/recommendations", { method: "POST", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : body.error?.message ?? "Styling recommendations are temporarily unavailable.");
      setResult(body as RecommendationResponse);
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Recommendations could not be loaded."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function invalidate() { request.current?.abort(); setResult(null); setError(""); setLoading(false); }
  return <div className="min-h-screen bg-[#f7f5f1] text-[#302d31]"><CustomerHeader /><main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#927c59]"><Sparkles size={16} /> Occasion styling</p><h1 className="mt-3 font-serif text-4xl text-[#4c2544]">A look for your occasion.</h1><p className="mt-4 max-w-2xl leading-7 text-[#716971]">Tell us your preferences and rental dates. Discover available looks from approved boutiques that fit your rental budget.</p>
    {status === "unauthenticated" && <div className="mt-6 rounded-xl border bg-white p-5"><p>Sign in to choose rental dates and find available looks.</p><Link href="/login?callbackUrl=%2Fstyling" className="mt-3 inline-block text-[#4c2544] underline">Login</Link><Link href="/register" className="ml-4 text-[#4c2544] underline">Sign up</Link></div>}
    {status === "authenticated" && <InspirationUpload onApply={attributes => { invalidate(); for (const name of ["outfitType", "colourPreference", "jewelleryPreference"] as const) { const field = preferencesForm.current?.elements.namedItem(name); if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = attributes[name]; } preferencesForm.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />}
    <form ref={preferencesForm} onSubmit={recommend} onChange={invalidate} className="mt-8 grid gap-5 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-6 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-medium">Occasion<select required name="occasion" defaultValue="wedding" className={inputClass}><option value="wedding">Wedding</option><option value="reception">Reception</option><option value="party">Party</option><option value="festive">Festive celebration</option><option value="formal">Formal event</option><option value="casual">Casual outing</option></select></label>
      <label className="text-sm font-medium">Full rental budget (₹)<input required name="budget" type="number" min="0.01" max="10000000" step="0.01" placeholder="e.g. 3000" className={inputClass} /></label>
      <label className="text-sm font-medium">Outfit type<select name="outfitType" defaultValue="any" className={inputClass}><option value="any">Any outfit</option><option value="saree">Saree</option><option value="lehenga">Lehenga</option><option value="gown">Gown</option><option value="suit">Suit</option><option value="dress">Dress</option></select></label>
      <label className="text-sm font-medium">Colour preference<input name="colourPreference" maxLength={100} placeholder="Any, red, plum…" className={inputClass} /></label>
      <label className="text-sm font-medium">Jewellery preference<select name="jewelleryPreference" defaultValue="any" className={inputClass}><option value="any">Any jewellery</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="none">No jewellery</option></select></label>
      <label className="text-sm font-medium">Pickup date<input disabled={status !== "authenticated"} required name="start" type="date" className={inputClass} /></label>
      <label className="text-sm font-medium">Return date<input disabled={status !== "authenticated"} required name="end" type="date" className={inputClass} /></label>
      <label className="text-sm font-medium">Boutique city (optional)<input name="city" maxLength={100} placeholder="e.g. Jaipur" className={inputClass} /></label>
      <div className="sm:col-span-2 lg:col-span-3"><p className="text-xs leading-6 text-[#716971]">Prices cover your full rental period. Prices are informational; Rentique does not collect payments. Check the final size, pickup time and price on each product page.</p><button disabled={loading || status !== "authenticated"} type="submit" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#4c2544] px-7 py-3 text-sm font-medium text-white disabled:opacity-60"><Sparkles size={17} />{loading ? "Finding available looks…" : "Find my looks"}</button></div>
    </form>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-white p-5">{error}</p>}
    {loading && <p role="status" className="mt-6">Checking boutique inventory, prices and availability…</p>}
    {status === "authenticated" && result && <section className="mt-10" aria-live="polite"><h2 className="font-serif text-3xl text-[#4c2544]">{result.looks.length ? "Your matching looks" : "No matching looks"}</h2><p className="mt-3 text-sm leading-7 text-[#716971]">{result.source === "gemini" ? "AI assisted styling ranks available products using your occasion preferences." : "Matched using occasion rules and your preferences. AI styling is currently unavailable."} Every suggested product comes from approved boutique inventory.</p>{!result.looks.length ? <p className="mt-5 rounded-xl border bg-white p-5">{result.status === "INVENTORY_UNAVAILABLE" ? "Boutique inventory could not be checked. Please try again shortly." : "No available look fits all your preferences and rental budget. Try another date, a different outfit type, any colour or a higher budget."}</p> : <div className="mt-6 grid gap-5 md:grid-cols-2">{result.looks.map((look, index) => <article key={look.products.map(product => product.id).join(":")} className="rounded-2xl border bg-[#fffdf9] p-6"><p className="text-xs uppercase tracking-widest text-[#927c59]">Look {index + 1}</p><ul className="mt-4 space-y-5">{look.products.map(product => <li key={product.id}><Link href={"/marketplace/" + encodeURIComponent(product.id) + (product.variantId ? "?variantId=" + encodeURIComponent(product.variantId) : "")} className="font-serif text-2xl text-[#4c2544] hover:underline">{product.name}</Link><p className="mt-1 text-sm text-[#716971]">{product.kind === "jewellery" ? "Jewellery" : "Outfit"} · <Link href={`/boutiques/${encodeURIComponent(product.boutiqueId)}`} className="underline">{product.boutiqueName}</Link></p><p className="mt-1 text-sm">{bookingMoney(product.rentalMinor)} for your dates</p></li>)}</ul><p className="mt-6 border-t pt-4 font-semibold">Total rental: {bookingMoney(look.totalRentalMinor)}</p><p className="mt-2 text-xs text-[#716971]">Collect and return at the shop. Review a fresh estimate before requesting.</p></article>)}</div>}<Link href="/marketplace" className="mt-6 inline-block text-[#4c2544] underline">Browse all rental products</Link></section>}
  </main><CustomerFooter /></div>;
}
