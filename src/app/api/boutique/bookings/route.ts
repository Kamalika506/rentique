import { endpoint } from "@/lib/api";
import { boutiqueBookings, updateBooking } from "@/features/rentals/server";

export const GET = endpoint(boutiqueBookings);
export const PATCH = endpoint(updateBooking);
