import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { allocateBookingUnits, availableInventoryUnits, lockVariantUnits } from "../src/features/rentals/inventory-units";
import { lineAmounts } from "../src/features/rentals/rules";

const db = new PrismaClient();
async function main() {
  const result = await db.$transaction(async tx => {
    const shop = await tx.boutique.findFirstOrThrow({ where: { name: { equals: "Tifara", mode: "insensitive" }, status: "APPROVED" } });
    const email = "tifara-demo-20261024@example.invalid";
    const customer = await tx.user.upsert({ where: { email }, update: {}, create: { email, name: "Tifara Demo Customer", role: "CUSTOMER", phone: "+919000000000" } });
    if (customer.role !== "CUSTOMER") throw new Error("Demo account is not a customer.");
    const variants = await tx.productVariant.findMany({ where: { archived: false, quantity: { gt: 0 }, product: { boutiqueId: shop.id, archived: false } }, include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } }, orderBy: { id: "asc" } });
    const bookings = [];
    for (let index = 0; index < 3; index++) {
      const requestKey = `tifara-demo-20261024-${index + 1}`;
      const existing = await tx.booking.findUnique({ where: { customerId_requestKey: { customerId: customer.id, requestKey } } });
      if (existing) { bookings.push({ id: existing.id, created: false }); continue; }
      // Future dates in the shop's local timezone, at least 48 hours ahead.
      const local = new Date(Date.now() + (3 + index * 3) * 86400000).toLocaleDateString("en-CA", { timeZone: shop.timezone });
      const pickupAt = new Date(`${local}T11:00:00+05:30`), returnAt = new Date(pickupAt.getTime() + 2 * 86400000);
      const endsAt = new Date(returnAt.getTime() + 86400000);
      let selected: typeof variants[number] | undefined;
      for (const variant of variants) {
        await lockVariantUnits(tx, variant.id);
        if ((await availableInventoryUnits(tx, variant.id, pickupAt, endsAt)).length) { selected = variant; break; }
      }
      if (!selected) throw new Error("Not enough available stock for the demo; no bookings were added.");
      const product = selected.product;
      const amount = lineAmounts(selected.rentalPriceMinor ?? product.rentalPriceMinor, BigInt(0), product.rentalPriceUnit, 2, 1).rentalMinor;
      const booking = await tx.booking.create({ data: {
        boutiqueId: shop.id, customerId: customer.id, requestKey, status: "PENDING", pickupAt, returnAt,
        requestExpiresAt: new Date(Date.now() + 12 * 3600000), turnaroundMinutes: 1440, rentalMinor: amount, depositMinor: BigInt(0),
        policySnapshot: { demo: true, source: "seed-tifara-demo-bookings", boutique: { id: shop.id, name: shop.name, address: shop.address, city: shop.city, phone: shop.phone, contactEmail: shop.contactEmail }, openingHours: shop.openingHours, collectionInstructions: shop.collectionInstructions, cancellationPolicy: shop.cancellationPolicy, returnPolicy: shop.returnPolicy, policy: shop.rentalPolicy, items: [{ variantId: selected.id, productId: product.id, image: product.images[0]?.secureUrl ?? "", measurements: selected.measurements ?? "", includedPieces: product.includedPieces }] },
        items: { create: { variantId: selected.id, quantity: 1, productNameSnap: product.name, sizeSnapshot: selected.size, categorySnapshot: product.category, rentalMinor: amount, depositMinor: BigInt(0) } },
        events: { create: { actorId: customer.id, action: "CREATED", toStatus: "PENDING", details: { demo: true, source: "seed-tifara-demo-bookings" } } },
      }, include: { items: true } });
      await allocateBookingUnits(tx, { bookingItemId: booking.items[0].id, variantId: selected.id, quantity: 1, startsAt: pickupAt, endsAt });
      bookings.push({ id: booking.id, created: true, product: product.name, pickupAt: pickupAt.toISOString(), returnAt: returnAt.toISOString() });
    }
    return { boutique: shop.name, customer: customer.name, bookings, totalBookings: await tx.booking.count({ where: { boutiqueId: shop.id } }) };
  }, { isolationLevel: "Serializable", timeout: 60000 });
  console.log(JSON.stringify(result, null, 2));
}
void main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
