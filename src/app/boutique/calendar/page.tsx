import type { Metadata } from "next";
import { BookingWorkspace } from "@/features/boutiques/booking-management/workspace";
import { RentalCalendar } from "@/features/boutiques/rental-calendar/rental-calendar";
export const metadata: Metadata = { title: "Rental calendar | Rentique" };
export default function Page() { return <BookingWorkspace calendar><RentalCalendar /></BookingWorkspace>; }
