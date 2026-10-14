"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api, HttpError, jsonRequest } from "@/lib/api-client";
import { safeProductImage, type CatalogProduct } from "@/features/marketplace/catalog";
import { bookingMoney } from "@/features/boutiques/booking-management/service";

type AvailabilityQuote = { variantId: string; available: boolean; availableUnits: number; rentalDays: number; rentalMinor: number; depositMinor: number; totalMinor: number; currency: string; checkedAt: string };
type ProductReviews = { items: { id: string; rating: number; comment: string | null; createdAt: string; customerName: string }[]; ratingAverage: number | null; ratingCount: number };
const inputClass = "mt-1 block w-full rounded-lg border border-[#d9d1c9] p-3";

export default function ProductPage() { return <Suspense fallback={<main className="p-8" role="status">Loading product…</main>}><ProductRoute /></Suspense>; }
function ProductRoute() { const { productId } = useParams<{ productId: string }>(); return <ProductDetails key={productId} productId={productId} />; }

function ProductDetails({ productId }: { productId: string }) {
  const [product, setProduct] = useState<CatalogProduct | null>(null), [error, setError] = useState("");
  const [reviews, setReviews] = useState<ProductReviews | null>(null), [reviewError, setReviewError] = useState("");
  const [image, setImage] = useState("");
  const [variantId, setVariantId] = useState(""), [quantity, setQuantity] = useState(1), [pickup, setPickup] = useState(""), [returned, setReturned] = useState("");
  const [saving, setSaving] = useState(false), [bookingId, setBookingId] = useState(""), [checking, setChecking] = useState(false), [loginRequired, setLoginRequired] = useState(false);
  const [quote, setQuote] = useState<{ data: AvailabilityQuote; key: string } | null>(null);
  const requestVersion = useRef(0), quoteController = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement | null>(null);
  const selectionKey = JSON.stringify([variantId, quantity, pickup, returned]);
  useEffect(() => {
    const controller = new AbortController();
    api<CatalogProduct>(`/api/products?id=${encodeURIComponent(productId)}`, { signal: controller.signal }).then(data => {
      setProduct(data); setVariantId(data.variants.find(v => v.quantity > 0)?.id ?? ""); setImage(safeProductImage(data.images?.[0]) ?? safeProductImage(data.image) ?? "");
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Product could not be loaded."); });
    api<ProductReviews>(`/api/reviews?productId=${encodeURIComponent(productId)}`, { signal: controller.signal }).then(setReviews).catch(() => { if (!controller.signal.aborted) setReviewError("Reviews could not be loaded."); });
    return () => { controller.abort(); quoteController.current?.abort(); };
  }, [productId]);
  useEffect(() => {
    if (!quote) return;
    const expiresIn = Math.max(0, Date.parse(quote.data.checkedAt) + 60000 - Date.now());
    const timer = setTimeout(() => setQuote(null), expiresIn);
    return () => clearTimeout(timer);
  }, [quote]);
  function invalidateQuote() { requestVersion.current += 1; quoteController.current?.abort(); setChecking(false); setQuote(null); setError(""); }
  const variant = product?.variants.find(v => v.id === variantId);
  const validSelection = !!variant && Number.isInteger(quantity) && quantity > 0 && quantity <= variant.quantity && !!pickup && !!returned && Date.parse(returned) > Date.parse(pickup);
  const currentQuote = quote?.key === selectionKey ? quote.data : null;
  async function checkAvailability() {
    if (!validSelection || !form.current?.reportValidity()) return;
    const version = ++requestVersion.current, controller = new AbortController();
    quoteController.current?.abort(); quoteController.current = controller;
    setError(""); setQuote(null); setChecking(true);
    try {
      const params = new URLSearchParams({ variantId, quantity: String(quantity), pickupAt: new Date(pickup).toISOString(), returnAt: new Date(returned).toISOString() });
      const result = await api<AvailabilityQuote>(`/api/availability?${params}`, { signal: controller.signal });
      if (version === requestVersion.current) setQuote({ data: result, key: selectionKey });
    } catch (error) { if (!controller.signal.aborted && version === requestVersion.current) setError(error instanceof Error ? error.message : "Availability could not be checked."); }
    finally { if (version === requestVersion.current) setChecking(false); }
  }
  async function placeOrder(event: React.FormEvent) {
    event.preventDefault(); if (saving || bookingId || !currentQuote?.available) return;
    if (Date.parse(currentQuote.checkedAt) + 60000 <= Date.now()) { setQuote(null); setError("Please check availability again for a fresh quote."); return; }
    setError(""); setLoginRequired(false); setSaving(true);
    try {
      const result = await api<{ id: string }>("/api/bookings", jsonRequest("POST", { variantId, quantity, pickupAt: new Date(pickup).toISOString(), returnAt: new Date(returned).toISOString() }));
      setBookingId(result.id);
    } catch (error) { setError(error instanceof Error ? error.message : "Order could not be placed."); setLoginRequired(error instanceof HttpError && error.status === 401); setQuote(null); }
    finally { setSaving(false); }
  }
  const gallery = [...new Set([...(product?.images ?? []), product?.image ?? ""].map(safeProductImage).filter((value): value is string => !!value))];
  return <div className="min-h-screen bg-[#f7f5f1] text-[#302d31]"><CustomerHeader /><main className="mx-auto max-w-6xl px-5 py-12">
    <Link href="/marketplace" className="text-[#4c2544] underline">Back to marketplace</Link>
    {error && <p role="alert" className="my-5 rounded-xl border bg-white p-4">{error}{loginRequired && <> <Link href={`/login?callbackUrl=${encodeURIComponent(`/marketplace/${productId}`)}`} className="underline">Sign in to request this rental</Link></>}</p>}
    {!product ? <p role="status" className="mt-8">{error ? "Product unavailable." : "Loading product…"}</p> : <>
      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-[#eee7e5]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {image ? <img src={image} alt={product.name} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center">Image unavailable</div>}
          </div>
          {gallery.length > 1 && <div className="mt-3 flex flex-wrap gap-3" aria-label="Product image gallery">{gallery.map((source, index) => <button key={source} type="button" onClick={() => setImage(source)} aria-label={`View ${product.name} image ${index + 1}`} aria-pressed={image === source} className={`size-20 overflow-hidden rounded-lg border-2 ${image === source ? "border-[#4c2544]" : "border-transparent"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={source} alt={`${product.name}, view ${index + 1}`} loading="lazy" className="size-full object-cover" />
          </button>)}</div>}
        </div>
        <section>
          <p className="text-sm text-[#716971]">{product.category} · {product.boutique.city}</p><h1 className="mt-3 font-serif text-4xl text-[#4c2544]">{product.name}</h1>
          <Link href={`/boutiques/${encodeURIComponent(product.boutique.id)}`} className="mt-3 block text-[#4c2544] underline">By {product.boutique.name}</Link>
          {!!reviews?.ratingCount && <p className="mt-3 flex items-center gap-2"><Star size={16} />{Number(reviews.ratingAverage ?? 0).toFixed(1)} / 5 ({reviews.ratingCount} reviews)</p>}
          <p className="my-5 text-2xl">{bookingMoney(variant?.rentalPriceMinor ?? product.rentalPriceMinor)} / {product.rentalPeriod}</p><p className="leading-7">{product.description}</p>
          <p className="mt-4 text-sm">Refundable deposit per item: {bookingMoney(variant?.depositMinor ?? product.depositMinor)}</p>
          {!!product.colours?.length && <p className="mt-2 text-sm">Colours: {product.colours.join(", ")}</p>}{!!product.occasionTags?.length && <p className="mt-2 text-sm">Occasions: {product.occasionTags.join(", ")}</p>}
          {bookingId ? <div role="status" className="mt-8 rounded-2xl border bg-white p-6"><h2 className="text-xl">Request sent to {product.boutique.name}</h2><p className="my-3">Order {bookingId} is pending boutique confirmation.</p><Link href="/my-rentals" className="underline">Track your order</Link></div> : <form ref={form} onSubmit={placeOrder} className="mt-8 space-y-4 rounded-2xl border bg-white p-6">
            <h2 className="font-serif text-2xl">Book your rental</h2>
            <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
              <label className="block">Size<select required value={variantId} onChange={event => { invalidateQuote(); setVariantId(event.target.value); setQuantity(1); }} className={inputClass}><option value="">Choose a size</option>{product.variants.map(v => <option key={v.id} value={v.id} disabled={!v.quantity}>{v.size.replaceAll("_", " ")} {v.quantity ? `(${v.quantity} total stock)` : "(out of stock)"}</option>)}</select></label>
              <label className="block">Quantity<input className={inputClass} type="number" required min={1} max={variant?.quantity ?? 1} value={quantity} onChange={event => { invalidateQuote(); setQuantity(Number(event.target.value)); }} /></label>
              <label className="block">Pickup date and time<input className={inputClass} type="datetime-local" required value={pickup} onChange={event => { invalidateQuote(); setPickup(event.target.value); }} /></label>
              <label className="block">Return date and time<input className={inputClass} type="datetime-local" required min={pickup} value={returned} onChange={event => { invalidateQuote(); setReturned(event.target.value); }} /></label>
              <button type="button" onClick={checkAvailability} disabled={checking || !validSelection} className="w-full rounded-full border border-[#4c2544] p-3 text-[#4c2544] disabled:opacity-50">{checking ? "Checking dates…" : "Check availability and price"}</button>
              {currentQuote && <div role="status" className={`rounded-xl p-4 ${currentQuote.available ? "bg-green-50" : "bg-amber-50"}`}><p>{currentQuote.available ? `${currentQuote.availableUnits} available for your dates` : `Only ${currentQuote.availableUnits} available; try another quantity, size or dates.`}</p>{currentQuote.available && <dl className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><dt>Rental ({currentQuote.rentalDays} days)</dt><dd>{bookingMoney(currentQuote.rentalMinor)}</dd></div><div className="flex justify-between"><dt>Refundable deposit</dt><dd>{bookingMoney(currentQuote.depositMinor)}</dd></div><div className="flex justify-between font-semibold"><dt>Total including deposit</dt><dd>{bookingMoney(currentQuote.totalMinor)}</dd></div></dl>}</div>}
              <p className="text-sm leading-6 text-[#716971]">Your quote is valid for one minute. Availability and prices are checked again when submitting. Requests await boutique confirmation. Arrange pickup and payment with the boutique.</p>
              <button className="w-full rounded-full bg-[#4c2544] p-3 text-white disabled:opacity-50" disabled={saving || !currentQuote?.available}>{saving ? "Sending request…" : "Place rental order"}</button>
            </fieldset>
          </form>}
        </section>
      </div>
      <section className="mt-10 rounded-2xl border bg-[#fffdf9] p-6"><h2 className="font-serif text-2xl text-[#4c2544]">About {product.boutique.name}</h2>{product.boutique.description && <p className="mt-3 leading-7">{product.boutique.description}</p>}<p className="mt-3 text-sm">{[product.boutique.address, product.boutique.city, product.boutique.state].filter(Boolean).join(", ")}</p>{product.boutique.phone && <p className="mt-2 text-sm">Phone: {product.boutique.phone}</p>}{product.boutique.contactEmail && <p className="mt-2 text-sm">Email: {product.boutique.contactEmail}</p>}<Link href={`/boutiques/${encodeURIComponent(product.boutique.id)}`} className="mt-4 inline-block text-[#4c2544] underline">View boutique storefront</Link></section>
      <section className="mt-10 rounded-2xl border bg-[#fffdf9] p-6"><h2 className="font-serif text-2xl text-[#4c2544]">Customer reviews</h2><p className="mt-2 text-sm text-[#716971]">Customers can review products after completing a rental, from their rental history.</p>{reviewError ? <p role="status" className="mt-4">{reviewError}</p> : !reviews ? <p role="status" className="mt-4">Loading reviews…</p> : !reviews.items.length ? <p className="mt-4 text-sm">No reviews yet.</p> : <div className="mt-5 divide-y">{reviews.items.map(review => <article key={review.id} className="py-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><p className="font-medium">{review.customerName} · {review.rating} / 5</p><time dateTime={review.createdAt} className="text-[#716971]">{new Date(review.createdAt).toLocaleDateString("en-IN")}</time></div>{review.comment && <p className="mt-2 whitespace-pre-wrap leading-7">{review.comment}</p>}</article>)}</div>}</section>
    </>}
  </main><CustomerFooter /></div>;
}
