import { endpoint } from "@/lib/api";
import { listCategories } from "@/features/admin/categories";

export const GET = endpoint(() => listCategories());
