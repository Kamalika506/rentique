import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveBookingStatus, requestExpired } from "../src/features/rentals/expiry";
import { allowedActions } from "../src/features/rentals/rules";
import { reservationWindows } from "../src/features/rentals/stock";

const now = new Date("2026-10-23T12:00:00Z");
const future = new Date("2026-10-25T12:00:00Z");
const past = new Date("2026-10-17T12:00:00Z");

test("explicit request deadlines expire at the boundary and preserve valid requests", () => {
  assert.equal(requestExpired({ status: "PENDING", pickupAt: future, requestExpiresAt: now }, now), true);
  assert.equal(requestExpired({ status: "PENDING", pickupAt: future, requestExpiresAt: future }, now), false);
});

test("legacy pending requests expire at pickup, without expiring confirmed rentals", () => {
  assert.equal(effectiveBookingStatus({ status: "PENDING", pickupAt: past, requestExpiresAt: null }, now), "EXPIRED");
  assert.equal(requestExpired({ status: "PENDING", pickupAt: now }, now), true);
  assert.equal(requestExpired({ status: "PENDING", pickupAt: future }, now), false);
  assert.equal(effectiveBookingStatus({ status: "CONFIRMED", pickupAt: past, requestExpiresAt: past }, now), "CONFIRMED");
});

test("expired legacy requests cannot be confirmed and do not reserve stock", () => {
  const booking = { status: "PENDING" as const, pickupAt: past, returnAt: future, requestExpiresAt: null };
  assert.equal(allowedActions(effectiveBookingStatus(booking, now), false).includes("CONFIRM"), false);
  assert.deepEqual(reservationWindows([{ quantity: 1, booking }], now), []);
});
