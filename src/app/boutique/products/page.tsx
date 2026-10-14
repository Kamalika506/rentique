import type { Metadata } from "next";
import { ProductListing } from "@/features/boutiques/inventory/product-listing";
export const metadata: Metadata = { title: "Boutique products | Rentique" };
export default function ProductsPage() { return <ProductListing />; }
