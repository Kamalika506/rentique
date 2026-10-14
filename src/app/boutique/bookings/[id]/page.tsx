import { Suspense } from "react";
import { BookingDetails } from "@/features/boutiques/booking-management/booking-details";
export default function Page() { return <Suspense fallback={<p role="status">Loading booking…</p>}><BookingDetails /></Suspense>; }
