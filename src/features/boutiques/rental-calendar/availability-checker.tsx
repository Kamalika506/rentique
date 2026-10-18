"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import styles from "../dashboard/dashboard.module.css";

interface InventoryProduct {
  id: string; name: string; archived: boolean;
  variants: { id: string; size: string; quantity: number; rentalPriceMinor: number; depositMinor: number }[];
}
interface AvailabilityQuote {
  variantId: string; available: boolean; availableUnits: number; rentalDays: number;
  rentalMinor: number; depositMinor: number; totalMinor: number; currency: string; checkedAt: string;
}

function localDateTime(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export function AvailabilityChecker({ boutiqueTimezone }: { boutiqueTimezone: string }) {
  const [products, setProducts] = useState<InventoryProduct[]>([]), [variantId, setVariantId] = useState("");
  const [pickupAt, setPickupAt] = useState(""), [returnAt, setReturnAt] = useState(""), [quantity, setQuantity] = useState("1");
  const [quote, setQuote] = useState<AvailabilityQuote | null>(null), [loading, setLoading] = useState(true), [checking, setChecking] = useState(false), [error, setError] = useState("");
  const [timezone, setTimezone] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const pickup = new Date(); pickup.setDate(pickup.getDate() + 1); pickup.setHours(10, 0, 0, 0);
    const returned = new Date(pickup); returned.setDate(returned.getDate() + 1);
    Promise.resolve().then(() => { if (!controller.signal.aborted) { setPickupAt(localDateTime(pickup)); setReturnAt(localDateTime(returned)); setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone); } });
    api<InventoryProduct[]>("/api/boutique/products", { signal: controller.signal }).then((result) => {
      const active = result.filter((product) => !product.archived);
      setProducts(active); setVariantId(active[0]?.variants?.[0]?.id ?? "");
    }).catch((cause) => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  async function check(event: React.FormEvent) {
    event.preventDefault(); setError(""); setQuote(null);
    const pickup = new Date(pickupAt), returned = new Date(returnAt), requested = Number(quantity);
    if (!variantId || !Number.isFinite(pickup.getTime()) || !Number.isFinite(returned.getTime()) || returned <= pickup || !Number.isInteger(requested) || requested < 1 || requested > 100) { setError("Choose a product size, a valid rental interval, and a stock quantity from 1 to 100."); return; }
    setChecking(true);
    try {
      const params = new URLSearchParams({ variantId, quantity, pickupAt: pickup.toISOString(), returnAt: returned.toISOString() });
      setQuote(await api<AvailabilityQuote>(`/api/availability?${params}`));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to check availability."); }
    finally { setChecking(false); }
  }
  const money = (minor: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: quote?.currency ?? "INR" }).format(minor / 100);
  const clearQuote = () => { setQuote(null); setError(""); };
  return <section className={styles.panel} aria-labelledby="stock-availability-heading">
    <div className={styles.panelHead}><div><h2 className={styles.panelTitle} id="stock-availability-heading">Check stock and rental quote</h2><p className={styles.muted}>Find available units for a product size and rental interval.</p></div></div>
    <div className="p-5">
      {loading ? <p role="status">Loading product sizes…</p> : !products.length ? <p className={styles.muted}>Add an active product to check stock availability.</p> : <form onSubmit={check}>
        <div className={styles.filters}>
          <label className={styles.field}>Product and size<select className={styles.input} value={variantId} disabled={checking} required onChange={(event) => { setVariantId(event.target.value); clearQuote(); }}><option value="" disabled>Select a product size</option>{products.map((product) => <optgroup key={product.id} label={product.name}>{product.variants?.map((variant) => <option key={variant.id} value={variant.id}>{product.name} · {variant.size} · {variant.quantity} total units</option>)}</optgroup>)}</select></label>
          <label className={styles.field}>Pickup<input type="datetime-local" className={styles.input} value={pickupAt} disabled={checking} required onChange={(event) => { setPickupAt(event.target.value); clearQuote(); }} /></label>
          <label className={styles.field}>Return<input type="datetime-local" className={styles.input} value={returnAt} disabled={checking} required onChange={(event) => { setReturnAt(event.target.value); clearQuote(); }} /></label>
          <label className={`${styles.field} !min-w-24`}>Units<input type="number" className={styles.input} min={1} max={100} step={1} required disabled={checking} value={quantity} onChange={(event) => { setQuantity(event.target.value); clearQuote(); }} /></label>
          <Button type="submit" disabled={checking || !variantId}>{checking ? "Checking…" : "Check availability"}</Button>
        </div>
        <p className={styles.muted}>Times use your device timezone{timezone ? ` (${timezone})` : ""}. The boutique calendar uses {boutiqueTimezone}.</p>
      </form>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {quote && <div className="mt-5 rounded-xl border border-[#e4dfd7] bg-[#f7f5f1] p-5" role="status">
        <p className={`text-sm font-semibold ${quote.available ? "text-green-800" : "text-red-700"}`}>{quote.available ? "Available for this rental interval" : "Requested quantity is unavailable"}</p>
        <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-4"><div><dt className={styles.muted}>Available units</dt><dd className="mt-1 font-medium">{quote.availableUnits}</dd></div><div><dt className={styles.muted}>Rental · {quote.rentalDays} {quote.rentalDays === 1 ? "day" : "days"}</dt><dd className="mt-1 font-medium">{money(quote.rentalMinor)}</dd></div><div><dt className={styles.muted}>Full-period estimate</dt><dd className="mt-1 font-medium">{money(quote.totalMinor)}</dd></div></dl>
        <p className={`${styles.muted} mt-4`}>Checked {new Date(quote.checkedAt).toLocaleString("en-IN")} · This check does not reserve stock.</p>
      </div>}
    </div>
  </section>;
}
