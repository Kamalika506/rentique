import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingRecord } from "../src/features/rentals/records";

function booking(snapshot: unknown) {
  return {
    id: "booking-1", status: "CONFIRMED", version: 1, customer: { name: "Customer", email: "customer@example.com", phone: "9876543210" },
    boutique: { name: "Shop", address: "New address", city: "Pune", phone: "9876543210", contactEmail: "shop@example.com", openingHours: "New hours", collectionInstructions: "New instructions", cancellationPolicy: "New cancellation", returnPolicy: "New return", rentalPolicy: "Current terms" },
    policySnapshot: snapshot, items: [{ id: "item-1", variantId: "variant-1", productNameSnap: "Dress", sizeSnapshot: "M", quantity: 2, returnedQuantity: 0, rentalMinor: BigInt(1000), unitBlocks: [{ unit: { id: "unit-1", code: "M-001", status: "READY" }, returnedAt: null, releasedAt: null }], variant: { productId: "product-1", product: { images: [{ secureUrl: "https://example.com/current.jpg" }] } } }],
    pickupAt: new Date("2026-11-01"), returnAt: new Date("2026-11-03"), createdAt: new Date("2026-10-24"), rentalMinor: BigInt(1000), reviews: [], events: [],
  } as unknown as Parameters<typeof bookingRecord>[0];
}

test("booking details retain agreed instructions and outfit image after shop edits", () => {
  const record = bookingRecord(booking({ boutique: { address: "Original address" }, openingHours: "Original hours", collectionInstructions: "Bring booking reference", cancellationPolicy: "Call before collection", returnPolicy: "Return to counter", policy: "Agreed terms", items: [{ variantId: "variant-1", image: "https://example.com/booked.jpg" }] }));
  assert.equal(record.collection.address, "Original address");
  assert.equal(record.collection.openingHours, "Original hours");
  assert.equal(record.collection.collectionInstructions, "Bring booking reference");
  assert.equal(record.collection.savedAtBooking, true);
  assert.equal(record.products[0].image, "https://example.com/booked.jpg");
  assert.equal(record.products[0].size, "M");
  assert.equal(record.products[0].quantity, 2);
  assert.equal(record.products[0].units[0].code, "M-001");
});

test("legacy bookings fall back to current shop information and images", () => {
  const record = bookingRecord(booking(null));
  assert.equal(record.collection.savedAtBooking, false);
  assert.equal(record.collection.collectionInstructions, "New instructions");
  assert.equal(record.products[0].image, "https://example.com/current.jpg");
});
