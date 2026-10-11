import assert from "node:assert/strict";
import { test } from "node:test";
import { recommendationInputSchema, recommendationResponseSchema, type InventoryCandidate, type RecommendationInput, type StylingPreferenceProvider } from "../src/features/recommendations/contracts";
import { createRecommendationService } from "../src/features/recommendations/engine";
import { createGeminiPreferenceProvider } from "../src/features/recommendations/gemini";
import { createRecommendationHandler } from "../src/features/recommendations/http";

const now = Date.parse("2026-10-11T06:00:00Z");
const input: RecommendationInput = { occasion: "wedding", totalRentalBudget: 1000, outfitType: "saree", colourPreference: "plum", jewelleryPreference: "gold", lookMode: "complete-look", city: "Jaipur", rentalDates: { start: "2026-10-20", end: "2026-10-22" } };
function product(id: string, changes: Partial<InventoryCandidate> = {}): InventoryCandidate {
  return { id, name: `Real ${id}`, boutiqueId: "boutique", boutiqueName: "Approved boutique", boutiqueStatus: "APPROVED", archived: false,
    kind: "outfit", outfitType: "saree", colours: ["plum"], jewelleryType: "gold", city: "Jaipur", occasionTags: ["wedding"], styleTags: ["traditional"], rentalMinor: 70000,
    availability: { status: "AVAILABLE", availableUnits: 1, start: input.rentalDates!.start, end: input.rentalDates!.end, checkedAt: new Date(now).toISOString() }, ...changes };
}
function service(products: InventoryCandidate[], preferences?: StylingPreferenceProvider, timeoutMs = 50) {
  return createRecommendationService({ inventory: { async search() { return products; } }, preferences, now: () => now, timeoutMs });
}
test("complete looks enforce combined budget with exact paise and only adapter products", async () => {
  const data = [product("outfit"), product("expensive", { kind: "jewellery", rentalMinor: 30001 }), product("affordable", { kind: "jewellery", rentalMinor: 30000 })];
  const result = await service(data).recommend(input);
  assert.equal(result.source, "rules"); assert.equal(result.fallbackReason, "missing_key");
  assert.equal(result.looks[0].totalRentalMinor, 100000); assert.deepEqual(result.looks[0].products.map((item) => item.id), ["outfit", "affordable"]);
  assert.equal(recommendationResponseSchema.safeParse(result).success, true);
  assert.equal((await service(data.slice(0, 2)).recommend(input)).status, "NO_MATCHES");
  assert.equal((await service(data).recommend({ ...input, totalRentalBudget: 699.99, lookMode: "outfit" })).looks.length, 0);
});
test("approval, archive, availability, quote period, freshness and customer filters are mandatory", async () => {
  const original = product("base"); const alternatives: Partial<InventoryCandidate>[] = [
    { boutiqueStatus: "PENDING" }, { boutiqueStatus: "REJECTED" }, { archived: true }, { city: "Mumbai" },
    { colours: ["red"] }, { outfitType: "gown" }, { occasionTags: ["party"] }, { rentalMinor: -1 }, { rentalMinor: 1.2 },
    { availability: { ...original.availability, status: "UNKNOWN" } }, { availability: { ...original.availability, status: "UNAVAILABLE" } },
    { availability: { ...original.availability, availableUnits: 0 } }, { availability: { ...original.availability, start: "2026-10-19" } },
    { availability: { ...original.availability, checkedAt: new Date(now - 60001).toISOString() } },
    { availability: { ...original.availability, checkedAt: new Date(now + 1).toISOString() } },
  ];
  for (const change of alternatives) assert.equal((await service([product("invalid", change)]).recommend({ ...input, lookMode: "outfit" })).looks.length, 0, JSON.stringify(change));
  const result = await service([product("valid"), product("valid")]).recommend({ ...input, lookMode: "outfit" }); assert.equal(result.looks.length, 1);
});
test("jewellery preferences cannot be overridden by styling output", async () => {
  const data = [product("outfit"), product("silver", { kind: "jewellery", jewelleryType: "silver", rentalMinor: 10000 })];
  assert.equal((await service(data).recommend(input)).status, "NO_MATCHES");
  assert.equal((await service(data).recommend({ ...input, jewelleryPreference: "none" })).looks[0].products.length, 1);
});
test("valid Gemini tags only affect ranking; AI cannot inject products or relax hard constraints", async () => {
  const data = [product("cheap", { rentalMinor: 60000, styleTags: ["traditional"] }), product("matching", { rentalMinor: 70000, styleTags: ["minimal"] }), product("over-budget", { rentalMinor: 100001, styleTags: ["minimal"] })];
  const result = await service(data, { async generate() { return { styleTags: ["minimal"] }; } }).recommend({ ...input, lookMode: "outfit" });
  assert.equal(result.source, "gemini"); assert.equal(result.fallbackReason, null); assert.equal(result.looks[0].products[0].id, "matching"); assert.equal(result.looks.length, 2);
  const injected = await service(data, { async generate() { return { styleTags: ["minimal"], products: [{ id: "invented" }] }; } }).recommend({ ...input, lookMode: "outfit" });
  assert.equal(injected.fallbackReason, "invalid_response"); assert.equal(injected.looks[0].products[0].id, "cheap");
});
test("failure, invalid output and timeout fall back deterministically with the same schema", async () => {
  const data = [product("outfit")]; const request = { ...input, lookMode: "outfit" };
  const baseline = await service(data).recommend(request);
  for (const [provider, reason] of [
    [{ async generate() { throw new Error("private API error"); } }, "api_failure"],
    [{ async generate() { return { styleTags: ["invented"] }; } }, "invalid_response"],
    [{ async generate() { return new Promise<never>(() => {}); } }, "timeout"],
  ] as const) {
    const result = await service(data, provider, 5).recommend(request);
    assert.equal(result.source, "rules"); assert.equal(result.fallbackReason, reason); assert.deepEqual(result.looks, baseline.looks); assert.equal(recommendationResponseSchema.safeParse(result).success, true);
  }
});
test("missing dates and unavailable inventory never invent availability or call Gemini", async () => {
  let calls = 0; const preferences = { async generate() { calls++; return { styleTags: ["minimal"] }; } };
  assert.equal((await service([product("one")], preferences).recommend({ ...input, rentalDates: undefined })).status, "DATES_REQUIRED");
  const blocked = createRecommendationService({ inventory: { async search() { throw new Error("missing backend"); } }, preferences });
  const result = await blocked.recommend(input); assert.equal(result.status, "INVENTORY_UNAVAILABLE"); assert.deepEqual(result.looks, []); assert.equal(calls, 0);
});
test("malformed shared inventory fails closed before Gemini is invoked", async () => {
  let generated = false;
  const broken = service([{ ...product("bad"), styleTags: undefined } as unknown as InventoryCandidate], { async generate() { generated = true; return { styleTags: ["minimal"] }; } });
  const result = await broken.recommend(input);
  assert.equal(result.status, "INVENTORY_UNAVAILABLE"); assert.equal(result.fallbackReason, "inventory_unavailable"); assert.deepEqual(result.looks, []); assert.equal(generated, false);
});
test("request validation rejects imprecise budgets, reversed and impossible dates, and unknown fields", () => {
  for (const change of [{ totalRentalBudget: 0 }, { totalRentalBudget: 1.001 }, { rentalDates: { start: "2026-02-30", end: "2026-03-01" } }, { rentalDates: { start: "2026-10-22", end: "2026-10-20" } }, { products: [] }]) assert.equal(recommendationInputSchema.safeParse({ ...input, ...change }).success, false);
});
test("Gemini transport uses header credentials, JSON schema and validates all responses", async () => {
  let captured: RequestInit | undefined;
  const provider = createGeminiPreferenceProvider({ apiKey: "test-secret", model: "configured-model", fetch: async (url, init) => {
    assert.equal(String(url).includes("test-secret"), false); captured = init;
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ styleTags: ["traditional"] }) }] } }] });
  } });
  assert.deepEqual(await provider.generate(input, new AbortController().signal), { styleTags: ["traditional"] });
  assert.equal((captured!.headers as Record<string, string>)["x-goog-api-key"], "test-secret");
  const body = JSON.parse(captured!.body as string); assert.equal(body.generationConfig.responseFormat.text.mimeType, "application/json"); assert.equal(JSON.stringify(body).includes("Jaipur"), false);
  for (const response of [new Response("error", { status: 500 }), Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] }), Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not json" }] } }] })]) {
    const broken = createGeminiPreferenceProvider({ apiKey: "test", model: "model", fetch: async () => response });
    await assert.rejects(() => broken.generate(input, new AbortController().signal));
  }
});
test("HTTP contract handles invalid inputs, oversized JSON and unavailable integration", async () => {
  const handler = createRecommendationHandler(createRecommendationService({ inventory: { async search() { throw new Error("unavailable"); } } }));
  const post = (body: string, contentType = "application/json") => handler(new Request("http://localhost/api/recommendations", { method: "POST", headers: { "Content-Type": contentType }, body }));
  assert.equal((await post(JSON.stringify(input))).status, 503); assert.equal((await post("{")).status, 400);
  assert.equal((await post("{}", "text/plain")).status, 415); assert.equal((await post(JSON.stringify({ extra: "x".repeat(9000) }))).status, 413);
  const response = await post(JSON.stringify(input)); assert.equal(response.headers.get("Cache-Control"), "no-store"); assert.equal(recommendationResponseSchema.safeParse(await response.json()).success, true);
});
