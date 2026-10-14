import { endpoint } from "@/lib/api";
import { boutiques } from "@/features/admin/server";
export const GET = endpoint(boutiques);
export const PATCH = endpoint(boutiques);
