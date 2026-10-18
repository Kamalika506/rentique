"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Mail, Phone } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api } from "@/lib/api-client";
import type { CatalogProduct } from "@/features/marketplace/catalog";
import { ProductCard } from "@/features/marketplace/product-card";
import type { PublicBoutique } from "./schema";

interface ProductPage { items: CatalogProduct[]; total: number; page: number; totalPages: number }
export function BoutiqueStorefront({ id }: { id: string }) {
  const [boutique, setBoutique] = useState<PublicBoutique | null>(null), [products, setProducts] = useState<ProductPage | null>(null);
  const [page, setPage] = useState(1), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => { if (!controller.signal.aborted) { setLoading(true); setError(""); } });
    const params = new URLSearchParams({ paged: "1", boutiqueId: id, page: String(page), pageSize: "12" });
    Promise.all([api<PublicBoutique>(`/api/boutiques/${encodeURIComponent(id)}`, { signal: controller.signal }), api<ProductPage>(`/api/products?${params}`, { signal: controller.signal })])
      .then(([profile, collection]) => { setBoutique(profile); setProducts(collection); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, page]);
  const socialLink = boutique?.socialLink && /^https?:\/\//i.test(boutique.socialLink) ? boutique.socialLink : null;
  return <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
    <CustomerHeader />
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8">
      <Link href="/boutiques" className="text-sm text-[#4c2544] underline underline-offset-4">← All boutiques</Link>
      {error ? <p role="alert" className="mt-8 text-red-700">{error}</p> : boutique ? <>
        <section className="mt-7 grid gap-8 rounded-3xl border border-[#e4dfd7] bg-[#fffdf9] p-6 sm:p-9 lg:grid-cols-[1.5fr_1fr]">
          <div><p className="text-xs uppercase tracking-[0.18em] text-[#927c59]">Approved rental boutique</p><h1 className="mt-3 font-serif text-4xl text-[#4c2544]">{boutique.name}</h1><p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#716971]">{boutique.description}</p><p className="mt-5 text-xs text-[#927c59]">{boutique.categories.join(" · ")}</p></div>
          <div className="space-y-4 text-sm text-[#716971]"><p className="flex gap-3"><MapPin size={19} className="shrink-0 text-[#927c59]" /><span>{boutique.address}<br />{boutique.city}, {boutique.state} {boutique.postalCode}</span></p><p className="flex items-center gap-3"><Phone size={18} className="text-[#927c59]" /><a href={`tel:${boutique.phone.replace(/[^+\d]/g, "")}`} className="underline underline-offset-4">{boutique.phone}</a></p><p className="flex items-center gap-3"><Mail size={18} className="text-[#927c59]" /><a href={`mailto:${boutique.contactEmail}`} className="break-all underline underline-offset-4">{boutique.contactEmail}</a></p>{socialLink && <a href={socialLink} target="_blank" rel="noopener noreferrer" className="inline-block text-[#4c2544] underline underline-offset-4">Visit boutique website or social page ↗</a>}</div>
        </section>
        <section className="mt-6 grid gap-5 rounded-2xl border bg-white p-6 sm:grid-cols-2"><div><h2 className="font-medium">Shop hours</h2><p className="mt-3 whitespace-pre-line text-sm">{boutique.openingHours || "Contact the boutique before visiting."}</p></div><div><h2 className="font-medium">Shop rental policy</h2><p className="mt-3 whitespace-pre-line text-sm">{boutique.rentalPolicy || "Confirm fit and included pieces with the shop. Cancel before collection."}</p></div></section>
        <section className="mt-10"><h2 className="font-serif text-3xl text-[#4c2544]">The collection</h2><p className="mt-2 text-sm text-[#716971]">{products?.total ?? 0} styles · View each outfit for sizes, included pieces, and rental dates.</p>{loading ? <p className="mt-6" role="status">Loading collection…</p> : products?.items.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-6 rounded-xl border border-dashed border-[#d9d1c9] p-10 text-center text-[#716971]">New styles are coming soon.</p>}</section>
        {products && products.totalPages > 1 && <nav aria-label="Collection pages" className="mt-8 flex items-center justify-center gap-5"><button disabled={loading || page === 1} onClick={() => setPage(page - 1)} className="rounded-full border border-[#d9d1c9] px-5 py-2 disabled:opacity-50">Previous</button><span className="text-sm">Page {page} of {products.totalPages}</span><button disabled={loading || page >= products.totalPages} onClick={() => setPage(page + 1)} className="rounded-full border border-[#d9d1c9] px-5 py-2 disabled:opacity-50">Next</button></nav>}
      </> : loading && <p role="status" className="mt-8">Loading boutique…</p>}
    </main>
    <CustomerFooter />
  </div>;
}
