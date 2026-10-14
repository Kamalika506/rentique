import "server-only";
import { createRecommendationService } from "./engine";
import { createGeminiPreferenceProvider } from "./gemini";
import type { RecommendationInventoryAdapter } from "./contracts";
import { databaseInventory } from "./inventory";

export function createServerRecommendationService(inventory: RecommendationInventoryAdapter = databaseInventory) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  return createRecommendationService({ inventory, preferences: apiKey && model ? createGeminiPreferenceProvider({ apiKey, model }) : undefined });
}
