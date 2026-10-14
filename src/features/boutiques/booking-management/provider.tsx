"use client";
import { createContext, useContext, useState } from "react";
import { createDemoBookingService } from "../adapters/mock/bookings";
import type { BoutiqueBookingService } from "./service";
const Context = createContext<BoutiqueBookingService | null>(null);
export function BookingProvider({ children, service }: { children: React.ReactNode; service?: BoutiqueBookingService }) { const [demo] = useState(() => createDemoBookingService()); return <Context.Provider value={service ?? demo}>{children}</Context.Provider>; }
export function useBookingService() { const service = useContext(Context); if (!service) throw new Error("BookingProvider is required."); return service; }
