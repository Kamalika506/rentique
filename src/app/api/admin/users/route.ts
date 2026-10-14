import { endpoint } from "@/lib/api";
import { users } from "@/features/admin/server";
export const GET = endpoint(users);
export const PATCH = endpoint(users);
