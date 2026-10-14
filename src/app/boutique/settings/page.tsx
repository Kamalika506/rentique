import type { Metadata } from "next";
import { BoutiqueSettingsForm } from "@/features/boutiques/storefront/boutique-settings";

export const metadata: Metadata = { title: "Boutique profile | Rentique" };
export default function SettingsPage() { return <BoutiqueSettingsForm />; }
