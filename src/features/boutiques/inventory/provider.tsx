"use client";
import { createContext, useContext, useState } from "react";
import { createLiveProductService } from "@/features/boutiques/adapters/live";
import type { BoutiqueProductService } from "./service";
const Context = createContext<BoutiqueProductService | null>(null);
export function ProductProvider({ children, service }: { children: React.ReactNode; service?: BoutiqueProductService }) {
  const [live] = useState(() => createLiveProductService());
  return <Context.Provider value={service ?? live}>{children}</Context.Provider>;
}
export function useProductService() { const service = useContext(Context); if (!service) throw new Error("ProductProvider is required."); return service; }
