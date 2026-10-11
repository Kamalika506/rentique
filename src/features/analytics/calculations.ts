import { z } from "zod";
import { bookingStatusLabels, type BoutiqueBookingStatus } from "../boutiques/booking-management/service";
import type { AnalyticsDataset } from "./service";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const nonempty = z.string().trim().min(1);
const schema = z.object({
  boutique: z.object({ id: nonempty, name: nonempty }),
  asOf: z.iso.datetime({ offset: true }), timezone: nonempty,
  startMonth: month, endMonth: month, complete: z.literal(true),
  bookings: z.array(z.object({
    id: nonempty, boutiqueId: nonempty,
    status: z.custom<BoutiqueBookingStatus>((value) => typeof value === "string" && Object.hasOwn(bookingStatusLabels, value)),
    createdAt: z.iso.datetime({ offset: true }), rentalMinor: money, depositMinor: money,
    products: z.array(z.object({ id: nonempty, name: nonempty, category: nonempty, quantity: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) })).min(1),
  })),
});

export function monthInTimezone(instant: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit" }).formatToParts(new Date(instant));
  return `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}`;
}

export function inventoryUtilization(data: AnalyticsDataset): number | null {
  const evidence = data.utilization;
  if (!data.complete || !evidence || !evidence.complete || evidence.startMonth !== data.startMonth || evidence.endMonth !== data.endMonth
    || evidence.asOf !== data.asOf || evidence.timezone !== data.timezone
    || !Number.isFinite(evidence.availableUnitDays) || !Number.isFinite(evidence.occupiedUnitDays)
    || evidence.availableUnitDays <= 0 || evidence.occupiedUnitDays < 0 || evidence.occupiedUnitDays > evidence.availableUnitDays) return null;
  return evidence.occupiedUnitDays / evidence.availableUnitDays * 100;
}

/** Uses booking creation cohorts; revenue is rental charges, never deposits/payment receipts. */
export function calculateAnalytics(input: AnalyticsDataset) {
  const data = schema.parse(input);
  const months: { month: string; bookings: number }[] = [];
  for (let cursor = data.startMonth; cursor <= data.endMonth;) {
    if (months.length >= 120) throw new Error("Analytics window exceeds 120 months.");
    months.push({ month: cursor, bookings: 0 });
    const [year, currentMonth] = cursor.split("-").map(Number);
    cursor = currentMonth === 12 ? `${year + 1}-01` : `${year}-${String(currentMonth + 1).padStart(2, "0")}`;
  }
  if (!months.length || data.endMonth > monthInTimezone(data.asOf, data.timezone)) throw new Error("Invalid analytics window.");
  const seen = new Set<string>();
  const products = new Map<string, { id: string; name: string; bookings: number; units: number }>();
  const categories = new Map<string, number>();
  let totalBookings = 0, completedRentals = 0, completedRevenueMinor = 0, pendingBookings = 0, cancelledBookings = 0;
  for (const booking of data.bookings) {
    if (booking.boutiqueId !== data.boutique.id || seen.has(booking.id)) throw new Error("Analytics contains duplicate or foreign bookings.");
    seen.add(booking.id);
    if (Date.parse(booking.createdAt) > Date.parse(data.asOf)) throw new Error("Analytics contains future bookings.");
    const createdMonth = monthInTimezone(booking.createdAt, data.timezone);
    if (createdMonth < data.startMonth || createdMonth > data.endMonth) continue;
    totalBookings++;
    months.find((item) => item.month === createdMonth)!.bookings++;
    if (booking.status === "COMPLETED") { completedRentals++; completedRevenueMinor += booking.rentalMinor; }
    if (!Number.isSafeInteger(completedRevenueMinor)) throw new Error("Revenue exceeds safe integer precision.");
    if (booking.status === "PENDING") pendingBookings++;
    if (booking.status === "CANCELLED") cancelledBookings++;
    if (booking.status === "CANCELLED" || booking.status === "REJECTED") continue;
    const bookingProducts = new Set<string>(), bookingCategories = new Set<string>();
    for (const line of booking.products) {
      const product = products.get(line.id) ?? { id: line.id, name: line.name, bookings: 0, units: 0 };
      if (!bookingProducts.has(line.id)) product.bookings++;
      product.units += line.quantity;
      if (!Number.isSafeInteger(product.units)) throw new Error("Product quantities exceed safe integer precision.");
      products.set(line.id, product); bookingProducts.add(line.id); bookingCategories.add(line.category);
    }
    for (const category of bookingCategories) categories.set(category, (categories.get(category) ?? 0) + 1);
  }
  return { totalBookings, completedRentals, completedRevenueMinor, pendingBookings, cancelledBookings, months,
    popularProducts: [...products.values()].sort((a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name)),
    categories: [...categories].map(([name, bookings]) => ({ name, bookings })).sort((a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name)),
    utilizationPercent: inventoryUtilization(input),
  };
}
