import { endpoint } from "@/lib/api";
import { customerBookings, createBooking, cancelCustomerBooking } from "@/features/rentals/server";

export const GET = endpoint(customerBookings);
export const POST = endpoint(createBooking, 201);
export const PATCH = endpoint(cancelCustomerBooking);
