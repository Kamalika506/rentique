import assert from "node:assert/strict";
import { test } from "node:test";
import { lifecycleCommandSchema } from "../src/features/boutiques/booking-management/lifecycle";

const inspection = { action: "RECORD_INSPECTION", condition: "MINOR_DAMAGE", notes: "Small tear at the hem" };
test("inspection photos are optional and limited to six valid URLs", () => {
  assert.equal(lifecycleCommandSchema.safeParse(inspection).success, true);
  assert.equal(lifecycleCommandSchema.safeParse({ ...inspection, photos: ["https://res.cloudinary.com/demo/image/upload/photo.jpg"] }).success, true);
  assert.equal(lifecycleCommandSchema.safeParse({ ...inspection, photos: ["not-a-url"] }).success, false);
  assert.equal(lifecycleCommandSchema.safeParse({ ...inspection, photos: Array(7).fill("https://example.com/photo.jpg") }).success, false);
  assert.equal(lifecycleCommandSchema.safeParse({ ...inspection, notes: "", photos: ["https://example.com/photo.jpg"] }).success, false);
});
