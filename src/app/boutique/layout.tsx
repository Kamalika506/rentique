import { OnboardingProvider } from "@/features/boutiques/onboarding/provider";
import { ProductProvider } from "@/features/boutiques/inventory/provider";
import { BookingProvider } from "@/features/boutiques/booking-management/provider";

export default function BoutiqueLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider><ProductProvider><BookingProvider>{children}</BookingProvider></ProductProvider></OnboardingProvider>;
}
