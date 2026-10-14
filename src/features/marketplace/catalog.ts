"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export interface CatalogProduct {
  id: string; name: string; description: string; category: string; collection: string; price: number; rentalPeriod: string; image: string; images: string[];
  categoryId?: string | null; categorySlug?: string | null; occasionTags?: string[]; colours?: string[];
  ratingAverage?: number | null; ratingCount?: number;
  rentalPriceMinor: number; depositMinor: number; rentalPriceUnit: "PER_DAY" | "PER_RENTAL";
  boutique: { id: string; name: string; city: string; state?: string; address?: string; phone?: string; contactEmail?: string; description?: string; socialLink?: string };
  variants: { id: string; size: string; quantity: number; rentalPriceMinor: number; depositMinor: number }[];
}
export interface CatalogPage {
  items: CatalogProduct[]; total: number; page: number; pageSize: number; totalPages: number;
  facets: { occasions: string[]; colours: string[]; sizes: string[] };
}
export function safeProductImage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : undefined; } catch { return undefined; }
}
export function useCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = () => api<CatalogProduct[]>("/api/products").then(data => { if (active) { setProducts(data); setError(""); setLoading(false); } }).catch(error => { if (active) { setError(error.message); setLoading(false); } });
    void load(); window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("focus", load); };
  }, []);
  return { products, loading, error };
}
