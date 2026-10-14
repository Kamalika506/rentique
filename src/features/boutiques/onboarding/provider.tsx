"use client";

import { createContext, useContext, useState } from "react";
import { createDemoOnboardingService } from "../adapters/mock/onboarding";
import type { BoutiqueOnboardingService } from "./service";

const ServiceContext = createContext<BoutiqueOnboardingService | null>(null);

export function OnboardingProvider({ children, service }: { children: React.ReactNode; service?: BoutiqueOnboardingService }) {
  const [demo] = useState(() => createDemoOnboardingService());
  return <ServiceContext.Provider value={service ?? demo}>{children}</ServiceContext.Provider>;
}

export function useOnboardingService() {
  const service = useContext(ServiceContext);
  if (!service) throw new Error("OnboardingProvider is required.");
  return service;
}
