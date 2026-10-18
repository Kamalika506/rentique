"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api, jsonRequest } from "@/lib/api-client";
import { safeProductImage, type CatalogProduct } from "./catalog";
import { bookingMoney } from "@/features/boutiques/booking-management/service";
import { ReservationRequirements, ReservationReview, type RentalQuote } from "./reservation-review";
import { dateTimeInputValue } from "@/features/rentals/dates";
type Reviews = { items: { id: string; rating: number; comment: string | null; customerName: string }[]; ratingAverage: number | null; ratingCount: number };
export default function Page() { return <Suspense fallback={<p role="status" className="p-8">Loading outfit…</p>}><Route /></Suspense>; }
function Route() { const { productId } = useParams<{ productId: string }>(); return <Details key={productId} productId={productId} />; }
function Details({ productId }: { productId: string }) {
  const { data: session, status } = useSession(), params = useSearchParams();
  const [product, setProduct] = useState<CatalogProduct | null>(null), [reviews, setReviews] = useState<Reviews | null>(null), [reviewError, setReviewError] = useState("");
  const [variantId, setVariantId] = useState(""), [quantity, setQuantity] = useState(1), [pickup, setPickup] = useState(() => dateTimeInputValue(params.get("pickupAt"))), [returned, setReturned] = useState(() => dateTimeInputValue(params.get("returnAt"))), [image, setImage] = useState("");
  const [quote, setQuote] = useState<RentalQuote | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [added, setAdded] = useState(false), [bookingId, setBookingId] = useState("");
  const request = useRef<AbortController | null>(null);
  const selectedVariant = params.get("variantId");
  useEffect(() => {
    const controller = new AbortController();
    api<CatalogProduct>("/api/products?id=" + encodeURIComponent(productId), { signal: controller.signal }).then(result => {
      setProduct(result); setVariantId(result.variants.find(variant => variant.id === selectedVariant)?.id ?? result.variants.find(variant => variant.quantity > 0)?.id ?? "");
      setImage(safeProductImage(result.images[0]) ?? "");
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    api<Reviews>("/api/reviews?productId=" + encodeURIComponent(productId), { signal: controller.signal }).then(setReviews).catch(() => { if (!controller.signal.aborted) setReviewError("Reviews could not be loaded."); });
    return () => { controller.abort(); request.current?.abort(); };
  }, [productId, selectedVariant]);
  const variant = product?.variants.find(variant => variant.id === variantId);
  const canReserve = status === "authenticated" && session?.user.role !== "ADMIN";
  function invalidate() { request.current?.abort(); setQuote(null); setError(""); setAdded(false); setBusy(false); }
  async function addToBasket() {
    setBusy(true); setError("");
    try { await api("/api/basket", jsonRequest("POST", { variantId, quantity })); setAdded(true); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not add to basket."); }
    finally { setBusy(false); }
  }
  async function estimate(event: React.FormEvent) {
    event.preventDefault(); if (!canReserve || busy) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(""); setQuote(null);
    try { const result = await api<RentalQuote>("/api/quotes", { ...jsonRequest("POST", { items: [{ variantId, quantity }], pickupAt: new Date(pickup).toISOString(), returnAt: new Date(returned).toISOString() }), signal: controller.signal }); if (!controller.signal.aborted) setQuote(result); }
    catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Estimate unavailable."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="min-h-screen bg-[#f7f5f1] text-[#302d31]"><CustomerHeader /><main className="mx-auto max-w-6xl px-5 py-12">
    <Link href="/marketplace" className="underline">Back to marketplace</Link>
    {error && <p role="alert" className="my-5 rounded-xl border bg-white p-4 text-red-700">{error}</p>}
    {!product ? <p role="status" className="mt-7">{error ? "Product unavailable." : "Loading outfit…"}</p> : <>
      <div className="mt-8 grid gap-9 md:grid-cols-2">
        <div><div className="aspect-[4/5] overflow-hidden rounded-2xl bg-[#eee7e5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image ? <img src={image} alt={product.name} className="size-full object-cover" /> : <p className="p-8">Image unavailable</p>}
        </div><div className="mt-4 flex flex-wrap gap-3">{product.images.map(safeProductImage).filter((src): src is string => !!src).map((src, index) => <button key={src} aria-label={"View image " + (index + 1)} aria-pressed={src === image} onClick={() => setImage(src)} className="rounded border px-4 py-2">View {index + 1}</button>)}</div></div>
        <section><p className="text-sm">{product.category} · {product.boutique.city}</p><h1 className="mt-3 font-serif text-4xl text-[#4c2544]">{product.name}</h1>
          <Link href={"/boutiques/" + product.boutique.id} className="mt-3 block underline">By {product.boutique.name}</Link>
          <p className="mt-5 text-2xl">{bookingMoney(variant?.rentalPriceMinor ?? product.rentalPriceMinor)} / {product.rentalPeriod}</p>
          <p className="mt-2 text-sm">Informational rental price. Collect and return at the shop. Rentique does not collect payments.</p>
          <p className="mt-5 whitespace-pre-line leading-7">{product.description}</p><p className="mt-3 text-sm">Fabric/style: {product.fabricStyle || "Ask the boutique"}</p>
          <p className="mt-3 text-sm">Included pieces: {product.includedPieces?.length ? product.includedPieces.join(", ") : "Not provided; confirm with the boutique."}</p>
          <p className="mt-3 text-sm">Garment measurements: {variant?.measurements || "Not provided; ask the boutique about fit."}</p>
          {!!product.colours?.length && <p className="mt-3 text-sm">Colours: {product.colours.join(", ")}</p>}
          {canReserve && <ReservationRequirements />}
          {bookingId ? <div role="status" className="mt-7 rounded-xl border bg-white p-5"><h2>Request sent; awaiting boutique confirmation.</h2><Link href={"/my-rentals#" + bookingId} className="mt-3 inline-block underline">Track your reservation</Link></div> : <form onSubmit={estimate} className="mt-7 space-y-4 rounded-xl border bg-white p-6">
            <h2 className="font-serif text-2xl">Plan your reservation</h2>
            <label className="block text-sm">Size<select value={variantId} onChange={event => { invalidate(); setVariantId(event.target.value); setQuantity(1); }} className="mt-2 block w-full rounded border p-3" required>{product.variants.map(variant => <option key={variant.id} value={variant.id} disabled={!variant.quantity}>{variant.size} · {variant.quantity} total pieces</option>)}</select></label>
            <label className="block text-sm">Quantity<input type="number" min={1} max={Math.min(10, variant?.quantity ?? 1)} value={quantity} onChange={event => { invalidate(); setQuantity(Number(event.target.value)); }} className="mt-2 block w-full rounded border p-3" required /></label>
            {!canReserve ? <p className="text-sm">{status === "authenticated" ? "Reservations are available through a customer account." : <Link href={"/login?callbackUrl=" + encodeURIComponent("/marketplace/" + productId)} className="underline">Sign in to add to your basket and request a reservation.</Link>}</p> : <>
              <button type="button" disabled={busy || !variantId || quantity < 1} onClick={() => void addToBasket()} className="w-full rounded-full border border-[#4c2544] p-3">Add to same-shop basket</button>
              {added && <p role="status">Added. <Link href="/basket" className="underline">View basket or add matching accessories.</Link></p>}
              <label className="block text-sm">Pickup date and time<input type="datetime-local" value={pickup} onChange={event => { invalidate(); setPickup(event.target.value); }} required className="mt-2 block w-full rounded border p-3" /></label>
              <label className="block text-sm">Return date and time<input type="datetime-local" value={returned} min={pickup} onChange={event => { invalidate(); setReturned(event.target.value); }} required className="mt-2 block w-full rounded border p-3" /></label>
              <p className="text-xs leading-6">Times use your device timezone. Request at least 24 hours ahead; rental duration up to 14 days. Availability is checked again when requesting.</p>
              <button disabled={busy || !variantId} className="w-full rounded-full bg-[#4c2544] p-3 text-white disabled:opacity-50">{busy ? "Checking…" : "Check dates and review estimate"}</button>
            </>}
          </form>}
        </section>
      </div>
      {quote && !bookingId && <ReservationReview key={quote.quoteId} quote={quote} onBooked={setBookingId} />}
      <section className="mt-10 rounded-xl border bg-white p-6"><h2 className="font-serif text-2xl">Visit {product.boutique.name}</h2><p className="mt-3">{product.boutique.address}, {product.boutique.city}, {product.boutique.state}</p><p className="mt-3 whitespace-pre-line">Hours: {product.boutique.openingHours || "Not provided; contact the boutique before visiting."}</p><p className="mt-3 whitespace-pre-line">Shop policy: {product.boutique.rentalPolicy || "Cancel before pickup. Confirm fit, included pieces, and counter arrangements with the boutique."}</p><p className="mt-3">{product.boutique.phone} · {product.boutique.contactEmail}</p><Link href={"/support?subject=" + encodeURIComponent(product.name)} className="mt-4 inline-block underline">Report a problem with this listing</Link></section>
      <section className="mt-10 rounded-xl border bg-white p-6"><h2 className="font-serif text-2xl">Verified rental reviews</h2>{reviewError ? <p className="mt-4">{reviewError}</p> : !reviews ? <p role="status" className="mt-4">Loading reviews…</p> : !reviews.items.length ? <p className="mt-4">No reviews yet.</p> : <><p className="mt-3">{reviews.ratingAverage} / 5 · {reviews.ratingCount} reviews</p>{reviews.items.map(review => <article className="mt-4 border-t pt-4" key={review.id}><p>{review.customerName} · {review.rating} / 5</p><p className="mt-2 whitespace-pre-line">{review.comment}</p></article>)}</>}</section>
    </>}
  </main><CustomerFooter /></div>;
}
