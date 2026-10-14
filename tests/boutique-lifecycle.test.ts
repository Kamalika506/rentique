import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoBookingService, demoBookings } from "../src/features/boutiques/adapters/mock/bookings";
import { BookingServiceError } from "../src/features/boutiques/booking-management/service";

test("full rental lifecycle records pickup, return, inspection and completion", async () => {
  const service = createDemoBookingService({ delayMs: 0 }); let booking = await service.getBooking("RQ-108");
  assert.equal(booking.status, "PENDING");
  booking = await service.applyLifecycleAction(booking.id, { action: "CONFIRM" }, booking.version); assert.equal(booking.status, "CONFIRMED");
  booking = await service.applyLifecycleAction(booking.id, { action: "PICK_UP" }, booking.version); assert.equal(booking.status, "PICKED_UP"); assert.ok(booking.pickedUpAt);
  booking = await service.applyLifecycleAction(booking.id, { action: "RETURN" }, booking.version); assert.equal(booking.status, "RETURNED"); assert.ok(booking.returnedAt);
  await assert.rejects(service.applyLifecycleAction(booking.id, { action: "COMPLETE" }, booking.version), BookingServiceError);
  booking = await service.applyLifecycleAction(booking.id, { action: "RECORD_INSPECTION", condition: "GOOD", notes: "Clean and complete." }, booking.version);
  booking = await service.applyLifecycleAction(booking.id, { action: "COMPLETE" }, booking.version); assert.equal(booking.status, "COMPLETED"); assert.ok(booking.completedAt); assert.equal(booking.inspection?.condition, "GOOD"); assert.equal(booking.manualRefund, undefined);
  assert.equal((await service.getCalendar("2026-10")).find((event) => event.bookingId === booking.id)?.status, "COMPLETED");
});
test("cannot skip stages, repeat stale actions, mutate foreign records or cancel a picked-up rental", async () => {
  const service = createDemoBookingService({ delayMs: 0 }); const pending = await service.getBooking("RQ-108");
  await assert.rejects(service.applyLifecycleAction(pending.id, { action: "RETURN" }, pending.version), BookingServiceError);
  const confirmed = await service.applyLifecycleAction(pending.id, { action: "CONFIRM" }, pending.version);
  await assert.rejects(service.applyLifecycleAction(pending.id, { action: "PICK_UP" }, pending.version), BookingServiceError);
  const pickedUp = await service.applyLifecycleAction(confirmed.id, { action: "PICK_UP" }, confirmed.version);
  await assert.rejects(service.applyLifecycleAction(pickedUp.id, { action: "CANCEL", reason: "Demo cancellation" }, pickedUp.version), BookingServiceError);
  const foreign = createDemoBookingService({ delayMs: 0, initialBookings: [{ ...demoBookings[0], boutiqueId: "other" }] });
  await assert.rejects(foreign.applyLifecycleAction("RQ-108", { action: "CONFIRM" }, 1), BookingServiceError);
});
test("damage inspections require notes, and refund records are independent of damage and completion", async () => {
  const service = createDemoBookingService({ delayMs: 0 }); let booking = await service.getBooking("RQ-106");
  assert.equal(booking.status, "PICKED_UP"); booking = await service.applyLifecycleAction(booking.id, { action: "RETURN" }, booking.version);
  for (const condition of ["MINOR_DAMAGE", "MAJOR_DAMAGE"] as const) {
    await assert.rejects(service.applyLifecycleAction(booking.id, { action: "RECORD_INSPECTION", condition, notes: "" }, booking.version), BookingServiceError);
    booking = await service.applyLifecycleAction(booking.id, { action: "RECORD_INSPECTION", condition, notes: "Recorded sample damage." }, booking.version);
  }
  assert.equal(booking.manualRefund, undefined); const deposit = booking.depositMinor;
  for (const status of ["PENDING", "PARTIALLY_REFUNDED", "REFUNDED", "WITHHELD", "NOT_REQUIRED"] as const) {
    booking = await service.applyLifecycleAction(booking.id, { action: "RECORD_REFUND", status, notes: "Manual record only; no transfer." }, booking.version);
    assert.equal(booking.manualRefund?.status, status); assert.equal(booking.depositMinor, deposit); assert.equal(booking.status, "RETURNED");
  }
  booking = await service.applyLifecycleAction(booking.id, { action: "COMPLETE" }, booking.version);
  assert.equal(booking.manualRefund?.status, "NOT_REQUIRED");
});
test("rejected/cancelled requests require reasons and cannot re-enter the lifecycle", async () => {
  const service = createDemoBookingService({ delayMs: 0 });
  for (const [id, action] of [["RQ-108", "REJECT"], ["RQ-107", "CANCEL"]] as const) {
    let booking = await service.getBooking(id);
    await assert.rejects(service.applyLifecycleAction(id, { action, reason: " " }, booking.version), BookingServiceError);
    booking = await service.applyLifecycleAction(id, { action, reason: "Sample request outcome" }, booking.version);
    assert.equal(booking.status, action === "REJECT" ? "REJECTED" : "CANCELLED");
    await assert.rejects(service.applyLifecycleAction(id, { action: "CONFIRM" }, booking.version), BookingServiceError);
    assert.equal((await service.getCalendar("2026-10")).some((event) => event.bookingId === id), false);
  }
  assert.equal((await createDemoBookingService({ delayMs: 0 }).getBooking("RQ-108")).status, "PENDING");
});
