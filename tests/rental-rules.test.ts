import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedActions, lineAmounts, rentalDays, reservingStatuses } from "../src/features/rentals/rules";

test("rental intervals reject past, reversed, invalid and oversized requests", () => {
  const now = new Date("2026-10-14T00:00:00Z");
  assert.equal(rentalDays(new Date("2026-10-15T12:00:00Z"), new Date("2026-10-16T13:00:00Z"), now), 2);
  for (const [start, end] of [["2026-10-13", "2026-10-16"], ["2026-10-16", "2026-10-15"], ["invalid", "2026-10-16"], ["2026-10-15", "2027-10-15"]]) assert.throws(() => rentalDays(new Date(start), new Date(end), now));
});
test("prices use integer paise, quantity and the boutique pricing unit", () => {
  assert.deepEqual(lineAmounts(BigInt(129999), BigInt(200000), "PER_DAY", 3, 2), { rentalMinor: BigInt(779994), depositMinor: BigInt(400000) });
  assert.deepEqual(lineAmounts(BigInt(129999), BigInt(200000), "PER_RENTAL", 3, 2), { rentalMinor: BigInt(259998), depositMinor: BigInt(400000) });
});
test("rental completion requires a returned item and inspection", () => {
  assert.ok(!allowedActions("PENDING", false).includes("COMPLETE"));
  assert.ok(!allowedActions("RETURNED", false).includes("COMPLETE"));
  assert.ok(allowedActions("RETURNED", true).includes("COMPLETE"));
  assert.deepEqual(reservingStatuses, ["PENDING", "CONFIRMED", "PICKED_UP"]);
  assert.ok(!allowedActions("COMPLETED", true).includes("CANCEL"));
});
