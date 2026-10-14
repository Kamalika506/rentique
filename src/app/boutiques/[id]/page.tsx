import { Suspense } from "react";
import type { Metadata } from "next";
import { BoutiqueStorefront } from "@/features/boutiques/storefront/boutique-storefront";

export const metadata: Metadata = { title: "Boutique storefront | Rentique" };

async function StorefrontContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoutiqueStorefront id={id} />;
}

export default function BoutiquePage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="p-8" role="status">Loading boutique…</main>}><StorefrontContent params={params} /></Suspense>;
}
