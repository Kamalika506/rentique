import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "../../src/generated/prisma/client";
import { databaseInventory } from "../../src/features/recommendations/inventory";

// Opt in with a migrated, disposable database and an app using the same URL.
const enabled = Boolean(process.env.RENTIQUE_TEST_URL && process.env.DATABASE_URL);
test("customer orders reach their boutique and lifecycle updates reach the customer", { skip: !enabled }, async () => {
  const db = new PrismaClient();
  const base = process.env.RENTIQUE_TEST_URL!;
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Use a local disposable test app.");
  const suffix = randomUUID(), password = "Rentique-test-123!";
  const passwordHash = await hash(password, 4);
  const userIds: string[] = [];
  function client() {
    const cookies = new Map<string, string>();
    return async (path: string, method = "GET", body?: unknown, form = false) => {
      const response = await fetch(base + path, { method, redirect: "manual", headers: { Origin: base, Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "), ...(body ? { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" } : {}) }, body: body ? form ? String(body) : JSON.stringify(body) : undefined });
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0], equals = pair.indexOf("="); cookies.set(pair.slice(0, equals), pair.slice(equals + 1)); }
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      return { status: response.status, data };
    };
  }
  type Client = ReturnType<typeof client>;
  async function login(request: Client, email: string) {
    const csrf = await request("/api/auth/csrf");
    const result = await request("/api/auth/callback/credentials", "POST", new URLSearchParams({ csrfToken: csrf.data.csrfToken, email, password, callbackUrl: base + "/profile" }), true);
    assert.ok([200, 302].includes(result.status), JSON.stringify(result.data));
    assert.equal((await request("/api/profile")).status, 200, "credentials created an authenticated session");
  }
  try {
    const owner = await db.user.create({ data: { name: "Test owner", email: `owner-${suffix}@example.com`, passwordHash } }); userIds.push(owner.id);
    const foreign = await db.user.create({ data: { name: "Other owner", email: `foreign-${suffix}@example.com`, passwordHash, role: "BOUTIQUE_OWNER" } }); userIds.push(foreign.id);
    await db.boutique.create({ data: { ownerId: foreign.id, name: "Other boutique", description: "Another approved test boutique", contactEmail: foreign.email!, phone: "9000000000", address: "Other street", city: "Pune", state: "Maharashtra", postalCode: "411001", categories: ["ETHNIC_WEAR"], status: "APPROVED" } });
    const admin = await db.user.create({ data: { name: "Test admin", email: `admin-${suffix}@example.com`, passwordHash, role: "ADMIN" } }); userIds.push(admin.id);
    const anonymous = client(), customerClient = client(), ownerClient = client(), otherClient = client(), adminClient = client();
    const email = `customer-${suffix}@example.com`;
    const registration = await anonymous("/api/register", "POST", { name: "Test customer", email, password });
    assert.equal(registration.status, 201); userIds.push(registration.data.user.id);
    await login(customerClient, email); await login(ownerClient, owner.email!); await login(otherClient, foreign.email!); await login(adminClient, admin.email!);
    assert.equal((await anonymous("/api/bookings")).status, 401);
    assert.equal((await customerClient("/api/boutique/products")).status, 403);
    const submitted = await ownerClient("/api/boutique/application", "POST", { name: "Connected boutique", description: "Test boutique supplying customer rental orders.", contactEmail: owner.email, phone: "9000000000", address: "Test street", city: "Pune", state: "Maharashtra", postalCode: "411001", categories: ["Ethnic wear"], socialLink: "" });
    assert.equal(submitted.status, 201); assert.equal(submitted.data.status, "PENDING");
    assert.equal((await ownerClient("/api/boutique/products")).status, 403);
    assert.equal((await customerClient("/api/admin/boutiques", "PATCH", { id: submitted.data.id, status: "APPROVED" })).status, 403);
    assert.equal((await adminClient("/api/admin/boutiques", "PATCH", { id: submitted.data.id, status: "APPROVED" })).status, 200);
    const product = await ownerClient("/api/boutique/products", "POST", { input: { name: "Test rental outfit", description: "A real database backed outfit for rental testing.", category: "Ethnic wear", occasionTags: ["wedding"], colours: ["red"], size: "M", fabricStyle: "Silk saree", rentalPriceMinor: 10000, depositMinor: 25000, quantity: 1, images: [] } });
    assert.equal(product.status, 201);
    const listing = await anonymous("/api/products?id=" + product.data.id);
    assert.equal(listing.status, 200); assert.equal(listing.data.boutique.id, submitted.data.id);
    assert.equal((await anonymous("/api/wishlist")).status, 401);
    assert.equal((await customerClient("/api/wishlist", "POST", { productId: product.data.id })).status, 200);
    assert.deepEqual((await customerClient("/api/wishlist")).data, [product.data.id]);
    assert.equal((await customerClient("/api/wishlist", "DELETE", { productId: product.data.id })).status, 200);
    assert.deepEqual((await customerClient("/api/wishlist")).data, []);
    const crossOrigin = await fetch(base + "/api/bookings", { method: "POST", headers: { Origin: "https://other.example", "Content-Type": "application/json" }, body: "{}" });
    assert.equal(crossOrigin.status, 403);
    const pickup = new Date(Date.now() + 2 * 86400000), returned = new Date(pickup.getTime() + 3 * 86400000);
    const order = { variantId: listing.data.variants[0].id, quantity: 1, pickupAt: pickup.toISOString(), returnAt: returned.toISOString(), rentalMinor: 1 };
    const recommendationQuery = { occasion: "wedding" as const, totalRentalBudget: 1000, outfitType: "any" as const, colourPreference: "red", jewelleryPreference: "none" as const, lookMode: "outfit" as const, rentalDates: { start: pickup.toISOString().slice(0, 10), end: returned.toISOString().slice(0, 10) } };
    const candidates = await databaseInventory.search(recommendationQuery, new AbortController().signal);
    assert.equal(candidates.find(candidate => candidate.id === product.data.id)?.rentalMinor, 30000);
    assert.equal((await anonymous("/api/bookings", "POST", order)).status, 401);
    const simultaneous = await Promise.all([customerClient("/api/bookings", "POST", order), customerClient("/api/bookings", "POST", order)]);
    assert.deepEqual(simultaneous.map(result => result.status).sort(), [201, 409]);
    let booking = simultaneous.find(result => result.status === 201)!.data;
    assert.ok(!(await databaseInventory.search(recommendationQuery, new AbortController().signal)).some(candidate => candidate.id === product.data.id), "recommendations exclude reserved stock");
    assert.equal(booking.rentalMinor, 30000); assert.equal(booking.depositMinor, 25000);
    assert.equal((await ownerClient("/api/boutique/bookings")).data.items[0].id, booking.id);
    assert.equal((await otherClient("/api/boutique/bookings?id=" + booking.id)).status, 404);
    assert.equal((await otherClient("/api/boutique/bookings", "PATCH", { id: booking.id, version: booking.version, command: { action: "CONFIRM" } })).status, 404);
    assert.equal((await otherClient("/api/boutique/products", "PUT", { id: product.data.id, version: 1, input: product.data })).status, 404);
    assert.equal((await ownerClient("/api/boutique/bookings", "PATCH", { id: booking.id, version: booking.version, command: { action: "COMPLETE" } })).status, 409);
    async function action(command: unknown) {
      const updated = await ownerClient("/api/boutique/bookings", "PATCH", { id: booking.id, version: booking.version, command });
      assert.equal(updated.status, 200, JSON.stringify(updated.data)); booking = updated.data;
    }
    await action({ action: "CONFIRM" });
    assert.equal((await customerClient("/api/bookings")).data[0].status, "CONFIRMED");
    assert.equal((await ownerClient("/api/boutique/bookings", "PATCH", { id: booking.id, version: 1, command: { action: "CANCEL", reason: "Stale command" } })).status, 409);
    const calendar = await ownerClient("/api/boutique/calendar?month=" + pickup.toISOString().slice(0, 7));
    assert.ok(calendar.data.some((event: { bookingId: string }) => event.bookingId === booking.id));
    await action({ action: "PICK_UP" }); await action({ action: "RETURN" });
    assert.equal((await ownerClient("/api/boutique/bookings", "PATCH", { id: booking.id, version: booking.version, command: { action: "COMPLETE" } })).status, 409);
    await action({ action: "RECORD_INSPECTION", condition: "GOOD", notes: "Returned in good condition" }); await action({ action: "COMPLETE" });
    assert.equal((await customerClient("/api/bookings")).data[0].status, "COMPLETED");
    const snapshot = await ownerClient("/api/boutique/dashboard");
    assert.equal(snapshot.data.summary.completedRentalRevenueMinor, 30000);
    assert.equal((await ownerClient("/api/boutique/analytics")).data.bookings[0].status, "COMPLETED");
    const next = await customerClient("/api/bookings", "POST", order); assert.equal(next.status, 201);
    assert.equal((await customerClient("/api/bookings", "PATCH", { id: next.data.id, version: next.data.version, reason: "Plans changed" })).status, 200);
    const archive = await ownerClient("/api/boutique/products", "PATCH", { id: product.data.id, version: product.data.version, archived: true }); assert.equal(archive.status, 200);
    assert.equal((await anonymous("/api/products?id=" + product.data.id)).status, 404);
    assert.equal((await customerClient("/api/bookings", "POST", order)).status, 404);
    assert.equal((await customerClient("/api/bookings")).data.length, 2, "archiving preserves customer order history");
  } finally {
    await db.booking.deleteMany({ where: { customerId: { in: userIds } } });
    await db.product.deleteMany({ where: { boutique: { ownerId: { in: userIds } } } });
    await db.boutique.deleteMany({ where: { ownerId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
