import { Suspense } from "react";
import type { Metadata } from "next";
import { EditProductRoute } from "@/features/boutiques/inventory/product-editor";
export const metadata: Metadata = { title: "Edit product | Rentique" };
export default function EditProductPage() { return <Suspense fallback={<p role="status">Loading product…</p>}><EditProductRoute /></Suspense>; }
