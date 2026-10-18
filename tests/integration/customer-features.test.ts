import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "../../src/generated/prisma/client";

const enabled = Boolean(process.env.RENTIQUE_TEST_URL && process.env.DATABASE_URL);
test("customer discovery, verified same-shop reservations, partial returns, reminders and reports", { skip: !enabled }, async () => {
  const db = new PrismaClient(), base = process.env.RENTIQUE_TEST_URL!;
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a disposable local application/database.");
  const suffix = randomUUID(), password = "Customer-features-123!", passwordHash = await hash(password, 4);
  const users: string[] = [], shops: string[] = [];
  function client() {
    const cookies = new Map<string, string>();
    return async (path: string, method = "GET", body?: unknown, extraHeaders: Record<string, string> = {}) => {
      const form = body instanceof URLSearchParams;
      const response = await fetch(base + path, { method, redirect: "manual", headers: { Origin: base, Cookie: [...cookies].map(([key, value]) => key + "=" + value).join("; "), ...(body === undefined ? {} : { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" }), ...extraHeaders }, body: body === undefined ? undefined : form ? body.toString() : JSON.stringify(body) });
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0], index = pair.indexOf("="); cookies.set(pair.slice(0, index), pair.slice(index + 1)); }
      const raw = await response.text(); let data; try { data = JSON.parse(raw); } catch { data = raw; }
      return { status: response.status, data };
    };
  }
  type Client = ReturnType<typeof client>;
  async function login(request: Client, email: string) {
    const csrf = await request("/api/auth/csrf");
    await request("/api/auth/callback/credentials", "POST", new URLSearchParams({ csrfToken: csrf.data.csrfToken, email, password, callbackUrl: base + "/profile" }));
    assert.equal((await request("/api/profile")).status, 200);
  }
  async function user(role: "CUSTOMER" | "BOUTIQUE_OWNER" | "ADMIN", verified = true) {
    const record = await db.user.create({ data: { name: "Feature " + role, email: randomUUID() + "@example.com", passwordHash, role, emailVerified: verified ? new Date() : null, phone: "9000000000" } }); users.push(record.id); return record;
  }
  try {
    const customer = await user("CUSTOMER"), other = await user("CUSTOMER"), unverified = await user("CUSTOMER", false), owner = await user("BOUTIQUE_OWNER"), otherOwner = await user("BOUTIQUE_OWNER"), admin = await user("ADMIN");
    async function shop(ownerId: string) {
      const record = await db.boutique.create({ data: { ownerId, name: "Feature shop " + suffix, description: "Verified test shop for customer reservation flows.", contactEmail: "shop@example.com", phone: "9000000000", address: "Test street", city: "Feature City " + suffix, state: "Maharashtra", postalCode: "411001", categories: ["ETHNIC_WEAR", "ACCESSORIES"], status: "APPROVED", openingHours: "Monday–Saturday 10:00–19:00", rentalPolicy: "Collect and return the full set at the shop." } }); shops.push(record.id); return record;
    }
    const firstShop = await shop(owner.id), secondShop = await shop(otherOwner.id);
    async function product(boutiqueId: string, name: string, garmentType: string, price: number, size: string, quantity: number) {
      return db.product.create({ data: { boutiqueId, name, description: "A real test inventory item for a wedding celebration.", category: garmentType === "jewellery" ? "ACCESSORIES" : "ETHNIC_WEAR", garmentType, occasionTags: ["wedding"], colours: ["red"], fabricStyle: "Traditional silk", includedPieces: ["Main garment", "Matching piece"], rentalPriceMinor: price, variants: { create: { size, quantity, measurements: "Chest 92 cm; waist 76 cm" } } }, include: { variants: true } });
    }
    const outfit = await product(firstShop.id, "Feature red lehenga", "lehenga", 10000, "M", 2), jewellery = await product(firstShop.id, "Feature gold jewellery", "jewellery", 2000, "FREE_SIZE", 1), foreign = await product(secondShop.id, "Other shop outfit", "lehenga", 10000, "M", 1);
    const visitor = client(), customerApi = client(), otherApi = client(), unverifiedApi = client(), ownerApi = client(), otherOwnerApi = client(), adminApi = client();
    await Promise.all([login(customerApi, customer.email!), login(otherApi, other.email!), login(unverifiedApi, unverified.email!), login(ownerApi, owner.email!), login(otherOwnerApi, otherOwner.email!), login(adminApi, admin.email!)]);
    const start = new Date(Date.now() + 4 * 86400000), end = new Date(start.getTime() + 2 * 86400000);
    const dates = { pickupAt: start.toISOString(), returnAt: end.toISOString() };
    const selection = { ...dates, items: [{ variantId: outfit.variants[0].id, quantity: 2 }, { variantId: jewellery.variants[0].id, quantity: 1 }] };
    const filtered = await visitor("/api/products?" + new URLSearchParams({ paged: "1", city: firstShop.city, garmentType: "lehenga", size: "M", ...dates }));
    assert.equal(filtered.status, 200); assert.equal(filtered.data.total, 2);
    assert.equal((await visitor("/api/products?id=" + outfit.id)).data.variants[0].measurements, "Chest 92 cm; waist 76 cm");
    assert.equal((await visitor("/api/products?id=" + outfit.id)).data.boutique.openingHours, firstShop.openingHours);
    assert.equal((await visitor("/api/bookings", "POST", {})).status, 401);
    assert.equal((await customerApi("/api/basket", "POST", { variantId: outfit.variants[0].id, quantity: 2 })).status, 200);
    assert.equal((await customerApi("/api/basket", "POST", { variantId: jewellery.variants[0].id, quantity: 1 })).status, 200);
    assert.equal((await customerApi("/api/basket", "POST", { variantId: foreign.variants[0].id, quantity: 1 })).status, 409);
    assert.equal((await otherApi("/api/basket")).data.length, 0);
    const quote = await customerApi("/api/quotes", "POST", selection); assert.equal(quote.status, 201, JSON.stringify(quote.data)); assert.equal(quote.data.rentalMinor, 44000);
    const key = randomUUID();
    assert.equal((await customerApi("/api/bookings", "POST", { quoteId: quote.data.quoteId, acceptedTerms: true, rentalMinor: 1 }, { "Idempotency-Key": key })).status, 400, "Client-supplied totals are rejected.");
    assert.equal((await unverifiedApi("/api/bookings", "POST", { quoteId: quote.data.quoteId, acceptedTerms: true }, { "Idempotency-Key": key })).status, 403);
    assert.equal((await otherApi("/api/bookings", "POST", { quoteId: quote.data.quoteId, acceptedTerms: true }, { "Idempotency-Key": key })).status, 409);
    const duplicateRequests = await Promise.all([1, 2].map(() => customerApi("/api/bookings", "POST", { quoteId: quote.data.quoteId, acceptedTerms: true }, { "Idempotency-Key": key })));
    assert.ok(duplicateRequests.every(result => result.status === 201), JSON.stringify(duplicateRequests));
    assert.equal(duplicateRequests[0].data.id, duplicateRequests[1].data.id);
    let booking = duplicateRequests[0].data;
    const retry = await customerApi("/api/bookings", "POST", { quoteId: quote.data.quoteId, acceptedTerms: true }, { "Idempotency-Key": key }); assert.equal(retry.data.id, booking.id);
    assert.equal(await db.booking.count({ where: { customerId: customer.id } }), 1);
    assert.equal((await customerApi("/api/basket")).data.length, 0);
    assert.equal((await otherOwnerApi("/api/boutique/bookings?id=" + booking.id)).status, 404);
    const unavailable = await visitor("/api/products?" + new URLSearchParams({ paged: "1", boutiqueId: firstShop.id, ...dates })); assert.equal(unavailable.data.total, 0);
    assert.equal((await customerApi("/api/quotes", "POST", selection)).status, 409);
    async function action(command: unknown) { const result = await ownerApi("/api/boutique/bookings", "PATCH", { id: booking.id, version: booking.version, command }); assert.equal(result.status, 200, JSON.stringify(result.data)); booking = result.data; }
    await action({ action: "CONFIRM" });
    assert.equal((await ownerApi("/api/boutique/bookings", "PATCH", { id: booking.id, version: booking.version, command: { action: "PICK_UP" } })).status, 409, "Cannot hand over before agreed pickup.");
    // Simulate arrival of the pickup window without changing server time.
    await db.booking.update({ where: { id: booking.id }, data: { pickupAt: new Date(Date.now() - 60000) } });
    await action({ action: "PICK_UP" });
    const line = booking.products.find((item: { id: string }) => item.id === outfit.id);
    assert.equal((await otherApi("/api/bookings", "PATCH", { id: booking.id, version: booking.version, reason: "Wrong customer" })).status, 409);
    assert.equal((await customerApi("/api/bookings", "PATCH", { id: booking.id, version: booking.version, command: { action: "RETURN" } })).status, 400);
    await action({ action: "RETURN", items: [{ itemId: line.itemId, quantity: 1 }] });
    assert.equal(booking.status, "PICKED_UP"); assert.equal(booking.partiallyReturned, true);
    assert.equal((await customerApi("/api/bookings")).data[0].products.find((item: { id: string }) => item.id === outfit.id).returnedQuantity, 1);
    assert.equal((await ownerApi("/api/boutique/bookings", "PATCH", { id: booking.id, version: booking.version, command: { action: "RETURN", items: [{ itemId: line.itemId, quantity: 2 }] } })).status, 400);
    await action({ action: "RETURN" }); assert.equal(booking.status, "RETURNED");
    await action({ action: "RECORD_INSPECTION", condition: "GOOD", notes: "All pieces received." }); await action({ action: "COMPLETE" });
    assert.equal((await ownerApi("/api/boutique/bookings", "PATCH", { id: booking.id, version: booking.version, command: { action: "MARK_READY" } })).status, 409);
    for (const productId of [outfit.id, jewellery.id]) assert.equal((await customerApi("/api/reviews", "POST", { bookingId: booking.id, productId, rating: 5, comment: "A good shop rental experience." })).status, 201);
    assert.equal((await customerApi("/api/reviews", "POST", { bookingId: booking.id, productId: outfit.id, rating: 5 })).status, 409);
    const report = await customerApi("/api/support", "POST", { bookingId: booking.id, subject: "Question about returned pieces", message: "Please check the shop acknowledgement for my returned items." }); assert.equal(report.status, 201);
    assert.equal((await otherApi("/api/support")).data.length, 0);
    assert.equal((await customerApi("/api/admin/support")).status, 403);
    const response = await adminApi("/api/admin/support", "PATCH", { id: report.data.id, version: report.data.version, status: "RESOLVED", response: "All returns are acknowledged." }); assert.equal(response.status, 200);
    assert.equal((await customerApi("/api/support")).data[0].response, "All returns are acknowledged.");
    assert.ok((await customerApi("/api/notifications")).data.length >= 4);
    const changed = await customerApi("/api/quotes", "POST", { ...dates, items: [{ variantId: foreign.variants[0].id, quantity: 1 }] }); assert.equal(changed.status, 201);
    await db.product.update({ where: { id: foreign.id }, data: { rentalPriceMinor: 20000, version: { increment: 1 } } });
    assert.equal((await customerApi("/api/bookings", "POST", { quoteId: changed.data.quoteId, acceptedTerms: true }, { "Idempotency-Key": randomUUID() })).status, 409);
    const concurrentSelection = { ...dates, items: [{ variantId: foreign.variants[0].id, quantity: 1 }] };
    const [q1, q2] = await Promise.all([customerApi("/api/quotes", "POST", concurrentSelection), otherApi("/api/quotes", "POST", concurrentSelection)]);
    const requests = await Promise.all([customerApi("/api/bookings", "POST", { quoteId: q1.data.quoteId, acceptedTerms: true }, { "Idempotency-Key": randomUUID() }), otherApi("/api/bookings", "POST", { quoteId: q2.data.quoteId, acceptedTerms: true }, { "Idempotency-Key": randomUUID() })]);
    assert.deepEqual(requests.map(result => result.status).sort(), [201, 409]);
    const winning = requests.find(result => result.status === 201)!.data;
    await db.booking.update({ where: { id: winning.id }, data: { requestExpiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await customerApi("/api/quotes", "POST", concurrentSelection)).status, 201, "Expired holds release availability even before the worker runs.");
    if (process.env.JOBS_SECRET) {
      assert.equal((await visitor("/api/internal/notifications", "POST", {})).status, 401);
      const jobs = await visitor("/api/internal/notifications", "POST", {}, { Authorization: "Bearer " + process.env.JOBS_SECRET });
      assert.equal(jobs.status, 200, JSON.stringify(jobs.data));
      assert.equal((await db.booking.findUniqueOrThrow({ where: { id: winning.id } })).status, "EXPIRED");
      assert.equal((await visitor("/api/internal/notifications", "POST", {}, { Authorization: "Bearer " + process.env.JOBS_SECRET })).data.expired, 0);
    }
  } finally {
    await db.supportRequest.deleteMany({ where: { userId: { in: users } } });
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.basketItem.deleteMany({ where: { userId: { in: users } } });
    await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
    await db.booking.deleteMany({ where: { customerId: { in: users } } });
    await db.product.deleteMany({ where: { boutiqueId: { in: shops } } });
    await db.boutique.deleteMany({ where: { id: { in: shops } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});
