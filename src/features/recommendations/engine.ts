import { recommendationInputSchema, recommendationResponseSchema, stylingPreferencesSchema, type InventoryCandidate, type RecommendationInput, type RecommendationInventoryAdapter, type RecommendationResponse, type StylingPreferenceProvider, type StylingPreferences } from "./contracts";
import { inventoryCandidateSchema } from "./contracts";

export class PreferenceError extends Error {
  constructor(public reason: "api_failure" | "invalid_response") { super(reason); }
}
export function rulePreferences(input: RecommendationInput): StylingPreferences {
  const tags: Record<RecommendationInput["occasion"], StylingPreferences["styleTags"]> = {
    wedding: ["traditional", "festive"], reception: ["formal", "contemporary"], party: ["contemporary"],
    festive: ["traditional", "festive"], formal: ["formal", "minimal"], casual: ["minimal"],
  };
  return { styleTags: tags[input.occasion] };
}
async function bounded<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve().then(() => task(controller.signal)), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}
const normalized = (text: string) => text.trim().toLowerCase();
function eligible(product: InventoryCandidate, input: RecommendationInput, now: number): boolean {
  const availability = product.availability;
  const checkedAt = Date.parse(availability?.checkedAt);
  return !!input.rentalDates && product.boutiqueStatus === "APPROVED" && product.archived === false
    && typeof product.id === "string" && !!product.id && typeof product.boutiqueId === "string" && !!product.boutiqueId
    && Number.isSafeInteger(product.rentalMinor) && product.rentalMinor >= 0 && product.rentalMinor <= Math.round(input.totalRentalBudget * 100)
    && availability?.status === "AVAILABLE" && Number.isSafeInteger(availability.availableUnits) && availability.availableUnits > 0
    && availability.start === input.rentalDates.start && availability.end === input.rentalDates.end
    && checkedAt <= now && now - checkedAt <= 60000
    && (!input.city || normalized(product.city) === normalized(input.city))
    && product.occasionTags.some((occasion) => normalized(occasion) === input.occasion)
    && (product.kind === "outfit" ? (!input.size || Boolean(product.availableSizes?.some(size => normalized(size) === normalized(input.size!)))) && (input.outfitType === "any" || normalized(product.outfitType) === input.outfitType)
      && (normalized(input.colourPreference) === "any" || product.colours.some((colour) => normalized(colour) === normalized(input.colourPreference)))
      : product.kind === "jewellery" && input.jewelleryPreference !== "none" && (input.jewelleryPreference === "any" || normalized(product.jewelleryType) === input.jewelleryPreference));
}
export function selectLooks(products: InventoryCandidate[], input: RecommendationInput, preferences: StylingPreferences, now: number): RecommendationResponse["looks"] {
  const budget = Math.round(input.totalRentalBudget * 100);
  const seen = new Set<string>();
  const candidates = products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id); return eligible(product, input, now);
  });
  const score = (product: InventoryCandidate) => preferences.styleTags.filter((tag) => product.styleTags.includes(tag)).length;
  const order = (a: InventoryCandidate, b: InventoryCandidate) => score(b) - score(a) || a.rentalMinor - b.rentalMinor || a.id.localeCompare(b.id);
  const outfits = candidates.filter((product) => product.kind === "outfit").sort(order);
  const jewellery = candidates.filter((product) => product.kind === "jewellery").sort(order);
  const project = (product: InventoryCandidate) => ({ id: product.id, name: product.name, boutiqueId: product.boutiqueId, boutiqueName: product.boutiqueName, kind: product.kind, rentalMinor: product.rentalMinor, ...(product.variantId ? { variantId: product.variantId, size: product.size } : {}) });
  const looks: RecommendationResponse["looks"] = [];
  for (const outfit of outfits) {
    const accessory = input.lookMode === "complete-look" && input.jewelleryPreference !== "none"
      ? jewellery.find((item) => item.boutiqueId === outfit.boutiqueId && item.rentalMinor <= budget - outfit.rentalMinor) : undefined;
    if (input.lookMode === "complete-look" && input.jewelleryPreference !== "none" && !accessory) continue;
    const items = accessory ? [outfit, accessory] : [outfit];
    looks.push({ products: items.map(project), totalRentalMinor: items.reduce((total, item) => total + item.rentalMinor, 0) });
    if (looks.length === 5) break;
  }
  return looks;
}

export function createRecommendationService(options: { inventory: RecommendationInventoryAdapter; preferences?: StylingPreferenceProvider; timeoutMs?: number; now?: () => number }) {
  return { async recommend(rawInput: unknown): Promise<RecommendationResponse> {
    const input = recommendationInputSchema.parse(rawInput), budgetMinor = Math.round(input.totalRentalBudget * 100);
    let preferences = rulePreferences(input);
    let source: RecommendationResponse["source"] = "rules", fallbackReason: RecommendationResponse["fallbackReason"] = options.preferences ? null : "missing_key";
    const respond = (status: RecommendationResponse["status"], message: string, looks: RecommendationResponse["looks"] = []) => recommendationResponseSchema.parse({ status, source, fallbackReason, currency: "INR", budgetMinor, preferences, looks, message });
    if (!input.rentalDates) return respond("DATES_REQUIRED", "Rental dates are required to verify product availability and full-period rental prices.");
    let inventory: InventoryCandidate[];
    try {
      const records = await bounded((signal) => options.inventory.search(input, signal), options.timeoutMs ?? 4000);
      if (!Array.isArray(records)) throw new Error("Invalid inventory response");
      inventory = records.map((record) => inventoryCandidateSchema.parse(record));
    }
    catch { fallbackReason = "inventory_unavailable"; return respond("INVENTORY_UNAVAILABLE", "Shared inventory and authoritative availability integration is unavailable. No products can be recommended."); }
    if (options.preferences) {
      try {
        const response = await bounded((signal) => options.preferences!.generate(input, signal), options.timeoutMs ?? 4000);
        const parsed = stylingPreferencesSchema.safeParse(response);
        if (!parsed.success) fallbackReason = "invalid_response";
        else { preferences = parsed.data; source = "gemini"; fallbackReason = null; }
      } catch (error) {
        fallbackReason = error instanceof PreferenceError ? error.reason : error instanceof Error && error.message === "timeout" ? "timeout" : "api_failure";
      }
    }
    const looks = selectLooks(inventory, input, preferences, (options.now ?? Date.now)());
    return respond(looks.length ? "OK" : "NO_MATCHES", looks.length ? "Full-period rental estimates and availability were checked. Review a fresh estimate before requesting. Collection and return take place at the boutique; Rentique does not collect payments." : "No verified products satisfy all requested constraints and the combined rental budget.", looks);
  } };
}
