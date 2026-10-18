import { createRecommendationHandler } from "@/features/recommendations/http";
import { createServerRecommendationService } from "@/features/recommendations/server";
import { ApiError, currentUser } from "@/lib/api";
import { rateAllowed } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await currentUser("CUSTOMER");
    if (!await rateAllowed("styling", user.id, 20, 3600000)) throw new ApiError(429, "Please wait before requesting more styling suggestions.");
  }
  catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return Response.json({ error: "Unable to verify your session. Please try again." }, { status: 503 });
  }
  return createRecommendationHandler(createServerRecommendationService())(request);
}
