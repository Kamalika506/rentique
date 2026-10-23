import { endpoint } from "@/lib/api";
import { boutiqueInventoryUnits, updateBoutiqueInventoryUnit } from "@/features/rentals/boutique-units";

export const GET = endpoint(boutiqueInventoryUnits);
export const POST = endpoint(updateBoutiqueInventoryUnit, 201);
export const PATCH = endpoint(updateBoutiqueInventoryUnit);
