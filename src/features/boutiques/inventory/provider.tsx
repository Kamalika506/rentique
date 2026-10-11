"use client";
import { createContext, useContext, useState } from "react";
import { createDemoProductService } from "../adapters/mock/products";
import type { BoutiqueProductService } from "./service";
const Context = createContext<BoutiqueProductService | null>(null);
export function ProductProvider({ children, service }: { children: React.ReactNode; service?: BoutiqueProductService }) {
  const [demo] = useState(() => createDemoProductService());
  return <Context.Provider value={service ?? demo}>{children}</Context.Provider>;
}
export function useProductService() { const service = useContext(Context); if (!service) throw new Error("ProductProvider is required."); return service; }
