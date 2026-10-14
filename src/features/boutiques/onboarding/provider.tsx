"use client";

import { createContext, useContext, useState } from "react";
import { createLiveOnboardingService } from "@/features/boutiques/adapters/live";
import type { BoutiqueOnboardingService } from "./service";

const ServiceContext = createContext<BoutiqueOnboardingService | null>(null);

export function OnboardingProvider({ children, service }: { children: React.ReactNode; service?: BoutiqueOnboardingService }) {
  const [live] = useState(() => createLiveOnboardingService());
  return <ServiceContext.Provider value={service ?? live}>{children}</ServiceContext.Provider>;
}

export function useOnboardingService() {
  const service = useContext(ServiceContext);
  if (!service) throw new Error("OnboardingProvider is required.");
  return service;
}
