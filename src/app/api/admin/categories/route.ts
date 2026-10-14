import { endpoint } from "@/lib/api";
import { categories } from "@/features/admin/server";
export const GET = endpoint(categories);
export const POST = endpoint(categories, 201);
export const PATCH = endpoint(categories);
