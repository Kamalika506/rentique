import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { auth } from "@/auth";
import { RegistrationForm } from "@/features/boutiques/onboarding/registration-form";
import { OnboardingShell } from "@/features/boutiques/onboarding/onboarding-shell";

export const metadata: Metadata = { title: "Become a boutique partner | Rentique", description: "Introduce your boutique to the Rentique collective." };
export default function RegisterPage() {
  return <OnboardingShell><Suspense fallback={<p role="status">Loading boutique registration...</p>}><RegistrationEntry /></Suspense></OnboardingShell>;
}

async function RegistrationEntry() {
  await connection();
  const session = await auth();
  if (session?.user) return <RegistrationForm />;
  return <section className="mx-auto max-w-lg rounded-3xl border border-[#e4dfd7] bg-[#fffdf9] p-8">
    <h1 className="font-serif text-4xl text-[#4c2544]">Register your boutique</h1>
    <p className="mt-4 text-sm leading-7 text-[#716971]">Create a boutique owner account to start your registration. Already have an account? Sign in to continue.</p>
    <div className="mt-6 flex flex-col gap-3">
      <Link href="/register?intent=boutique" className="rounded-full bg-[#4c2544] px-6 py-3 text-center text-sm font-medium text-white">Create boutique account</Link>
      <Link href="/login?intent=boutique" className="rounded-full border border-[#d7cec5] px-6 py-3 text-center text-sm font-medium text-[#4c2544]">Boutique sign in</Link>
    </div>
  </section>;
}
