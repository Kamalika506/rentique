"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { InspirationAttributes } from "./inspiration";

export function InspirationUpload({ onApply }: { onApply: (attributes: InspirationAttributes) => void }) {
  const [file, setFile] = useState<File | null>(null), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false);
  const [attributes, setAttributes] = useState<InspirationAttributes | null>(null), [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !consent || busy) return;
    if (file.size > 5 * 1024 * 1024) { setMessage("Choose an image under 5 MB."); return; }
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setBusy(true); setMessage(""); setAttributes(null);
    const form = new FormData(); form.set("image", file); form.set("consent", "true");
    try { const result = await api<{ attributes: InspirationAttributes; message: string }>("/api/inspiration", { method: "POST", body: form, signal: request.signal }); setAttributes(result.attributes); setMessage(result.message); }
    catch (error) { if (!request.signal.aborted) setMessage(error instanceof Error ? error.message : "Image styling unavailable."); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  return <section className="mt-8 rounded-2xl border border-[#e4dfd7] bg-white p-6">
    <h2 className="font-serif text-2xl text-[#4c2544]">Start with an inspiration image</h2>
    <p className="mt-2 text-sm leading-6">Extract outfit and colour suggestions, then match them to real boutique inventory. Dates, size, and budget are still required.</p>
    <form onSubmit={analyze} className="mt-4 space-y-4">
      <label className="block text-sm">Inspiration image (JPEG, PNG, WebP; up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setAttributes(null); setMessage(""); }} className="mt-2 block w-full rounded border p-3" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I have permission to use this image and agree to send it to Google Gemini for garment attribute analysis. Rentique does not store the image.</label>
      <button disabled={!file || !consent || busy} className="rounded-full border border-[#4c2544] px-5 py-2 text-[#4c2544] disabled:opacity-50">{busy ? "Reading garment attributes…" : "Analyze inspiration"}</button>
    </form>
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    {attributes && <div className="mt-5 rounded-xl bg-[#f7f5f1] p-4"><p>{attributes.explanation}</p><p className="mt-2 text-sm">Outfit: {attributes.outfitType} · Colour: {attributes.colourPreference} · Jewellery: {attributes.jewelleryPreference} · Confidence: {attributes.confidence}</p><button type="button" onClick={() => onApply(attributes)} className="mt-4 rounded-full bg-[#4c2544] px-5 py-2 text-white">Use these preferences, then review below</button></div>}
  </section>;
}
