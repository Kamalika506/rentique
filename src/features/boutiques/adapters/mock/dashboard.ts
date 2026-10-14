import type { BoutiqueDashboardService, DashboardBooking, DashboardProduct, DashboardSnapshot } from "../../dashboard/service";

const products: DashboardProduct[] = [
  { id: "PR-101", name: "Ivory embroidered lehenga", category: "Bridal", active: true, stock: 2, rentalPriceMinor: 850000 },
  { id: "PR-102", name: "Plum silk saree", category: "Ethnic wear", active: true, stock: 3, rentalPriceMinor: 320000 },
  { id: "PR-103", name: "Champagne evening gown", category: "Occasion wear", active: true, stock: 1, rentalPriceMinor: 480000 },
  { id: "PR-104", name: "Pearl occasion clutch", category: "Accessories", active: true, stock: 4, rentalPriceMinor: 90000 },
  { id: "PR-105", name: "Rose organza saree", category: "Ethnic wear", active: false, stock: 0, rentalPriceMinor: 280000 },
];
const bookings: DashboardBooking[] = [
  { id: "RQ-108", customer: "Aanya S.", product: products[0].name, status: "PENDING", createdAt: "2026-10-10T11:00:00Z", pickupAt: "2026-10-14T04:30:00Z", returnAt: "2026-10-17T04:30:00Z", rentalAmountMinor: 850000 },
  { id: "RQ-107", customer: "Meera K.", product: products[1].name, status: "CONFIRMED", createdAt: "2026-10-10T08:00:00Z", pickupAt: "2026-10-11T06:30:00Z", returnAt: "2026-10-13T06:30:00Z", rentalAmountMinor: 320000 },
  { id: "RQ-106", customer: "Ishita R.", product: products[2].name, status: "PICKED_UP", createdAt: "2026-10-09T10:00:00Z", pickupAt: "2026-10-10T05:30:00Z", returnAt: "2026-10-12T05:30:00Z", rentalAmountMinor: 480000 },
  { id: "RQ-105", customer: "Tara M.", product: products[3].name, status: "PENDING", createdAt: "2026-10-09T07:00:00Z", pickupAt: "2026-10-16T05:30:00Z", returnAt: "2026-10-18T05:30:00Z", rentalAmountMinor: 90000 },
  { id: "RQ-104", customer: "Diya P.", product: products[0].name, status: "CONFIRMED", createdAt: "2026-10-08T09:00:00Z", pickupAt: "2026-10-15T07:30:00Z", returnAt: "2026-10-19T07:30:00Z", rentalAmountMinor: 850000 },
  { id: "RQ-103", customer: "Nisha V.", product: products[1].name, status: "COMPLETED", createdAt: "2026-10-04T05:30:00Z", pickupAt: "2026-10-06T05:30:00Z", returnAt: "2026-10-08T05:30:00Z", rentalAmountMinor: 320000 },
  { id: "RQ-102", customer: "Rhea A.", product: products[2].name, status: "COMPLETED", createdAt: "2026-10-01T05:30:00Z", pickupAt: "2026-10-03T05:30:00Z", returnAt: "2026-10-05T05:30:00Z", rentalAmountMinor: 480000 },
  { id: "RQ-101", customer: "Sana B.", product: products[3].name, status: "CANCELLED", createdAt: "2026-09-29T05:30:00Z", pickupAt: "2026-10-02T05:30:00Z", returnAt: "2026-10-04T05:30:00Z", rentalAmountMinor: 90000 },
];

/** Fixture aggregation only; real metrics must be supplied by the backend. */
export function buildDemoDashboardSnapshot(items = products, rentals = bookings): DashboardSnapshot {
  const asOf = "2026-10-10T18:30:00Z"; // 11 October in Asia/Kolkata.
  const scheduleUntil = "2026-10-17T18:30:00Z";
  const inWindow = (value: string) => Date.parse(value) >= Date.parse(asOf) && Date.parse(value) < Date.parse(scheduleUntil);
  const upcomingPickups = rentals.filter((booking) => booking.status === "CONFIRMED" && inWindow(booking.pickupAt)).sort((a, b) => Date.parse(a.pickupAt) - Date.parse(b.pickupAt));
  const upcomingReturns = rentals.filter((booking) => ["CONFIRMED", "PICKED_UP"].includes(booking.status) && inWindow(booking.returnAt)).sort((a, b) => Date.parse(a.returnAt) - Date.parse(b.returnAt));
  const completed = rentals.filter((booking) => booking.status === "COMPLETED");
  return structuredClone({
    boutiqueName: "The Silk Atelier", currency: "INR", timezone: "Asia/Kolkata", asOf, scheduleUntil,
    summary: { activeProducts: items.filter((item) => item.active).length, totalBookings: rentals.length, pendingRequests: rentals.filter((booking) => booking.status === "PENDING").length, upcomingPickups: upcomingPickups.length, upcomingReturns: upcomingReturns.length, completedRentals: completed.length, completedRentalRevenueMinor: completed.reduce((sum, booking) => sum + booking.rentalAmountMinor, 0) },
    recentBookings: [...rentals].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), upcomingPickups, upcomingReturns, products: items,
  });
}

export function createDemoDashboardService({ empty = false, delayMs = 400 }: { empty?: boolean; delayMs?: number } = {}): BoutiqueDashboardService {
  return { mode: "demo", async getSnapshot() {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    return empty ? buildDemoDashboardSnapshot([], []) : buildDemoDashboardSnapshot();
  } };
}
