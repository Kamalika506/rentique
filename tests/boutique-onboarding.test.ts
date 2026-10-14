import assert from "node:assert/strict";
import { test } from "node:test";
import { boutiqueRegistrationSchema, type BoutiqueRegistration } from "../src/features/boutiques/onboarding/schema";
import { createDemoOnboardingService } from "../src/features/boutiques/adapters/mock/onboarding";
import { canPresentManagement, OnboardingServiceError } from "../src/features/boutiques/onboarding/service";

const valid: BoutiqueRegistration = { name: " Silk Atelier ", description: "A curated collection of occasion wear.", contactEmail: "atelier@example.com", phone: "+91 98765 43210", address: "12 Atelier Lane", city: "Jaipur", state: "Rajasthan", postalCode: "302001", categories: ["Ethnic wear"], socialLink: "" };

test("registration validates required fields, categories, phone and safe social URLs", () => {
  assert.equal(boutiqueRegistrationSchema.parse(valid).name, "Silk Atelier");
  for (const invalid of [{ ...valid, name: " " }, { ...valid, description: "Too short" }, { ...valid, contactEmail: "invalid" }, { ...valid, phone: "123" }, { ...valid, categories: [] }, { ...valid, categories: ["Unknown"] }, { ...valid, postalCode: "!" }, { ...valid, socialLink: "javascript:alert(1)" }]) {
    assert.equal(boutiqueRegistrationSchema.safeParse(invalid).success, false);
  }
  assert.equal(boutiqueRegistrationSchema.safeParse({ ...valid, socialLink: "https://example.com/atelier" }).success, true);
});

test("demo always creates PENDING, copies its data and clears with a new session", async () => {
  const service = createDemoOnboardingService(0);
  assert.equal(await service.getCurrentApplication(), null);
  const created = await service.createApplication(valid);
  assert.equal(created.status, "PENDING");
  assert.equal(created.details.name, "Silk Atelier");
  created.details.name = "Changed outside adapter";
  assert.equal((await service.getCurrentApplication())?.details.name, "Silk Atelier");
  await assert.rejects(service.createApplication(valid), OnboardingServiceError);
  assert.equal(await createDemoOnboardingService(0).getCurrentApplication(), null);
});

test("invalid and concurrent submissions cannot create duplicate demo applications", async () => {
  const service = createDemoOnboardingService(0);
  await assert.rejects(service.createApplication({ ...valid, categories: [] }));
  assert.equal(await service.getCurrentApplication(), null);
  const results = await Promise.allSettled([service.createApplication(valid), service.createApplication(valid)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
});

test("only live approved status can present management; demo status never grants access", async () => {
  const application = await createDemoOnboardingService(0).createApplication(valid);
  assert.equal(canPresentManagement(null, "live"), false);
  for (const status of ["PENDING", "REJECTED", "APPROVED"] as const) {
    assert.equal(canPresentManagement({ ...application, status }, "demo"), false);
    assert.equal(canPresentManagement({ ...application, status }, "live"), status === "APPROVED");
  }
});
