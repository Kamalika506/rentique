import type { Metadata } from "next";
import { BookingListing } from "@/features/boutiques/booking-management/booking-listing";
export const metadata: Metadata = { title: "Boutique bookings | Rentique" };
export default function Page() { return <BookingListing />; }
