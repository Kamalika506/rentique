import { endpoint } from "@/lib/api";
import { products } from "@/features/admin/server";
export const GET = endpoint(products);
export const PATCH = endpoint(products);
