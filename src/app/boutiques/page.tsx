"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Store } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api } from "@/lib/api-client";
import type { PublicBoutique } from "@/features/boutiques/storefront/schema";

interface BoutiquePage { items: PublicBoutique[]; total: number; page: number; totalPages: number }
export default function BoutiquesPage() {
  const [query, setQuery] = useState(""), [city, setCity] = useState(""), [page, setPage] = useState(1);
  const [result, setResult] = useState<BoutiquePage | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ q: query, city, page: String(page), pageSize: "12" });
      api<BoutiquePage>(`/api/boutiques?${params}`, { signal: controller.signal }).then(setResult).catch((cause) => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, city, page]);
  return <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
    <CustomerHeader />
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 sm:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#927c59]">Rentique boutiques</p>
      <h1 className="mt-3 font-serif text-4xl text-[#4c2544]">Find a boutique for your next occasion.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#716971]">Explore approved rental boutiques, discover their collections, and choose your rental dates.</p>
      <div className="mt-8 grid gap-4 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Search boutiques<input type="search" maxLength={120} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Name, city, or collection" className="h-12 rounded-xl border border-[#d9d1c9] bg-white px-3" /></label>
        <label className="grid gap-2 text-sm">City<input type="search" maxLength={120} value={city} onChange={(event) => { setCity(event.target.value); setPage(1); }} placeholder="Any city" className="h-12 rounded-xl border border-[#d9d1c9] bg-white px-3" /></label>
      </div>
      <div className="mt-8" aria-live="polite">
        {loading ? <p role="status">Loading boutiques…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : !result?.items.length ? <p className="rounded-xl border border-dashed border-[#d9d1c9] p-10 text-center text-[#716971]">No boutiques match your search.</p> : <>
          <p className="mb-5 text-sm text-[#716971]">{result.total} {result.total === 1 ? "boutique" : "boutiques"}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.items.map((boutique) => <Link key={boutique.id} href={`/boutiques/${encodeURIComponent(boutique.id)}`} className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-6 transition hover:shadow-md">
            <Store className="text-[#927c59]" size={28} /><h2 className="mt-4 font-serif text-2xl text-[#4c2544]">{boutique.name}</h2>
            <p className="mt-2 flex items-center gap-1 text-sm text-[#716971]"><MapPin size={15} />{boutique.city}, {boutique.state}</p>
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#716971]">{boutique.description}</p>
            <p className="mt-4 text-xs text-[#927c59]">{boutique.categories.join(" · ")}</p><p className="mt-5 text-sm font-medium text-[#4c2544]">Explore {boutique.productCount} {boutique.productCount === 1 ? "style" : "styles"} →</p>
          </Link>)}</div>
        </>}
      </div>
      {result && result.totalPages > 1 && <nav aria-label="Boutique pages" className="mt-8 flex items-center justify-center gap-5"><button disabled={loading || page === 1} onClick={() => setPage(page - 1)} className="rounded-full border border-[#d9d1c9] px-5 py-2 disabled:opacity-50">Previous</button><span className="text-sm">Page {page} of {result.totalPages}</span><button disabled={loading || page >= result.totalPages} onClick={() => setPage(page + 1)} className="rounded-full border border-[#d9d1c9] px-5 py-2 disabled:opacity-50">Next</button></nav>}
    </main>
    <CustomerFooter />
  </div>;
}
