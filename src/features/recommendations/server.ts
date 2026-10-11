import "server-only";
import { createRecommendationService } from "./engine";
import { createGeminiPreferenceProvider } from "./gemini";
import type { RecommendationInventoryAdapter } from "./contracts";

// Replace only with Member 2's authoritative shared catalog/availability adapter.
const unavailableInventory: RecommendationInventoryAdapter = { async search() { throw new Error("Inventory integration unavailable"); } };
export function createServerRecommendationService(inventory: RecommendationInventoryAdapter = unavailableInventory) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  return createRecommendationService({ inventory, preferences: apiKey && model ? createGeminiPreferenceProvider({ apiKey, model }) : undefined });
}
