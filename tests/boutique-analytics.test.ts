import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateAnalytics, inventoryUtilization } from "../src/features/analytics/calculations";
import type { AnalyticsDataset } from "../src/features/analytics/service";
import { createDemoAnalyticsService } from "../src/features/analytics/adapters/mock/analytics";

function dataset(): AnalyticsDataset {
  return { boutique: { id: "own", name: "Test boutique" }, asOf: "2026-10-11T00:00:00Z", timezone: "Asia/Kolkata", startMonth: "2026-08", endMonth: "2026-10", complete: true, bookings: [] };
}
function booking(status: AnalyticsDataset["bookings"][number]["status"], id: string = status): AnalyticsDataset["bookings"][number] {
  return { id, boutiqueId: "own", status, createdAt: "2026-10-01T00:00:00Z", rentalMinor: 123456, depositMinor: 999999,
    products: [{ id: "one", name: "Saree", category: "Ethnic", quantity: 1 }] };
}
test("completed revenue excludes deposits and every non-completed status", () => {
  const data = dataset(); data.bookings = ["PENDING", "CONFIRMED", "PICKED_UP", "RETURNED", "COMPLETED", "CANCELLED", "REJECTED"].map((status) => booking(status as Parameters<typeof booking>[0]));
  const result = calculateAnalytics(data);
  assert.equal(result.totalBookings, 7); assert.equal(result.completedRentals, 1); assert.equal(result.completedRevenueMinor, 123456);
  assert.equal(result.pendingBookings, 1); assert.equal(result.cancelledBookings, 1); assert.equal(result.popularProducts[0].bookings, 5);
});
test("trend zero-fills months and uses the reporting timezone and creation cohort", () => {
  const data = dataset(); const boundary = booking("COMPLETED"); boundary.createdAt = "2026-07-31T20:00:00Z";
  const outside = booking("COMPLETED", "outside"); outside.createdAt = "2026-07-10T00:00:00Z";
  data.bookings = [boundary, outside]; const result = calculateAnalytics(data);
  assert.deepEqual(result.months, [{ month: "2026-08", bookings: 1 }, { month: "2026-09", bookings: 0 }, { month: "2026-10", bookings: 0 }]);
  assert.equal(result.totalBookings, 1); assert.equal(result.completedRevenueMinor, 123456);
});
test("products and categories count unique bookings; quantities still accumulate", () => {
  const data = dataset(); const item = booking("CONFIRMED");
  item.products.push({ ...item.products[0], quantity: 2 }, { id: "two", name: "Gown", category: "Occasion", quantity: 1 });
  data.bookings = [item, booking("CANCELLED"), booking("REJECTED")];
  const result = calculateAnalytics(data);
  assert.equal(result.popularProducts.find((product) => product.id === "one")?.bookings, 1);
  assert.equal(result.popularProducts.find((product) => product.id === "one")?.units, 3);
  assert.deepEqual(result.categories, [{ name: "Ethnic", bookings: 1 }, { name: "Occasion", bookings: 1 }]);
});
test("empty data has zero totals and unavailable utilization", () => {
  const result = calculateAnalytics(dataset()); assert.equal(result.totalBookings, 0); assert.equal(result.completedRevenueMinor, 0);
  assert.deepEqual(result.popularProducts, []); assert.equal(result.utilizationPercent, null);
});
test("incomplete, duplicate, foreign, future and invalid financial records are refused", () => {
  const incomplete = dataset(); incomplete.complete = false; assert.throws(() => calculateAnalytics(incomplete));
  const data = dataset(); data.bookings = [booking("PENDING"), booking("PENDING")]; assert.throws(() => calculateAnalytics(data));
  data.bookings = [{ ...booking("COMPLETED"), boutiqueId: "foreign" }]; assert.throws(() => calculateAnalytics(data));
  data.bookings = [{ ...booking("COMPLETED"), createdAt: "2026-10-12T00:00:00Z" }]; assert.throws(() => calculateAnalytics(data));
  data.bookings = [{ ...booking("COMPLETED"), rentalMinor: -1 }]; assert.throws(() => calculateAnalytics(data));
  data.bookings = [{ ...booking("COMPLETED"), status: "ACTIVE" as "COMPLETED" }]; assert.throws(() => calculateAnalytics(data));
});
test("utilization requires complete matching historical capacity and occupied unit-days", () => {
  const data = dataset(); data.utilization = { startMonth: data.startMonth, endMonth: data.endMonth, asOf: data.asOf, timezone: data.timezone, complete: true, availableUnitDays: 200, occupiedUnitDays: 50 };
  assert.equal(inventoryUtilization(data), 25);
  for (const change of [{ complete: false }, { startMonth: "2026-09" }, { asOf: "2026-10-01T00:00:00Z" }, { timezone: "UTC" }, { availableUnitDays: 0 }, { occupiedUnitDays: -1 }, { occupiedUnitDays: 201 }, { occupiedUnitDays: NaN }]) {
    assert.equal(inventoryUtilization({ ...data, utilization: { ...data.utilization, ...change } }), null);
  }
  assert.equal(inventoryUtilization({ ...data, utilization: { ...data.utilization, occupiedUnitDays: 0 } }), 0);
});
test("demo adapter is explicit and returns an isolated consistent reporting snapshot", async () => {
  const service = createDemoAnalyticsService(); assert.equal(service.mode, "demo");
  const data = await service.getDataset(); const metrics = calculateAnalytics(data);
  assert.equal(metrics.totalBookings, 9); assert.equal(metrics.completedRentals, 3); assert.equal(metrics.completedRevenueMinor, 1650000);
  data.bookings.length = 0; assert.equal((await service.getDataset()).bookings.length, 9);
});
test("invalid periods and unsafe revenue sums are rejected", () => {
  const data = dataset(); data.startMonth = "2026-11"; assert.throws(() => calculateAnalytics(data));
  data.startMonth = "2026-08"; data.bookings = [booking("COMPLETED", "first"), booking("COMPLETED", "second")];
  data.bookings[0].rentalMinor = Number.MAX_SAFE_INTEGER; assert.throws(() => calculateAnalytics(data));
});
