import assert from "node:assert/strict";
import { test } from "node:test";
import { boutiqueSettingsSchema, storefrontQuerySchema, publicBoutiqueSelect } from "../src/features/boutiques/storefront/schema";

const profile = {
  name: "Silk Atelier", description: "A curated collection of wedding and occasion wear.", contactEmail: "atelier@example.com", phone: "+91 98765 43210",
  address: "12 Atelier Lane", city: "Jaipur", state: "Rajasthan", postalCode: "302001", socialLink: "https://example.com/atelier", timezone: "Asia/Kolkata", version: 2,
};

test("boutique profile updates cannot set approval, ownership or review fields", () => {
  assert.equal(boutiqueSettingsSchema.safeParse(profile).success, true);
  for (const privileged of [{ status: "APPROVED" }, { ownerId: "another-owner" }, { reviewedById: "admin" }, { rejectionReason: "" }, { categories: ["Bridal"] }]) {
    assert.equal(boutiqueSettingsSchema.safeParse({ ...profile, ...privileged }).success, false);
  }
  assert.equal(boutiqueSettingsSchema.safeParse({ ...profile, version: 0 }).success, false);
  assert.equal(boutiqueSettingsSchema.safeParse({ ...profile, timezone: "wrong/timezone" }).success, false);
  assert.equal(boutiqueSettingsSchema.safeParse({ ...profile, socialLink: "javascript:alert(1)" }).success, false);
  assert.equal(boutiqueSettingsSchema.safeParse({ ...profile, contactEmail: "invalid" }).success, false);
});

test("storefront pagination rejects unbounded or invalid requests", () => {
  assert.deepEqual(storefrontQuerySchema.parse({}), { q: "", city: "", page: 1, pageSize: 12 });
  assert.equal(storefrontQuerySchema.parse({ q: "  silk  ", city: " Jaipur ", page: "2", pageSize: "24" }).q, "silk");
  for (const invalid of [{ page: "0" }, { page: "1001" }, { pageSize: "25" }, { pageSize: "-1" }, { q: "x".repeat(121) }]) {
    assert.equal(storefrontQuerySchema.safeParse(invalid).success, false);
  }
});

test("public boutique projection excludes private owner and application fields", () => {
  for (const key of ["owner", "ownerId", "reviewedBy", "reviewedById", "reviewEvents", "rejectionReason", "version"])
    assert.equal(key in publicBoutiqueSelect, false, `Public storefront must not expose ${key}`);
});
