import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDemoDashboardSnapshot, createDemoDashboardService } from "../src/features/boutiques/adapters/mock/dashboard";
import { dashboardSummaryCsv, formatDashboardMoney, parseDashboardView } from "../src/features/boutiques/dashboard/service";
import { bookingStatusLabels } from "../src/features/boutiques/booking-management/service";

test("dashboard fixture totals, scheduled events and completed revenue agree", () => {
  const data = buildDemoDashboardSnapshot();
  assert.deepEqual(data.summary, { activeProducts: 4, totalBookings: 8, pendingRequests: 2, upcomingPickups: 2, upcomingReturns: 2, completedRentals: 2, completedRentalRevenueMinor: 800000 });
  assert.equal(data.upcomingPickups.some((booking) => booking.status === "PENDING"), false);
  assert.deepEqual(data.upcomingReturns.map((booking) => booking.id), ["RQ-106", "RQ-107"]);
  assert.equal(data.recentBookings[0].id, "RQ-108");
  assert.equal(data.recentBookings.every((booking) => Object.hasOwn(bookingStatusLabels, booking.status)), true);
  assert.equal(data.recentBookings.find((booking) => booking.id === "RQ-106")?.status, "PICKED_UP");
});

test("schedule start is inclusive, end exclusive, and cancelled bookings do not count", () => {
  const data = buildDemoDashboardSnapshot();
  const base = data.recentBookings.find((booking) => booking.status === "CONFIRMED")!;
  const result = buildDemoDashboardSnapshot([], [
    { ...base, id: "start", pickupAt: data.asOf, returnAt: data.asOf },
    { ...base, id: "end", pickupAt: data.scheduleUntil, returnAt: data.scheduleUntil },
    { ...base, id: "cancelled", status: "CANCELLED", pickupAt: data.asOf, returnAt: data.asOf },
  ]);
  assert.deepEqual(result.upcomingPickups.map((booking) => booking.id), ["start"]);
  assert.deepEqual(result.upcomingReturns.map((booking) => booking.id), ["start"]);
  assert.equal(result.summary.completedRentalRevenueMinor, 0);
});

test("demo refreshes return defensive copies and an empty scenario has zero metrics", async () => {
  const service = createDemoDashboardService({ delayMs: 0 });
  const first = await service.getSnapshot(); first.products[0].name = "Modified";
  assert.notEqual((await service.getSnapshot()).products[0].name, "Modified");
  const empty = await createDemoDashboardService({ empty: true, delayMs: 0 }).getSnapshot();
  assert.equal(Object.values(empty.summary).every((value) => value === 0), true);
  assert.equal(empty.recentBookings.length, 0);
});

test("export labels demo data, escapes CSV and neutralizes formula-like boutique names", () => {
  const data = buildDemoDashboardSnapshot(); data.boutiqueName = '=HYPERLINK("https://example.com")';
  const csv = dashboardSummaryCsv(data, "demo");
  assert.ok(csv.includes("DEMO - sample data"));
  assert.ok(csv.includes(`"'=HYPERLINK(""https://example.com"")"`));
  data.boutiqueName = "  =SUM(1,2)";
  assert.ok(dashboardSummaryCsv(data, "demo").includes(`"'  =SUM(1,2)"`));
  assert.equal(parseDashboardView("invalid"), "overview");
  assert.equal(parseDashboardView("bookings"), "bookings");
});

test("money formatting preserves minor units and respects the currency exponent", () => {
  assert.equal(formatDashboardMoney(800050, "INR"), "₹8,000.50");
  assert.equal(formatDashboardMoney(100, "JPY"), "JP¥100");
});
