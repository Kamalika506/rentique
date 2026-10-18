"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import type { CatalogPage } from "@/features/marketplace/catalog";
import { ProductCard } from "@/features/marketplace/product-card";
import { api } from "@/lib/api-client";
import { dateTimeInputValue } from "@/features/rentals/dates";

type Category = { id: string; slug: string; name: string; legacyKey: string | null; isActive: boolean };
const inputClass = "mt-2 h-12 w-full rounded-xl border border-[#d9d1c9] bg-white px-3 text-sm outline-none focus:border-[#4c2544]";

export default function MarketplacePage() {
  return <Suspense fallback={<main className="p-8" role="status">Loading marketplace…</main>}><Marketplace /></Suspense>;
}

function Marketplace() {
  const params = useSearchParams(), router = useRouter();
  const query = params.toString();
  const [response, setResponse] = useState<{ query: string; catalog: CatalogPage | null; error: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const [filterError, setFilterError] = useState("");
  const loading = response?.query !== query;
  const catalog = loading ? null : response?.catalog;
  const error = loading ? "" : response?.error;
  useEffect(() => {
    const controller = new AbortController();
    const next = new URLSearchParams(query); next.set("paged", "1"); next.set("pageSize", "12");
    api<CatalogPage>(`/api/products?${next}`, { signal: controller.signal }).then(catalog => { if (!controller.signal.aborted) setResponse({ query, catalog, error: "" }); }).catch(error => { if (!controller.signal.aborted) setResponse({ query, catalog: null, error: error instanceof Error ? error.message : "Products could not be loaded." }); });
    return () => controller.abort();
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    api<Category[]>("/api/categories", { signal: controller.signal }).then(items => setCategories(items.filter(item => item.isActive))).catch(error => { if (!controller.signal.aborted) setCategoryError(error instanceof Error ? error.message : "Categories unavailable."); });
    return () => controller.abort();
  }, []);
  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget), next = new URLSearchParams();
    setFilterError("");
    for (const [key, value] of data.entries()) if (typeof value === "string" && value.trim() && !["pickupAt", "returnAt"].includes(key)) next.set(key, value.trim());
    const pickup = String(data.get("pickupAt") ?? ""), returned = String(data.get("returnAt") ?? "");
    if (Boolean(pickup) !== Boolean(returned) || (pickup && Date.parse(returned) <= Date.parse(pickup))) { setFilterError("Choose both dates, with return after pickup."); return; }
    if (pickup) { next.set("pickupAt", new Date(pickup).toISOString()); next.set("returnAt", new Date(returned).toISOString()); }
    const boutiqueId = params.get("boutiqueId"); if (boutiqueId) next.set("boutiqueId", boutiqueId);
    next.set("page", "1"); router.push(`/marketplace?${next}`, { scroll: false });
  }
  function pageLink(page: number) { const next = new URLSearchParams(query); next.set("page", String(page)); return `/marketplace?${next}`; }
  const facets = catalog?.facets ?? { occasions: [], colours: [], sizes: [] };
  function choices(values: string[], current: string) { return [...new Set([...values, ...(current ? [current] : [])])]; }
  const currentCategory = params.get("category") ?? "";
  return <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
    <CustomerHeader />
    <main className="flex-1">
      <section className="border-b border-[#e4dfd7] bg-[#eee7e5]"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8"><p className="text-xs uppercase tracking-[0.18em] text-[#927c59]">The Rentique collection</p><h1 className="mt-3 font-serif text-4xl text-[#4c2544] sm:text-5xl">Find your next favourite look.</h1><p className="mt-4 max-w-2xl text-[#716971]">Browse approved boutiques and find a style for your occasion, size and budget.</p><Link href="/styling" className="mt-5 inline-block font-medium text-[#4c2544] underline underline-offset-4">Find a look with occasion styling</Link></div></section>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <form key={query} onSubmit={applyFilters} className="grid gap-4 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">Boutique city<input name="city" maxLength={120} defaultValue={params.get("city") ?? ""} placeholder="e.g. Pune" className={inputClass} /></label>
          <label className="text-sm font-medium">Garment type<select name="garmentType" defaultValue={params.get("garmentType") ?? ""} className={inputClass}><option value="">All types</option>{["saree", "lehenga", "gown", "suit", "dress", "jewellery", "accessory"].map(type => <option key={type}>{type}</option>)}</select></label>
          <label className="text-sm font-medium">Pickup date and time<input name="pickupAt" type="datetime-local" defaultValue={dateTimeInputValue(params.get("pickupAt"))} className={inputClass} /></label>
          <label className="text-sm font-medium">Return date and time<input name="returnAt" type="datetime-local" defaultValue={dateTimeInputValue(params.get("returnAt"))} className={inputClass} /></label>
          {filterError && <p role="alert" className="text-red-700 sm:col-span-2 lg:col-span-4">{filterError}</p>}
          <label className="text-sm font-medium">Search styles<input name="search" type="search" defaultValue={params.get("search") ?? ""} placeholder="Name, fabric or boutique" className={inputClass} /></label>
          <label className="text-sm font-medium">Category<select name="category" defaultValue={currentCategory} className={inputClass}><option value="">All categories</option>{currentCategory && !categories.some(item => [item.id, item.slug, item.name, item.legacyKey].includes(currentCategory)) && <option value={currentCategory}>{currentCategory.replaceAll("_", " ")}</option>}{categories.map(item => <option key={item.id} value={[item.id, item.slug, item.name, item.legacyKey].includes(currentCategory) ? currentCategory : item.slug}>{item.name}</option>)}</select></label>
          <label className="text-sm font-medium">Occasion<select name="occasion" defaultValue={params.get("occasion") ?? ""} className={inputClass}><option value="">All occasions</option>{choices(facets.occasions, params.get("occasion") ?? "").map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-sm font-medium">Colour<select name="colour" defaultValue={params.get("colour") ?? ""} className={inputClass}><option value="">All colours</option>{choices(facets.colours, params.get("colour") ?? "").map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-sm font-medium">Size<select name="size" defaultValue={params.get("size") ?? ""} className={inputClass}><option value="">All sizes</option>{choices(facets.sizes, params.get("size") ?? "").map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label className="text-sm font-medium">Minimum rental price (₹)<input name="minPrice" type="number" min="0" step="0.01" defaultValue={params.get("minPrice") ?? ""} placeholder="Any" className={inputClass} /></label>
          <label className="text-sm font-medium">Maximum rental price (₹)<input name="maxPrice" type="number" min="0" step="0.01" defaultValue={params.get("maxPrice") ?? ""} placeholder="Any" className={inputClass} /></label>
          <label className="text-sm font-medium">Sort by<select name="sort" defaultValue={params.get("sort") ?? "recommended"} className={inputClass}><option value="recommended">Newest listings</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A to Z</option></select></label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4"><button type="submit" className="rounded-full bg-[#4c2544] px-6 py-3 text-sm font-medium text-white">Apply filters</button><Link href="/marketplace" className="text-sm text-[#4c2544] underline">Clear filters</Link><p className="text-xs text-[#716971]">Price filters use the listing rate. Select dates for a full rental quote.</p></div>
          {categoryError && <p role="status" className="text-sm text-[#716971] sm:col-span-2 lg:col-span-4">Category filters could not be loaded. Search and other filters remain available.</p>}
        </form>
        <div className="mb-6 mt-8"><h2 className="font-serif text-2xl text-[#4c2544]">Explore the collection</h2><p className="mt-2 text-sm text-[#716971]" aria-live="polite">{loading ? "Loading styles…" : `${catalog?.total ?? 0} styles found`}</p></div>
        {error ? <p role="alert" className="rounded-xl border bg-white p-5">{error}</p> : loading ? <p role="status">Loading boutique collections…</p> : catalog?.items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{catalog.items.map(product => <ProductCard key={product.id} product={product} rentalDates={params.get("pickupAt") && params.get("returnAt") ? { pickupAt: params.get("pickupAt")!, returnAt: params.get("returnAt")! } : undefined} />)}</div> : <div className="rounded-2xl border border-dashed border-[#d9d1c9] bg-[#fffdf9] p-12 text-center"><Search size={28} className="mx-auto text-[#927c59]" /><h3 className="mt-4 font-serif text-2xl text-[#4c2544]">No styles found</h3><p className="mt-2 text-sm text-[#716971]">Try another occasion, size, category or price range.</p><Link href="/marketplace" className="mt-5 inline-block text-[#4c2544] underline">Clear filters</Link></div>}
        {!loading && !error && catalog && catalog.totalPages > 1 && <nav aria-label="Product pages" className="mt-8 flex items-center justify-center gap-5">{catalog.page > 1 ? <Link href={pageLink(catalog.page - 1)} className="rounded-full border px-5 py-2">Previous</Link> : <span className="px-5 py-2 text-[#aaa]">Previous</span>}<p className="text-sm">Page {catalog.page} of {catalog.totalPages}</p>{catalog.page < catalog.totalPages ? <Link href={pageLink(catalog.page + 1)} className="rounded-full border px-5 py-2">Next</Link> : <span className="px-5 py-2 text-[#aaa]">Next</span>}</nav>}
      </section>
    </main><CustomerFooter />
  </div>;
}
