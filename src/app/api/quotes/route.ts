import { endpoint } from "@/lib/api";
import { createQuote } from "@/features/rentals/customer-server";
export const POST = endpoint(createQuote, 201);
