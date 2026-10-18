import { endpoint } from "@/lib/api";
import { basket } from "@/features/rentals/customer-server";
export const GET = endpoint(basket);
export const POST = endpoint(basket);
export const DELETE = endpoint(basket);
