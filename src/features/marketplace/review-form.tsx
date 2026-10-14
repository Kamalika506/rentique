"use client";
import { useState } from "react";
import { api, jsonRequest } from "@/lib/api-client";

export function ReviewForm({ bookingId, products, onSaved }: { bookingId: string; products: { id: string; name: string }[]; onSaved: () => void }) {
  const [productId, setProductId] = useState(products[0]?.id ?? ""), [rating, setRating] = useState(5), [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save(event: React.FormEvent) { event.preventDefault(); if (busy) return; setBusy(true); setError(""); try { await api("/api/reviews", jsonRequest("POST", { bookingId, productId, rating, comment })); onSaved(); } catch (error) { setError(error instanceof Error ? error.message : "Review could not be submitted."); } finally { setBusy(false); } }
  return <form onSubmit={save} className="mt-5 space-y-3 rounded-xl bg-[#f7f5f1] p-4"><h3 className="font-medium">Review your rental</h3>
    <label className="block text-sm">Product<select value={productId} onChange={event => setProductId(event.target.value)} className="ml-3 rounded border p-2">{products.map(product => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
    <label className="block text-sm">Rating<select value={rating} onChange={event => setRating(Number(event.target.value))} className="ml-3 rounded border p-2">{[5, 4, 3, 2, 1].map(value => <option value={value} key={value}>{value} {value === 1 ? "star" : "stars"}</option>)}</select></label>
    <label className="block text-sm">Your experience<textarea value={comment} maxLength={2000} onChange={event => setComment(event.target.value)} className="mt-2 block w-full rounded border p-3" rows={3} /></label>
    {error && <p role="alert">{error}</p>}<button disabled={busy} className="rounded-full bg-[#4c2544] px-5 py-2 text-white">{busy ? "Submitting..." : "Submit review"}</button>
  </form>;
}
