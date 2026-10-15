import type { Metadata } from "next";
import { RegistrationForm } from "@/features/boutiques/onboarding/registration-form";
import { OnboardingShell } from "@/features/boutiques/onboarding/onboarding-shell";

export const metadata: Metadata = { title: "Become a boutique partner | Rentique", description: "Introduce your boutique to the Rentique collective." };
export default function RegisterPage() {
  return <OnboardingShell><RegistrationForm /></OnboardingShell>;
}
