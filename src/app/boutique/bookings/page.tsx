import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingListing } from "@/features/boutiques/booking-management/booking-listing";
export const metadata: Metadata = { title: "Boutique bookings | Rentique" };
export default function Page() { return <Suspense fallback={<p role="status">Loading bookings...</p>}><BookingListing /></Suspense>; }
