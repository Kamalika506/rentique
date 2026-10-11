import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoBookingService, demoBookings } from "../src/features/boutiques/adapters/mock/bookings";
import { BookingServiceError } from "../src/features/boutiques/booking-management/service";
import { calendarDays, shiftMonth } from "../src/features/boutiques/rental-calendar/dates";

test("search/status filters and scheduled pickups/returns are service supplied", async () => {
  const service = createDemoBookingService({ delayMs: 0 }); const list = await service.listBookings({ status: "PENDING" });
  assert.equal(list.items.length, 2); assert.equal(list.upcomingPickups.length, 2); assert.equal(list.upcomingReturns.length, 2);
  assert.equal((await service.listBookings({ search: "Meera" })).items[0].id, "RQ-107");
  assert.equal((await service.listBookings({ search: "nothing-matches" })).items.length, 0);
});
test("demo decisions update calendar and service-provided actions", async () => {
  const service = createDemoBookingService({ delayMs: 0 }); const pending = await service.getBooking("RQ-108");
  const confirmed = await service.decideBooking(pending.id, "CONFIRM", pending.version);
  assert.equal(confirmed.status, "CONFIRMED"); assert.deepEqual(confirmed.allowedActions, ["PICK_UP", "CANCEL"]);
  assert.equal((await service.getCalendar("2026-10")).find((event) => event.bookingId === pending.id)?.status, "CONFIRMED");
  await assert.rejects(service.decideBooking(pending.id, "REJECT", pending.version, "Test rejection"), BookingServiceError);
  const second = await service.getBooking("RQ-105");
  await assert.rejects(service.decideBooking(second.id, "REJECT", second.version, "x"), BookingServiceError);
  const rejected = await service.decideBooking(second.id, "REJECT", second.version, "Demo review feedback");
  assert.equal(rejected.rejectionReason, "Demo review feedback"); assert.equal((await service.getCalendar("2026-10")).some((event) => event.bookingId === second.id), false);
  assert.equal((await createDemoBookingService({ delayMs: 0 }).getBooking(pending.id)).status, "PENDING");
});
test("foreign IDs are invisible and cannot receive decisions; records are defensive copies", async () => {
  const service = createDemoBookingService({ delayMs: 0, initialBookings: [{ ...demoBookings[0], boutiqueId: "foreign" }] });
  assert.deepEqual((await service.listBookings({})).items, []); assert.deepEqual(await service.getCalendar("2026-10"), []);
  await assert.rejects(service.getBooking("RQ-108"), BookingServiceError); await assert.rejects(service.decideBooking("RQ-108", "CONFIRM", 1), BookingServiceError);
  const own = createDemoBookingService({ delayMs: 0 }); const record = await own.getBooking("RQ-108"); record.customer.name = "Changed"; assert.notEqual((await own.getBooking(record.id)).customer.name, "Changed");
});
test("calendar grid handles leap years and year boundaries without browser timezone offsets", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01"); assert.equal(shiftMonth("2026-01", -1), "2025-12");
  const days = calendarDays("2024-02"); assert.ok(days.includes("2024-02-29")); assert.equal(days.length % 7, 0); assert.equal(new Date(days[0]).getUTCDay(), 0);
  assert.throws(() => calendarDays("2026-13")); assert.throws(() => calendarDays("wrong"));
});
test("calendar maps dates into boutique timezone and clips by visible month grid", async () => {
  const sample = { ...demoBookings[0], pickupAt: "2026-10-31T20:00:00Z", returnAt: "2026-11-02T20:00:00Z" };
  const service = createDemoBookingService({ delayMs: 0, initialBookings: [sample] });
  const november = await service.getCalendar("2026-11"); assert.equal(november[0].pickupDate, "2026-11-01"); assert.equal(november[0].returnDate, "2026-11-03");
  assert.deepEqual(await service.getCalendar("2026-01"), []);
});
