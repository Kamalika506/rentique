import { createRecommendationHandler } from "@/features/recommendations/http";
import { createServerRecommendationService } from "@/features/recommendations/server";

export async function POST(request: Request) {
  return createRecommendationHandler(createServerRecommendationService())(request);
}
