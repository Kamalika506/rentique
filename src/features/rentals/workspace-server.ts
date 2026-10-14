import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, currentUser, ownedBoutique } from "@/lib/api";
import { boutiqueRegistrationSchema } from "../boutiques/onboarding/schema";
import { categoryLabel, categoryMap, bookingInclude, bookingRecord } from "./records";
import type { Boutique } from "@/generated/prisma/client";

function application(boutique: Boutique) {
  return { id: boutique.id, status: boutique.status, submittedAt: boutique.submittedAt.toISOString(), rejectionReason: boutique.rejectionReason ?? undefined,
    details: { name: boutique.name, description: boutique.description, contactEmail: boutique.contactEmail, phone: boutique.phone, address: boutique.address, city: boutique.city, state: boutique.state, postalCode: boutique.postalCode, categories: boutique.categories.map(categoryLabel), socialLink: boutique.socialLink ?? "" } };
}
export async function getApplication() {
  const user = await currentUser();
  const boutique = await prisma.boutique.findUnique({ where: { ownerId: user.id } });
  return boutique ? application(boutique) : null;
}
export async function createApplication(request: Request) {
  const user = await currentUser();
  if (user.role === "ADMIN") throw new ApiError(403, "Administrators cannot apply as boutique owners.");
  const input = boutiqueRegistrationSchema.parse(await request.json());
  return prisma.$transaction(async tx => {
    const existing = await tx.boutique.findUnique({ where: { ownerId: user.id } });
    if (existing && existing.status !== "REJECTED") throw new ApiError(409, "You already have a boutique application.");
    const data = { ...input, categories: input.categories.map(category => categoryMap[category]), status: "PENDING" as const, rejectionReason: null, reviewedAt: null, reviewedById: null, submittedAt: new Date() };
    const boutique = existing ? await tx.boutique.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } }) : await tx.boutique.create({ data: { ...data, ownerId: user.id } });
    await tx.user.update({ where: { id: user.id }, data: { role: "BOUTIQUE_OWNER" } });
    return application(boutique);
  });
}
export async function reviewApplications(request: Request) {
  const user = await currentUser("ADMIN");
  if (request.method === "GET") return (await prisma.boutique.findMany({ where: { status: "PENDING" }, orderBy: { submittedAt: "asc" } })).map(application);
  const input = z.object({ id: z.string(), status: z.enum(["APPROVED", "REJECTED"]), reason: z.string().trim().max(1000).optional() }).parse(await request.json());
  if (input.status === "REJECTED" && (!input.reason || input.reason.length < 3)) throw new ApiError(400, "Provide a rejection reason.");
  return prisma.$transaction(async tx => {
    const updated = await tx.boutique.updateMany({ where: { id: input.id, status: "PENDING" }, data: { status: input.status, rejectionReason: input.status === "REJECTED" ? input.reason : null, reviewedById: user.id, reviewedAt: new Date(), version: { increment: 1 } } });
    if (!updated.count) throw new ApiError(409, "Application unavailable or already reviewed.");
    await tx.boutiqueReviewEvent.create({ data: { boutiqueId: input.id, reviewerId: user.id, action: input.status, reason: input.reason } });
    return application(await tx.boutique.findUniqueOrThrow({ where: { id: input.id } }));
  });
}
export async function calendar(request: Request) {
  const { boutique } = await ownedBoutique();
  const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(new URL(request.url).searchParams.get("month"));
  const [year, number] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, number - 1, 1) - 7 * 86400000), end = new Date(Date.UTC(year, number, 1) + 7 * 86400000);
  const bookings = await prisma.booking.findMany({ where: { boutiqueId: boutique.id, status: { notIn: ["CANCELLED", "REJECTED"] }, pickupAt: { lt: end }, returnAt: { gt: start } }, include: bookingInclude });
  const day = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: boutique.timezone });
  return bookings.map(b => ({ bookingId: b.id, customer: b.customer.name ?? "Customer", productLabel: b.items.map(item => item.productNameSnap).join(", "), status: b.status, startDate: day(b.pickupAt), endDate: day(b.returnAt), pickupDate: day(b.pickupAt), returnDate: day(b.returnAt) }));
}
export async function dashboard() {
  const { boutique } = await ownedBoutique();
  const [records, products] = await Promise.all([
    prisma.booking.findMany({ where: { boutiqueId: boutique.id }, include: bookingInclude, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { boutiqueId: boutique.id }, include: { variants: { where: { archived: false } } } }),
  ]);
  const now = new Date(), until = new Date(now.getTime() + 7 * 86400000);
  const bookings = records.map(b => ({ id: b.id, customer: b.customer.name ?? "Customer", product: b.items.map(i => i.productNameSnap).join(", "), status: b.status, createdAt: b.createdAt.toISOString(), pickupAt: b.pickupAt.toISOString(), returnAt: b.returnAt.toISOString(), rentalAmountMinor: Number(b.rentalMinor) }));
  const inWindow = (value: string) => new Date(value) >= now && new Date(value) < until;
  const upcomingPickups = bookings.filter(b => b.status === "CONFIRMED" && inWindow(b.pickupAt)), upcomingReturns = bookings.filter(b => ["CONFIRMED", "PICKED_UP"].includes(b.status) && inWindow(b.returnAt));
  const completed = records.filter(b => b.status === "COMPLETED");
  return { boutiqueName: boutique.name, currency: "INR", timezone: boutique.timezone, asOf: now.toISOString(), scheduleUntil: until.toISOString(), summary: {
    activeProducts: products.filter(p => !p.archived).length, totalBookings: records.length, pendingRequests: records.filter(b => b.status === "PENDING").length, upcomingPickups: upcomingPickups.length, upcomingReturns: upcomingReturns.length, completedRentals: completed.length, completedRentalRevenueMinor: completed.reduce((sum, b) => sum + Number(b.rentalMinor), 0) },
    recentBookings: bookings, upcomingPickups, upcomingReturns, products: products.map(p => ({ id: p.id, name: p.name, category: categoryLabel(p.category), active: !p.archived, stock: p.variants.reduce((sum, v) => sum + v.quantity, 0), rentalPriceMinor: Number(p.rentalPriceMinor) })) };
}
export async function analytics() {
  const { boutique } = await ownedBoutique();
  const bookings = await prisma.booking.findMany({ where: { boutiqueId: boutique.id }, include: bookingInclude, orderBy: { createdAt: "asc" } });
  const now = new Date(), month = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: boutique.timezone }).slice(0, 7);
  return { boutique: { id: boutique.id, name: boutique.name }, asOf: now.toISOString(), timezone: boutique.timezone, startMonth: month(bookings[0]?.createdAt ?? now), endMonth: month(now), complete: true,
    bookings: bookings.map(b => ({ ...bookingRecord(b), products: b.items.map(item => ({ id: item.variant.productId, name: item.productNameSnap, category: categoryLabel(item.categorySnapshot), quantity: item.quantity })) })) };
}
