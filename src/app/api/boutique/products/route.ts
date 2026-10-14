import { endpoint } from "@/lib/api";
import { boutiqueProducts, saveProduct, archiveProduct } from "@/features/rentals/server";

export const GET = endpoint(boutiqueProducts);
export const POST = endpoint(saveProduct, 201);
export const PUT = endpoint(saveProduct);
export const PATCH = endpoint(archiveProduct);
