
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "rentique-wishlist";

type WishlistContextValue = {
  productIds: string[];
  isLoaded: boolean;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (
          Array.isArray(parsed) &&
          parsed.every((id) => typeof id === "string")
        ) {
          setProductIds(parsed);
        }
      }
    } catch {
      // Start with an empty wishlist if stored data is invalid.
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
    } catch {
      // Keep the wishlist usable for the current session.
    }
  }, [productIds, isLoaded]);

  const toggleWishlist = useCallback((productId: string) => {
    setProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => productIds.includes(productId),
    [productIds],
  );

  const removeFromWishlist = useCallback((productId: string) => {
    setProductIds((current) => current.filter((id) => id !== productId));
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        productIds,
        isLoaded,
        toggleWishlist,
        isWishlisted,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return context;
}
