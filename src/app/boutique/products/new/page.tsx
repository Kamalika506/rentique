import type { Metadata } from "next";
import { ProductEditor } from "@/features/boutiques/inventory/product-editor";
export const metadata: Metadata = { title: "Add product | Rentique" };
export default function NewProductPage() { return <ProductEditor />; }
