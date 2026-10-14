import { endpoint } from "@/lib/api";
import { reviews } from "@/features/admin/server";
export const GET = endpoint(reviews);
export const PATCH = endpoint(reviews);
