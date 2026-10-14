"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { api, HttpError, jsonRequest } from "@/lib/api-client";

type WishlistContextValue = {
  productIds: string[];
  isLoaded: boolean;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
};
const WishlistContext = createContext<WishlistContextValue | null>(null);
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([]), [isLoaded, setIsLoaded] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => api<string[]>("/api/wishlist").then(ids => { if (active) { setProductIds(ids); setIsLoaded(true); } }).catch(() => { if (active) { setProductIds([]); setIsLoaded(true); } });
    void load(); window.addEventListener("focus", load); window.addEventListener("rentique:session-change", load);
    return () => { active = false; window.removeEventListener("focus", load); window.removeEventListener("rentique:session-change", load); };
  }, []);
  const change = useCallback(async (productId: string, method: string) => {
    setError("");
    try { setProductIds(await api<string[]>("/api/wishlist", jsonRequest(method, { productId }))); }
    catch (error) {
      if (error instanceof HttpError && error.status === 401) setError("Sign in to save your wishlist.");
      else setError(error instanceof Error ? error.message : "Wishlist could not be updated.");
    }
  }, []);
  const toggleWishlist = useCallback((id: string) => { void change(id, productIds.includes(id) ? "DELETE" : "POST"); }, [change, productIds]);
  const removeFromWishlist = useCallback((id: string) => { void change(id, "DELETE"); }, [change]);
  const isWishlisted = useCallback((id: string) => productIds.includes(id), [productIds]);
  return <WishlistContext.Provider value={{ productIds, isLoaded, toggleWishlist, removeFromWishlist, isWishlisted }}>{children}
    {error && <div role="alert" className="fixed bottom-5 left-5 right-5 z-50 rounded-xl border bg-white p-4 shadow">{error} <Link className="ml-3 underline" href="/login">Sign in</Link><button onClick={() => setError("")} className="ml-3 underline">Dismiss</button></div>}
  </WishlistContext.Provider>;
}
export function useWishlist() { const context = useContext(WishlistContext); if (!context) throw new Error("WishlistProvider is required."); return context; }
