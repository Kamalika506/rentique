import { OnboardingProvider } from "@/features/boutiques/onboarding/provider";
import { ProductProvider } from "@/features/boutiques/inventory/provider";
import { BookingProvider } from "@/features/boutiques/booking-management/provider";
import { Suspense } from "react";

export default function BoutiqueLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="p-8" role="status">Loading boutique workspace…</main>}><OnboardingProvider><ProductProvider><BookingProvider>{children}</BookingProvider></ProductProvider></OnboardingProvider></Suspense>;
}
