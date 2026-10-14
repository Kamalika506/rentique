import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient, type UserRole, type BoutiqueStatus } from "../../src/generated/prisma/client";

// Opt in only with a migrated, disposable database and a local app using that URL.
const enabled = Boolean(process.env.RENTIQUE_TEST_URL && process.env.DATABASE_URL);

test("connected discovery, storefronts, admin, availability, reviews and recovery", { skip: !enabled }, async () => {
  const db = new PrismaClient();
  const base = process.env.RENTIQUE_TEST_URL!.replace(/\/$/, "");
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use an isolated localhost test app.");
  const suffix = randomUUID(), password = "Rentique-modules-123!", updatedPassword = "Rentique-new-password-456!";
  const passwordHash = await hash(password, 4), city = `Module City ${suffix}`;
  const userIds: string[] = [], categoryIds: string[] = [], boutiqueIds: string[] = [], fixtureEmails: string[] = [];
  const recoveryEmail = `rate-${suffix}@example.com`;

  function client() {
    const cookies = new Map<string, string>();
    return async (path: string, method = "GET", body?: unknown, form = false) => {
      const response = await fetch(base + path, {
        method, redirect: "manual", headers: { Origin: base, Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; "), ...(body === undefined ? {} : { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" }) },
        body: body === undefined ? undefined : form ? String(body) : JSON.stringify(body),
      });
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0], equals = pair.indexOf("="); cookies.set(pair.slice(0, equals), pair.slice(equals + 1)); }
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      return { status: response.status, data, headers: response.headers };
    };
  }
  type Client = ReturnType<typeof client>;
  async function credentials(request: Client, email: string, submittedPassword = password) {
    const csrf = await request("/api/auth/csrf"); assert.equal(csrf.status, 200);
    return request("/api/auth/callback/credentials", "POST", new URLSearchParams({ csrfToken: csrf.data.csrfToken, email, password: submittedPassword, callbackUrl: base + "/profile" }), true);
  }
  async function login(request: Client, email: string, submittedPassword = password) {
    const response = await credentials(request, email, submittedPassword);
    assert.ok([200, 302].includes(response.status), JSON.stringify(response.data));
    assert.equal((await request("/api/profile")).status, 200, `Login failed for ${email}`);
  }
  async function redirectedPage(request: Client, path: string, target: string) {
    const response = await request(path);
    const location = response.headers.get("location");
    if ([303, 307, 308].includes(response.status)) assert.equal(location, target, `${path} redirect destination`);
    else {
      assert.equal(response.status, 200, `${path} streamed redirect HTTP status`);
      assert.equal(typeof response.data, "string");
      const html = String(response.data);
      assert.ok(html.includes(`NEXT_REDIRECT;replace;${target};`) || html.includes(`NEXT_REDIRECT;push;${target};`) || html.includes(`0;url=${target}`), `${path} must stream a redirect to ${target}`);
    }
  }
  async function authorizedPage(request: Client, path: string) {
    const response = await request(path);
    assert.equal(response.status, 200, `${path} authorized HTML status`);
    assert.equal(typeof response.data, "string");
    assert.ok(String(response.data).includes("<html"), `${path} returns page HTML`);
    assert.ok(!String(response.data).includes("NEXT_REDIRECT;"), `${path} must not redirect an authorized account`);
  }
  async function user(label: string, role: UserRole, isActive = true) {
    const email = `${label}-${suffix}@example.com`; fixtureEmails.push(email);
    const record = await db.user.create({ data: { name: `Modules ${label} ${suffix}`, email, emailVerified: new Date(), passwordHash, role, isActive } });
    userIds.push(record.id); return record;
  }
  async function boutique(ownerId: string, label: string, status: BoutiqueStatus = "APPROVED") {
    const record = await db.boutique.create({ data: { ownerId, name: `Modules ${label} ${suffix}`, description: "An isolated test boutique with a connected rental collection.", contactEmail: `${label}-${suffix}@example.com`, phone: "9000000000", address: "12 Test Lane", city, state: "Rajasthan", postalCode: "302001", categories: ["ETHNIC_WEAR"], status } });
    boutiqueIds.push(record.id); return record;
  }
  const anonymous = client(), adminClient = client(), customerClient = client(), foreignCustomerClient = client(), ownerClient = client(), pendingClient = client();

  try {
    const admin = await user("admin", "ADMIN"), customer = await user("customer", "CUSTOMER"), foreignCustomer = await user("foreign-customer", "CUSTOMER");
    const owner = await user("owner", "BOUTIQUE_OWNER"), pendingOwner = await user("pending-owner", "BOUTIQUE_OWNER"), inactiveOwner = await user("inactive-owner", "BOUTIQUE_OWNER", false);
    const shop = await boutique(owner.id, "approved"), pendingShop = await boutique(pendingOwner.id, "pending", "PENDING"), inactiveShop = await boutique(inactiveOwner.id, "inactive");
    await login(adminClient, admin.email!); await login(customerClient, customer.email!); await login(foreignCustomerClient, foreignCustomer.email!); await login(ownerClient, owner.email!); await login(pendingClient, pendingOwner.email!);

    for (const [request, expectedRole] of [[adminClient, "ADMIN"], [customerClient, "CUSTOMER"], [ownerClient, "BOUTIQUE_OWNER"]] as const) {
      const session = await request("/api/auth/session");
      assert.equal(session.status, 200); assert.equal(session.data.user.role, expectedRole);
      assert.equal("passwordHash" in session.data.user, false); assert.equal("password" in session.data.user, false);
    }
    await redirectedPage(anonymous, "/profile", "/login");
    await redirectedPage(anonymous, "/admin/bookings", "/login?intent=admin");
    await redirectedPage(customerClient, "/admin/bookings", "/profile");
    await redirectedPage(anonymous, "/boutique/dashboard", "/login?intent=boutique");
    await redirectedPage(customerClient, "/boutique/dashboard", "/profile");
    await redirectedPage(pendingClient, "/boutique/dashboard", "/boutique/pending");
    await redirectedPage(ownerClient, "/my-rentals", "/profile");
    await authorizedPage(customerClient, "/my-rentals");
    await authorizedPage(ownerClient, "/boutique/dashboard");
    await authorizedPage(pendingClient, "/boutique/settings");
    await authorizedPage(adminClient, "/admin/bookings");

    assert.equal((await anonymous("/api/admin/users")).status, 401);
    for (const path of ["/api/admin/users", "/api/admin/bookings", "/api/admin/dashboard", "/api/admin/categories", "/api/admin/reviews", "/api/admin/activity"])
      assert.equal((await customerClient(path)).status, 403, `Customer must not access ${path}`);
    assert.equal((await ownerClient("/api/admin/bookings")).status, 403);
    assert.equal((await adminClient("/api/admin/users", "PATCH", { id: admin.id, isActive: false, reason: "Test own account guard" })).status, 400);
    assert.equal((await adminClient("/api/admin/users", "PATCH", { id: foreignCustomer.id, isActive: true, role: "ADMIN", reason: "Attempt privilege escalation" })).status, 400);
    const users = await adminClient(`/api/admin/users?q=${suffix}`);
    assert.equal(users.status, 200); assert.equal(users.data.total, userIds.length);
    assert.ok(users.data.items.every((item: { passwordHash?: string }) => !("passwordHash" in item)), "Admin lists must not expose password hashes.");

    const createdCategory = await adminClient("/api/admin/categories", "POST", { name: `Modules category ${suffix}`, slug: `module-${suffix}`, isActive: true });
    assert.equal(createdCategory.status, 201, JSON.stringify(createdCategory.data));
    let category = createdCategory.data; categoryIds.push(category.id);
    assert.equal((await customerClient("/api/admin/categories", "POST", { name: "Injected", slug: "injected-category" })).status, 403);

    async function product(name: string, colour: string, size: string, price: number, occasion: string, categoryValue: string) {
      const response = await ownerClient("/api/boutique/products", "POST", { input: { name: `Modules ${name} ${suffix}`, description: "A connected outfit created for isolated module verification.", category: categoryValue, occasionTags: [occasion], colours: [colour], size, fabricStyle: "Silk test outfit", rentalPriceMinor: price, depositMinor: 20000, quantity: 3, images: [] } });
      assert.equal(response.status, 201, JSON.stringify(response.data)); return response.data;
    }
    const red = await product("red outfit", "Red", "L", 10000, "Wedding", category.id);
    const blue = await product("blue outfit", "Blue", "M", 30000, "Reception", category.id);
    const gold = await product("gold outfit", "Gold", "S", 25000, "Wedding", "Ethnic wear");
    const redListing = await anonymous(`/api/products?id=${red.id}`); assert.equal(redListing.status, 200);
    const variantId: string = redListing.data.variants[0].id;
    const hiddenProduct = async (boutiqueId: string, label: string, archived = false) => db.product.create({ data: { boutiqueId, name: `Modules ${label} ${suffix}`, description: "Hidden fixture product for public visibility checks.", category: "ETHNIC_WEAR", occasionTags: ["Wedding"], colours: ["Red"], fabricStyle: "Silk", rentalPriceMinor: 10000, depositMinor: 20000, archived, variants: { create: { size: "L", quantity: 3 } } } });
    const archived = await hiddenProduct(shop.id, "archived", true), pendingProduct = await hiddenProduct(pendingShop.id, "pending"), inactiveProduct = await hiddenProduct(inactiveShop.id, "inactive");

    async function discovery(extra: Record<string, string> = {}) {
      return anonymous(`/api/products?${new URLSearchParams({ paged: "1", search: suffix, pageSize: "12", ...extra })}`);
    }
    const all = await discovery(); assert.equal(all.status, 200); assert.equal(all.data.total, 3);
    for (const [extra, expected] of [
      [{ category: category.slug }, 2], [{ occasion: "wedding" }, 2], [{ colour: "blue" }, 1], [{ size: "s" }, 1], [{ maxPrice: "200" }, 1], [{ minPrice: "200" }, 2],
    ] as const) assert.equal((await discovery(extra)).data.total, expected, JSON.stringify(extra));
    const combined = await discovery({ category: category.slug, occasion: "wedding", colour: "red", size: "l", minPrice: "90", maxPrice: "110" });
    assert.deepEqual(combined.data.items.map((item: { id: string }) => item.id), [red.id]);
    assert.equal((await discovery({ colour: "purple" })).data.total, 0);
    assert.equal((await discovery({ maxPrice: "-1" })).status, 400);
    const first = await discovery({ page: "1", pageSize: "1", sort: "price-low" }), second = await discovery({ page: "2", pageSize: "1", sort: "price-low" });
    assert.equal(first.data.totalPages, 3); assert.equal(first.data.items[0].id, red.id); assert.equal(second.data.items[0].id, gold.id);
    assert.equal((await discovery({ page: "0" })).status, 400);
    for (const id of [archived.id, pendingProduct.id, inactiveProduct.id]) assert.equal((await anonymous(`/api/products?id=${id}`)).status, 404);

    const directory = await anonymous(`/api/boutiques?city=${encodeURIComponent(city)}`);
    assert.equal(directory.status, 200); assert.equal(directory.data.total, 1); assert.equal(directory.data.items[0].id, shop.id); assert.equal(directory.data.items[0].productCount, 3);
    const storefront = await anonymous(`/api/boutiques/${shop.id}`);
    assert.equal(storefront.status, 200); assert.equal(storefront.data.productCount, 3);
    for (const key of ["owner", "ownerId", "reviewedById", "rejectionReason", "reviewEvents", "version"]) assert.equal(key in storefront.data, false, `Public storefront leaked ${key}`);
    assert.equal((await anonymous(`/api/boutiques/${pendingShop.id}`)).status, 404); assert.equal((await anonymous(`/api/boutiques/${inactiveShop.id}`)).status, 404);
    assert.equal((await anonymous(`/api/products?paged=1&boutiqueId=${shop.id}`)).data.total, 3);
    assert.equal((await anonymous("/api/boutique/settings")).status, 401); assert.equal((await customerClient("/api/boutique/settings")).status, 403);
    assert.equal((await pendingClient("/api/boutique/settings")).status, 200, "Pending owners can maintain contact details.");
    const settings = (await ownerClient("/api/boutique/settings")).data;
    const updateProfile = { name: `${settings.name} updated`, description: settings.description, contactEmail: settings.contactEmail, phone: settings.phone, address: settings.address, city: settings.city, state: settings.state, postalCode: settings.postalCode, socialLink: settings.socialLink ?? "", timezone: settings.timezone, version: settings.version };
    assert.equal((await ownerClient("/api/boutique/settings", "PATCH", { ...updateProfile, status: "APPROVED" })).status, 400);
    assert.equal((await ownerClient("/api/boutique/settings", "PATCH", { ...updateProfile, ownerId: foreignCustomer.id })).status, 400);
    const savedProfile = await ownerClient("/api/boutique/settings", "PATCH", updateProfile);
    assert.equal(savedProfile.status, 200); assert.equal(savedProfile.data.version, settings.version + 1); assert.equal(savedProfile.data.status, "APPROVED");
    assert.equal((await ownerClient("/api/boutique/settings", "PATCH", updateProfile)).status, 409);
    assert.equal((await anonymous(`/api/boutiques/${shop.id}`)).data.name, updateProfile.name);

    const approvedShop = await adminClient("/api/admin/boutiques", "PATCH", { id: pendingShop.id, version: pendingShop.version, status: "APPROVED" });
    assert.equal(approvedShop.status, 200, JSON.stringify(approvedShop.data));
    assert.equal(approvedShop.data.id, pendingShop.id); assert.equal(approvedShop.data.status, "APPROVED");
    assert.equal(approvedShop.data.notification.status, "not_configured", "The isolated test server must not send external email.");
    assert.equal((await db.boutique.findUniqueOrThrow({ where: { id: pendingShop.id } })).status, "APPROVED", "Approval is durable when notification delivery is unconfigured.");
    assert.equal((await pendingClient("/api/boutique/products")).status, 200); await authorizedPage(pendingClient, "/boutique/dashboard");
    assert.equal((await anonymous(`/api/boutiques/${pendingShop.id}`)).status, 200);
    const rejectedShop = await adminClient("/api/admin/boutiques", "PATCH", { id: pendingShop.id, version: approvedShop.data.version, status: "REJECTED", reason: "Test application rejection" });
    assert.equal(rejectedShop.status, 200, JSON.stringify(rejectedShop.data)); assert.equal(rejectedShop.data.id, pendingShop.id); assert.equal(rejectedShop.data.status, "REJECTED");
    assert.equal((await anonymous(`/api/boutiques/${pendingShop.id}`)).status, 404); assert.equal((await pendingClient("/api/boutique/products")).status, 403);
    await redirectedPage(pendingClient, "/boutique/dashboard", "/boutique/pending");
    assert.equal((await adminClient("/api/admin/boutiques", "PATCH", { id: pendingShop.id, version: approvedShop.data.version, status: "PENDING", reason: "Stale application decision" })).status, 409);
    assert.equal((await adminClient("/api/admin/boutiques", "PATCH", { id: pendingShop.id, version: rejectedShop.data.version, status: "PENDING", reason: "Reopen isolated application" })).status, 200);

    const dormantOwnerClient = client(); await login(dormantOwnerClient, owner.email!);
    const deactivated = await adminClient("/api/admin/users", "PATCH", { id: owner.id, isActive: false, reason: "Test storefront owner restriction" });
    assert.equal(deactivated.status, 200); assert.equal(deactivated.data.isActive, false);
    assert.equal((await anonymous(`/api/boutiques/${shop.id}`)).status, 404); assert.equal((await discovery()).data.total, 0);
    assert.equal((await ownerClient("/api/boutique/products")).status, 401);
    assert.equal((await adminClient("/api/admin/users", "PATCH", { id: owner.id, isActive: true, reason: "Restore fixture owner" })).status, 200);
    assert.equal((await dormantOwnerClient("/api/profile")).status, 401, "Reactivation must not revive sessions issued before deactivation.");
    await login(ownerClient, owner.email!);
    assert.equal((await discovery()).data.total, 3);

    const pickup = new Date(Date.now() + 3 * 86400000), returned = new Date(pickup.getTime() + 4 * 86400000);
    const order = { variantId, quantity: 3, pickupAt: pickup.toISOString(), returnAt: returned.toISOString() };
    assert.equal((await anonymous("/api/availability")).status, 401, "Guests cannot access availability.");
    assert.equal((await anonymous("/api/recommendations", "POST", {})).status, 401, "Guests cannot access date-based recommendations.");
    const quote = (start = pickup, end = returned, quantity = 1) => customerClient(`/api/availability?${new URLSearchParams({ variantId, quantity: String(quantity), pickupAt: start.toISOString(), returnAt: end.toISOString() })}`);
    const initialQuote = await quote(pickup, returned, 3); assert.equal(initialQuote.status, 200); assert.equal(initialQuote.data.available, true); assert.equal(initialQuote.data.availableUnits, 3);
    async function reservation(start: Date, end: Date, quantity: number, status: "CONFIRMED" | "COMPLETED" = "CONFIRMED", customerId = customer.id) {
      return db.booking.create({ data: { boutiqueId: shop.id, customerId, status, pickupAt: start, returnAt: end, rentalMinor: 20000, depositMinor: 20000, ...(status === "COMPLETED" ? { returnedAt: end, completedAt: end } : {}), items: { create: { variantId, quantity, productNameSnap: red.name, sizeSnapshot: "L", categorySnapshot: "OTHER", rentalMinor: 20000, depositMinor: 20000 } } } });
    }
    await reservation(pickup, new Date(pickup.getTime() + 86400000), 2);
    await reservation(new Date(pickup.getTime() + 2 * 86400000), new Date(pickup.getTime() + 3 * 86400000), 2);
    const peak = await quote(); assert.equal(peak.status, 200); assert.equal(peak.data.availableUnits, 1, "Disjoint reservations consume peak stock, not their summed quantity.");
    assert.equal(peak.data.rentalDays, 4); assert.equal(peak.data.rentalMinor, 40000); assert.equal(peak.data.depositMinor, 20000); assert.equal(peak.data.totalMinor, 60000);
    assert.equal((await quote(pickup, returned, 2)).data.available, false);
    assert.equal((await customerClient("/api/bookings", "POST", order)).status, 409, "Booking must recheck stock after a previously available quote.");
    const booked = await customerClient("/api/bookings", "POST", { ...order, quantity: 1 }); assert.equal(booked.status, 201, JSON.stringify(booked.data));
    assert.equal(booked.data.rentalMinor, 40000); assert.equal((await quote()).data.availableUnits, 0);
    assert.equal((await customerClient("/api/bookings", "PATCH", { id: booked.data.id, version: booked.data.version, reason: "Restore stock after test" })).status, 200);
    const gapStart = new Date(pickup.getTime() + 86400000), gapEnd = new Date(pickup.getTime() + 2 * 86400000);
    const gap = await quote(gapStart, gapEnd, 3); assert.equal(gap.data.availableUnits, 3); assert.equal(gap.data.available, true, "Half-open intervals permit handovers at matching boundaries.");
    assert.equal((await quote(returned, pickup)).status, 400);

    const completed = await reservation(new Date(Date.now() - 10 * 86400000), new Date(Date.now() - 8 * 86400000), 1, "COMPLETED");
    const reviewInput = { bookingId: completed.id, productId: red.id, rating: 5, comment: `A lovely completed rental ${suffix}` };
    assert.equal((await anonymous("/api/reviews", "POST", reviewInput)).status, 401);
    assert.equal((await ownerClient("/api/reviews", "POST", reviewInput)).status, 403);
    assert.equal((await foreignCustomerClient("/api/reviews", "POST", reviewInput)).status, 403);
    assert.equal((await customerClient("/api/reviews", "POST", { ...reviewInput, bookingId: booked.data.id })).status, 403);
    assert.equal((await customerClient("/api/reviews", "POST", { ...reviewInput, productId: blue.id })).status, 403);
    assert.equal((await customerClient("/api/reviews", "POST", { ...reviewInput, rating: 0 })).status, 400);
    const postedReview = await customerClient("/api/reviews", "POST", reviewInput); assert.equal(postedReview.status, 201, JSON.stringify(postedReview.data));
    assert.equal((await customerClient("/api/reviews", "POST", reviewInput)).status, 409);
    const visibleReview = await anonymous(`/api/reviews?productId=${red.id}`);
    assert.equal(visibleReview.status, 200); assert.equal(visibleReview.data.ratingCount, 1); assert.equal(visibleReview.data.ratingAverage, 5);
    assert.ok(visibleReview.data.items.every((item: { customer?: { email?: string } }) => !item.customer?.email), "Public reviews must not expose customer emails.");
    assert.equal((await anonymous(`/api/products?id=${red.id}`)).data.ratingCount, 1);
    assert.equal((await customerClient("/api/admin/reviews", "PATCH", { id: postedReview.data.id, isHidden: true, reason: "Invalid moderation attempt" })).status, 403);
    assert.equal((await adminClient("/api/admin/reviews", "PATCH", { id: postedReview.data.id, isHidden: true, reason: "Test moderation" })).status, 200);
    const hiddenReview = await anonymous(`/api/reviews?productId=${red.id}`);
    assert.equal(hiddenReview.data.ratingCount, 0); assert.equal(hiddenReview.data.items.length, 0); assert.equal((await anonymous(`/api/products?id=${red.id}`)).data.ratingCount, 0);
    assert.equal((await adminClient("/api/admin/reviews", "PATCH", { id: postedReview.data.id, isHidden: false, reason: "Restore valid review" })).status, 200);
    assert.equal((await anonymous(`/api/reviews?productId=${red.id}`)).data.ratingCount, 1);

    const changedCategory = await adminClient("/api/admin/categories", "PATCH", { id: category.id, version: category.version, name: `${category.name} revised`, slug: `${category.slug}-new`, isActive: false });
    assert.equal(changedCategory.status, 200, JSON.stringify(changedCategory.data));
    assert.equal((await adminClient("/api/admin/categories", "PATCH", { id: category.id, version: category.version, name: category.name, slug: category.slug, isActive: true })).status, 409);
    category = changedCategory.data;
    assert.equal((await discovery()).data.total, 1); assert.equal((await anonymous(`/api/boutiques/${shop.id}`)).data.productCount, 1);
    assert.equal((await quote()).status, 404); assert.equal((await customerClient("/api/bookings", "POST", { ...order, quantity: 1 })).status, 404);
    assert.ok(!(await anonymous("/api/categories")).data.some((item: { id: string }) => item.id === category.id), "Inactive categories are absent from customer choices.");
    const restoredCategory = await adminClient("/api/admin/categories", "PATCH", { id: category.id, version: category.version, name: category.name, slug: category.slug, isActive: true });
    assert.equal(restoredCategory.status, 200); category = restoredCategory.data;
    assert.equal((await discovery({ category: category.slug })).data.total, 2); assert.equal((await anonymous(`/api/products?id=${red.id}`)).data.category, category.name);
    const monitoredBookings = await adminClient(`/api/admin/bookings?q=${suffix}`);
    assert.equal(monitoredBookings.status, 200); assert.ok(monitoredBookings.data.items.some((item: { id: string }) => item.id === completed.id));
    const activity = await adminClient(`/api/admin/activity?q=${suffix}`);
    assert.equal(activity.status, 200); assert.ok(activity.data.items.some((item: { action: string }) => item.action === "CATEGORY_UPDATED"));
    const dashboard = await adminClient("/api/admin/dashboard"); assert.equal(dashboard.status, 200); assert.ok(dashboard.data.summary.totalBookings >= 4); assert.ok(dashboard.data.summary.completedRentalRevenueMinor >= 20000);

    const { createRecoveryToken, tokenHash } = await import("../../src/features/auth/recovery");
    await db.user.update({ where: { id: customer.id }, data: { emailVerified: null } });
    const expiredVerify = await createRecoveryToken(customer.id, "EMAIL_VERIFICATION");
    await db.authToken.update({ where: { tokenHash: tokenHash(expiredVerify) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await anonymous("/api/auth/verify-email", "POST", { token: expiredVerify })).status, 400);
    const verification = await createRecoveryToken(customer.id, "EMAIL_VERIFICATION");
    assert.equal((await anonymous("/api/auth/reset-password", "POST", { token: verification, password: updatedPassword })).status, 400, "Token purposes cannot be swapped.");
    assert.equal((await anonymous("/api/auth/verify-email", "POST", { token: verification })).status, 200);
    assert.ok((await db.user.findUniqueOrThrow({ where: { id: customer.id } })).emailVerified);
    assert.equal((await anonymous("/api/auth/verify-email", "POST", { token: verification })).status, 400);
    const expiredReset = await createRecoveryToken(customer.id, "PASSWORD_RESET");
    await db.authToken.update({ where: { tokenHash: tokenHash(expiredReset) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await anonymous("/api/auth/reset-password", "POST", { token: expiredReset, password: updatedPassword })).status, 400);
    const superseded = await createRecoveryToken(customer.id, "PASSWORD_RESET"), validReset = await createRecoveryToken(customer.id, "PASSWORD_RESET");
    assert.equal((await anonymous("/api/auth/reset-password", "POST", { token: superseded, password: updatedPassword })).status, 400);
    assert.equal((await anonymous("/api/auth/reset-password", "POST", { token: validReset, password: updatedPassword })).status, 200);
    assert.equal((await customerClient("/api/profile")).status, 401, "Password reset invalidates existing JWT sessions.");
    assert.equal((await anonymous("/api/auth/reset-password", "POST", { token: validReset, password: updatedPassword })).status, 400);
    const oldCredentials = client(); await credentials(oldCredentials, customer.email!, password); assert.equal((await oldCredentials("/api/profile")).status, 401);
    const recoveredClient = client(); await login(recoveredClient, customer.email!, updatedPassword);
    for (let attempt = 0; attempt < 3; attempt++) assert.ok([200, 503].includes((await anonymous("/api/auth/forgot-password", "POST", { email: recoveryEmail })).status));
    assert.equal((await anonymous("/api/auth/forgot-password", "POST", { email: recoveryEmail })).status, 429, "Recovery requests have a persistent rate limit.");
  } finally {
    await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await db.booking.deleteMany({ where: { boutiqueId: { in: boutiqueIds } } });
    await db.product.deleteMany({ where: { boutiqueId: { in: boutiqueIds } } });
    await db.boutique.deleteMany({ where: { id: { in: boutiqueIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.category.deleteMany({ where: { id: { in: categoryIds } } });
    const bucketKeys = [...fixtureEmails.map(email => `signin:${createHash("sha256").update(email).digest("hex")}`), `PASSWORD_RESET:${createHash("sha256").update(recoveryEmail).digest("hex")}`];
    await db.rateLimitBucket.deleteMany({ where: { key: { in: bucketKeys } } });
    await db.$disconnect();
  }
});
