import type { Metadata } from "next";
import { ApplicationStatusScreen } from "@/features/boutiques/onboarding/application-status";
import { OnboardingShell } from "@/features/boutiques/onboarding/onboarding-shell";

export const metadata: Metadata = { title: "Boutique application status | Rentique" };

// The account guard can redirect before this page renders, depending on the session.
// Allow this route to block rather than validate an instant UI it may never show.
export const instant = false;

export default function PendingPage() { return <OnboardingShell><ApplicationStatusScreen /></OnboardingShell>; }
