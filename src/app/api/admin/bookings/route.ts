import { endpoint } from "@/lib/api";
import { bookings } from "@/features/admin/server";
export const GET = endpoint(bookings);
