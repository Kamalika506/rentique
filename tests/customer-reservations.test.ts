import assert from "node:assert/strict";
import { test } from "node:test";
import { peakReserved, reservationWindows } from "../src/features/rentals/stock";
import { selectionSchema, reviewedQuoteSchema, validateReturnItems, validContactPhone } from "../src/features/rentals/customer-contracts";
import { inspirationAttributesSchema, imageMime, interpretInspiration } from "../src/features/recommendations/inspiration";
import { createRecommendationService } from "../src/features/recommendations/engine";
import type { InventoryCandidate, RecommendationInput } from "../src/features/recommendations/contracts";

const date = (day: number) => new Date(Date.UTC(2030, 0, day));
test("a contact phone must contain a plausible number of digits, not just punctuation", () => {
  assert.equal(validContactPhone("+91 90000 00000"), true);
  for (const phone of [null, "-------", "12", "+12345678901234567", "phone@example.com"]) assert.equal(validContactPhone(phone), false);
});
test("availability includes turnaround and permits back-to-back rentals only after the buffer", () => {
  const items = reservationWindows([{ quantity: 1, booking: { status: "CONFIRMED", pickupAt: date(2), returnAt: date(4), turnaroundMinutes: 1440 } }], date(1));
  assert.equal(peakReserved(items, date(4), date(5)), 1);
  assert.equal(peakReserved(items, date(5), date(6)), 0);
  assert.equal(peakReserved(items, date(1), date(2)), 0);
});
test("expired holds release stock while known overdue and unclean returns block future promises", () => {
  const expired = { quantity: 2, booking: { status: "PENDING", pickupAt: date(2), returnAt: date(4), requestExpiresAt: date(1) } };
  assert.equal(reservationWindows([expired], date(2)).length, 0);
  for (const status of ["PICKED_UP", "RETURNED", "COMPLETED"]) {
    const item = { quantity: 1, booking: { status, pickupAt: date(2), returnAt: date(4), turnaroundMinutes: 1440 } };
    assert.equal(peakReserved(reservationWindows([item], date(6)), date(10), date(11)), 1, status);
    assert.equal(reservationWindows([{ ...item, booking: { ...item.booking, stockReadyAt: date(6) } }], date(7)).length, 0);
  }
});
test("multi-item requests reject duplicate sizes, privilege fields and unsafe quantities", () => {
  const selection = { items: [{ variantId: "one", quantity: 1 }], pickupAt: date(2).toISOString(), returnAt: date(4).toISOString() };
  assert.ok(selectionSchema.safeParse(selection).success);
  assert.ok(!selectionSchema.safeParse({ ...selection, items: [selection.items[0], selection.items[0]] }).success);
  assert.ok(!selectionSchema.safeParse({ ...selection, items: [{ variantId: "one", quantity: 0 }] }).success);
  assert.ok(!selectionSchema.safeParse({ ...selection, customerId: "someone-else" }).success);
  assert.ok(reviewedQuoteSchema.safeParse({ ...selection, boutiqueId: "shop", rentalMinor: 100, fingerprint: "hash", policy: "terms", openingHours: "10–6" }).success);
});
test("partial returns cannot include foreign lines, duplicate acknowledgements, or excess quantities", () => {
  const items = [{ id: "one", quantity: 2, returnedQuantity: 1 }, { id: "two", quantity: 1, returnedQuantity: 0 }];
  assert.doesNotThrow(() => validateReturnItems(items, [{ itemId: "one", quantity: 1 }]));
  for (const returned of [[], [{ itemId: "one", quantity: 2 }], [{ itemId: "foreign", quantity: 1 }], [{ itemId: "one", quantity: 1 }, { itemId: "one", quantity: 1 }]]) assert.throws(() => validateReturnItems(items, returned));
});
test("image type detection rejects text/SVG and does not trust a file extension", () => {
  assert.equal(imageMime(new TextEncoder().encode("<svg><script/></svg>")), null);
  assert.equal(imageMime(new Uint8Array([255, 216, 255, 0])), "image/jpeg");
  assert.equal(imageMime(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(imageMime(new TextEncoder().encode("RIFFxxxxWEBP")), "image/webp");
});
test("image interpretation returns bounded attributes and rejects invented catalogue fields", async () => {
  const attributes = { outfitType: "lehenga", colourPreference: "red", jewelleryPreference: "gold", confidence: "medium", explanation: "Red embroidered occasion outfit." };
  assert.ok(inspirationAttributesSchema.safeParse(attributes).success);
  assert.ok(!inspirationAttributesSchema.safeParse({ ...attributes, productId: "invented" }).success);
  let requestBody: Record<string, unknown> = {};
  const result = await interpretInspiration({ apiKey: "test-secret", model: "test-model", imageBase64: "synthetic-image", signal: new AbortController().signal,
    fetch: async (_url, options) => { requestBody = JSON.parse(String(options?.body)); return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(attributes) }] } }] }); } });
  assert.equal(result.outfitType, "lehenga");
  assert.ok(JSON.stringify(requestBody).includes("inlineData"));
  assert.ok(!JSON.stringify(requestBody).includes("test-secret"));
  await assert.rejects(() => interpretInspiration({ apiKey: "test", model: "test-model", imageBase64: "synthetic", signal: new AbortController().signal, fetch: async () => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ ...attributes, productId: "invented" }) }] } }] }) }));
});
test("styling enforces requested size and keeps outfit/jewellery in one boutique", async () => {
  const now = date(1).getTime();
  const input: RecommendationInput = { occasion: "wedding", totalRentalBudget: 1000, outfitType: "any", colourPreference: "any", jewelleryPreference: "any", lookMode: "complete-look", size: "M", rentalDates: { start: "2030-01-02", end: "2030-01-04" } };
  const base: InventoryCandidate = { id: "outfit", name: "Lehenga", boutiqueId: "one", boutiqueName: "First shop", boutiqueStatus: "APPROVED", archived: false, kind: "outfit", outfitType: "lehenga", colours: ["red"], jewelleryType: "other", city: "Pune", occasionTags: ["wedding"], styleTags: ["traditional"], rentalMinor: 10000, availableSizes: ["M"], availability: { status: "AVAILABLE", availableUnits: 1, start: "2030-01-02", end: "2030-01-04", checkedAt: new Date(now).toISOString() } };
  const wrongSize = { ...base, id: "wrong-size", availableSizes: ["XS"] };
  const foreignJewellery = { ...base, id: "other-jewellery", kind: "jewellery" as const, boutiqueId: "two" };
  const ownJewellery = { ...foreignJewellery, id: "same-shop-jewellery", boutiqueId: "one" };
  const recommend = (products: InventoryCandidate[]) => createRecommendationService({ inventory: { search: async () => products }, now: () => now }).recommend(input);
  assert.equal((await recommend([base, foreignJewellery])).status, "NO_MATCHES");
  const result = await recommend([base, wrongSize, ownJewellery]);
  assert.equal(result.looks.length, 1);
  assert.deepEqual(result.looks[0].products.map(product => product.id), ["outfit", "same-shop-jewellery"]);
});
