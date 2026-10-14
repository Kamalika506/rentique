"use client";
import { createContext, useContext, useState } from "react";
import { createLiveBookingService } from "@/features/boutiques/adapters/live";
import type { BoutiqueBookingService } from "./service";
const Context = createContext<BoutiqueBookingService | null>(null);
export function BookingProvider({ children, service }: { children: React.ReactNode; service?: BoutiqueBookingService }) { const [live] = useState(() => createLiveBookingService()); return <Context.Provider value={service ?? live}>{children}</Context.Provider>; }
export function useBookingService() { const service = useContext(Context); if (!service) throw new Error("BookingProvider is required."); return service; }
