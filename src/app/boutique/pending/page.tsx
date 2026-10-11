import type { Metadata } from "next";
import { ApplicationStatusScreen } from "@/features/boutiques/onboarding/application-status";
import { OnboardingShell } from "@/features/boutiques/onboarding/onboarding-shell";

export const metadata: Metadata = { title: "Boutique application status | Rentique" };
export default function PendingPage() { return <OnboardingShell><ApplicationStatusScreen /></OnboardingShell>; }
