import type { AnalyticsDataset, BoutiqueAnalyticsService } from "../../service";

// Isolated, fictional reporting snapshot. Never imported by metric calculations.
const products = [
  { id: "PR-101", name: "Ivory embroidered lehenga", category: "Bridal", quantity: 1 },
  { id: "PR-102", name: "Plum silk saree", category: "Ethnic", quantity: 1 },
  { id: "PR-103", name: "Champagne evening gown", category: "Occasion", quantity: 1 },
];
const fixture: AnalyticsDataset = {
  boutique: { id: "demo-boutique", name: "Atelier Demo" },
  asOf: "2026-10-11T06:30:00Z", timezone: "Asia/Kolkata", startMonth: "2026-05", endMonth: "2026-10", complete: true,
  bookings: [
    ["AN-01", "COMPLETED", "2026-05-10", 0, 850000],
    ["AN-02", "COMPLETED", "2026-07-14", 1, 320000],
    ["AN-03", "CANCELLED", "2026-08-01", 2, 480000],
    ["AN-04", "COMPLETED", "2026-09-10", 2, 480000],
    ["AN-05", "CONFIRMED", "2026-09-18", 0, 850000],
    ["AN-06", "PENDING", "2026-10-02", 1, 320000],
    ["AN-07", "PICKED_UP", "2026-10-04", 2, 480000],
    ["AN-08", "REJECTED", "2026-10-06", 0, 850000],
    ["AN-09", "RETURNED", "2026-10-08", 1, 320000],
  ].map(([id, status, day, product, rental]) => ({
    id: String(id), boutiqueId: "demo-boutique", status: status as AnalyticsDataset["bookings"][number]["status"],
    createdAt: `${day}T09:00:00+05:30`, rentalMinor: Number(rental), depositMinor: 200000,
    products: [products[Number(product)]],
  })),
};

export function createDemoAnalyticsService(): BoutiqueAnalyticsService {
  return { mode: "demo", async getDataset() {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return structuredClone(fixture);
  } };
}
