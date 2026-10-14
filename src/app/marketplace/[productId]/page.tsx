"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api, jsonRequest } from "@/lib/api-client";
import type { CatalogProduct } from "@/features/marketplace/catalog";
import { bookingMoney } from "@/features/boutiques/booking-management/service";

export default function ProductPage() {
  return <Suspense fallback={<main className="p-8" role="status">Loading product…</main>}><ProductRoute /></Suspense>;
}
function ProductRoute() {
  const { productId } = useParams<{ productId: string }>();
  return <ProductDetails key={productId} productId={productId} />;
}
function ProductDetails({ productId }: { productId: string }) {
  const [product, setProduct] = useState<CatalogProduct | null>(null), [error, setError] = useState("");
  const [variantId, setVariantId] = useState(""), [quantity, setQuantity] = useState(1), [pickup, setPickup] = useState(""), [returned, setReturned] = useState("");
  const [saving, setSaving] = useState(false), [bookingId, setBookingId] = useState("");
  useEffect(() => {
    let active = true;
    api<CatalogProduct>("/api/products?id=" + encodeURIComponent(productId)).then(data => { if (active) { setProduct(data); setVariantId(data.variants.find(v => v.quantity > 0)?.id ?? ""); } }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [productId]);
  const variant = product?.variants.find(v => v.id === variantId);
  const days = Math.ceil((Date.parse(returned) - Date.parse(pickup)) / 86400000);
  const estimate = variant && days > 0 ? variant.rentalPriceMinor * (product?.rentalPriceUnit === "PER_DAY" ? days : 1) * quantity : 0;
  async function placeOrder(event: React.FormEvent) {
    event.preventDefault(); if (saving || bookingId) return;
    setError(""); setSaving(true);
    try {
      const result = await api<{ id: string }>("/api/bookings", jsonRequest("POST", { variantId, quantity, pickupAt: new Date(pickup).toISOString(), returnAt: new Date(returned).toISOString() }));
      setBookingId(result.id);
    } catch (error) { setError(error instanceof Error ? error.message : "Order could not be placed."); }
    finally { setSaving(false); }
  }
  return <div className="min-h-screen bg-[#f7f5f1] text-[#302d31]"><CustomerHeader /><main className="mx-auto max-w-6xl px-5 py-12">
    <Link href="/marketplace" className="text-[#4c2544] underline">Back to marketplace</Link>
    {error && <p role="alert" className="my-5 rounded-xl border p-4">{error} <Link href="/login" className="underline">Sign in</Link></p>}
    {!product ? <p role="status" className="mt-8">{error ? "Product unavailable." : "Loading product?"}</p> : <div className="mt-8 grid gap-10 md:grid-cols-2">
      <div>{product.image && <div role="img" aria-label={product.name} className="aspect-[4/5] rounded-3xl bg-cover bg-center" style={{ backgroundImage: "url('" + product.image + "')" }} />}</div>
      <section><p>{product.category} ? {product.boutique.city}</p><h1 className="mt-3 font-serif text-4xl text-[#4c2544]">{product.name}</h1><p className="mt-3">By {product.boutique.name}</p><p className="my-5 text-2xl">{bookingMoney(product.rentalPriceMinor)} / {product.rentalPeriod}</p><p>{product.description}</p>
        {bookingId ? <div role="status" className="mt-8 rounded-2xl border bg-white p-6"><h2 className="text-xl">Request sent to {product.boutique.name}</h2><p className="my-3">Order {bookingId} is pending boutique confirmation.</p><Link href="/my-rentals" className="underline">Track your order</Link></div> : <form onSubmit={placeOrder} className="mt-8 space-y-4 rounded-2xl border bg-white p-6">
          <h2 className="font-serif text-2xl">Book your rental</h2>
          <label className="block">Size<select required value={variantId} onChange={event => setVariantId(event.target.value)} className="mt-1 block w-full rounded-lg border p-3"><option value="">Choose a size</option>{product.variants.map(v => <option key={v.id} value={v.id} disabled={!v.quantity}>{v.size} {v.quantity ? "(" + v.quantity + " in stock)" : "(out of stock)"}</option>)}</select></label>
          <label className="block">Quantity<input className="mt-1 block w-full rounded-lg border p-3" type="number" required min={1} max={variant?.quantity ?? 1} value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label>
          <label className="block">Pickup date and time<input className="mt-1 block w-full rounded-lg border p-3" type="datetime-local" required value={pickup} onChange={event => setPickup(event.target.value)} /></label>
          <label className="block">Return date and time<input className="mt-1 block w-full rounded-lg border p-3" type="datetime-local" required min={pickup} value={returned} onChange={event => setReturned(event.target.value)} /></label>
          {estimate > 0 && <p>Rental: {bookingMoney(estimate)} ? Deposit: {bookingMoney((variant?.depositMinor ?? 0) * quantity)}</p>}
          <p className="text-sm">Availability and prices are checked when you place the order. Requests await boutique confirmation. Arrange pickup and payment with the boutique.</p>
          <button className="w-full rounded-full bg-[#4c2544] p-3 text-white disabled:opacity-50" disabled={saving || !variant || days <= 0 || !Number.isFinite(days)}>{saving ? "Sending request?" : "Place rental order"}</button>
        </form>}
      </section>
    </div>}
  </main><CustomerFooter /></div>;
}
