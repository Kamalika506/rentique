import { recommendationInputSchema, type RecommendationResponse } from "./contracts";

export type RecommendationApiError = { error: { code: "UNSUPPORTED_MEDIA_TYPE" | "PAYLOAD_TOO_LARGE" | "INVALID_INPUT" | "SERVICE_UNAVAILABLE"; message: string } };
export function createRecommendationHandler(service: { recommend(input: unknown): Promise<RecommendationResponse> }) {
  return async function POST(request: Request): Promise<Response> {
    const reply = (body: RecommendationResponse | RecommendationApiError, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
    const error = (code: RecommendationApiError["error"]["code"], message: string, status: number) => reply({ error: { code, message } }, status);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error("UNSUPPORTED_MEDIA_TYPE", "Use application/json.", 415);
    let input: unknown;
    try {
      const reader = request.body?.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
      if (!reader) return error("INVALID_INPUT", "JSON request body is required.", 400);
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 8192) { await reader.cancel(); return error("PAYLOAD_TOO_LARGE", "Request body exceeds 8 KB.", 413); }
        chunks.push(value);
      }
      const body = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      input = JSON.parse(new TextDecoder().decode(body));
    } catch { return error("INVALID_INPUT", "Malformed JSON request body.", 400); }
    const parsed = recommendationInputSchema.safeParse(input);
    if (!parsed.success) return error("INVALID_INPUT", "Check occasion, INR budget, preferences and rental dates against the recommendation contract.", 400);
    try { const result = await service.recommend(parsed.data); return reply(result, result.status === "INVENTORY_UNAVAILABLE" ? 503 : 200); }
    catch { return error("SERVICE_UNAVAILABLE", "Recommendations are temporarily unavailable.", 503); }
  };
}
