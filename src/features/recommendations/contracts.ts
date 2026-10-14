import { z } from "zod";

const text = z.string().trim().min(1).max(100);
export const recommendationInputSchema = z.strictObject({
  occasion: z.enum(["wedding", "reception", "party", "festive", "formal", "casual"]),
  totalRentalBudget: z.number().positive().max(10000000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Use at most two decimal places (INR)."),
  outfitType: z.enum(["any", "saree", "lehenga", "gown", "suit", "dress"]),
  colourPreference: text,
  jewelleryPreference: z.enum(["none", "any", "gold", "silver"]),
  lookMode: z.enum(["outfit", "complete-look"]).default("outfit"),
  city: text.optional(),
  rentalDates: z.strictObject({ start: z.iso.date(), end: z.iso.date() }).refine((dates) => dates.start < dates.end, "Return date must follow pickup date.").optional(),
});
export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export const stylingPreferencesSchema = z.strictObject({
  styleTags: z.array(z.enum(["traditional", "minimal", "festive", "formal", "contemporary"])).min(1).max(5),
});
export type StylingPreferences = z.infer<typeof stylingPreferencesSchema>;
export const fallbackReasonSchema = z.enum(["missing_key", "api_failure", "invalid_response", "timeout", "inventory_unavailable"]).nullable();
const minor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const recommendedProductSchema = z.strictObject({
  id: text, name: text, boutiqueId: text, boutiqueName: text,
  kind: z.enum(["outfit", "jewellery"]), rentalMinor: minor,
});
export const recommendationResponseSchema = z.strictObject({
  status: z.enum(["OK", "NO_MATCHES", "DATES_REQUIRED", "INVENTORY_UNAVAILABLE"]),
  source: z.enum(["gemini", "rules"]), fallbackReason: fallbackReasonSchema,
  currency: z.literal("INR"), budgetMinor: minor, preferences: stylingPreferencesSchema,
  looks: z.array(z.strictObject({ products: z.array(recommendedProductSchema).min(1).max(2), totalRentalMinor: minor })).max(5),
  message: z.string(),
});
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;

/** Adapter maps shared models; this DTO is not a new database model. Prices are full-period quotes. */
export interface InventoryCandidate {
  id: string; name: string; boutiqueId: string; boutiqueName: string;
  boutiqueStatus: "APPROVED" | "PENDING" | "REJECTED";
  archived: boolean; kind: "outfit" | "jewellery"; outfitType: string;
  colours: string[]; jewelleryType: string; city: string; occasionTags: string[]; styleTags: string[];
  rentalMinor: number;
  availability: { status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN"; availableUnits: number; start: string; end: string; checkedAt: string };
}
export interface RecommendationInventoryAdapter {
  /** Must search real approved public inventory and verify availability server-side, with bounded execution. */
  search(input: RecommendationInput, signal: AbortSignal): Promise<InventoryCandidate[]>;
}
export const inventoryCandidateSchema = z.object({
  id: text, name: text, boutiqueId: text, boutiqueName: text,
  boutiqueStatus: z.enum(["APPROVED", "PENDING", "REJECTED"]), archived: z.boolean(), kind: z.enum(["outfit", "jewellery"]),
  outfitType: text, colours: z.array(text), jewelleryType: text, city: text, occasionTags: z.array(text), styleTags: z.array(text),
  rentalMinor: minor,
  availability: z.object({ status: z.enum(["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]), availableUnits: z.number().int().nonnegative(), start: z.iso.date(), end: z.iso.date(), checkedAt: z.iso.datetime({ offset: true }) }),
});
export interface StylingPreferenceProvider {
  generate(input: RecommendationInput, signal: AbortSignal): Promise<unknown>;
}
