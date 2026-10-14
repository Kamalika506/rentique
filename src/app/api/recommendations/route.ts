import { createRecommendationHandler } from "@/features/recommendations/http";
import { createServerRecommendationService } from "@/features/recommendations/server";
import { ApiError, currentUser } from "@/lib/api";

export async function POST(request: Request) {
  try { await currentUser(); }
  catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return Response.json({ error: "Unable to verify your session. Please try again." }, { status: 503 });
  }
  return createRecommendationHandler(createServerRecommendationService())(request);
}
