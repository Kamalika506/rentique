"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export interface CatalogProduct {
  id: string; name: string; description: string; category: string; collection: string; price: number; rentalPeriod: string; image: string; images: string[];
  rentalPriceMinor: number; depositMinor: number; rentalPriceUnit: "PER_DAY" | "PER_RENTAL";
  boutique: { id: string; name: string; city: string };
  variants: { id: string; size: string; quantity: number; rentalPriceMinor: number; depositMinor: number }[];
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
