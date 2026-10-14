import type { BoutiqueBookingStatus } from "../booking-management/service";
export type BookingStatus = BoutiqueBookingStatus;
export interface DashboardBooking {
  id: string;
  customer: string;
  product: string;
  status: BookingStatus;
  createdAt: string;
  pickupAt: string;
  returnAt: string;
  rentalAmountMinor: number;
}
export interface DashboardProduct {
  id: string;
  name: string;
  category: string;
  active: boolean;
  stock: number;
  rentalPriceMinor: number;
}
export interface DashboardSummary {
  activeProducts: number;
  totalBookings: number;
  pendingRequests: number;
  upcomingPickups: number;
  upcomingReturns: number;
  completedRentals: number;
  completedRentalRevenueMinor: number;
}
export interface DashboardSnapshot {
  boutiqueName: string;
  currency: string;
  timezone: string;
  asOf: string;
  scheduleUntil: string;
  summary: DashboardSummary;
  recentBookings: DashboardBooking[];
  upcomingPickups: DashboardBooking[];
  upcomingReturns: DashboardBooking[];
  products: DashboardProduct[];
}
/** A real implementation must authorize approved boutique ownership server-side. */
export interface BoutiqueDashboardService {
  readonly mode: "demo" | "live";
  getSnapshot(): Promise<DashboardSnapshot>;
}
export class DashboardServiceError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "UNAVAILABLE", message: string) {
    super(message);
    this.name = "DashboardServiceError";
  }
}
export type DashboardView = "overview" | "inventory" | "bookings" | "schedule";
export function parseDashboardView(value: string | null): DashboardView {
  return value === "inventory" || value === "bookings" || value === "schedule" ? value : "overview";
}

/** CSV escaping also neutralizes spreadsheet formulas in externally supplied labels. */
const csvCell = (value: string | number) => {
  const text = String(value);
  const escaped = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${escaped.replace(/"/g, '""')}"`;
};
export function formatDashboardMoney(minor: number, currency: string) {
  const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency });
  return formatter.format(minor / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2));
}
export function dashboardSummaryCsv(snapshot: DashboardSnapshot, mode: BoutiqueDashboardService["mode"]) {
  const rows: (string | number)[][] = [
    ["Source", mode === "demo" ? "DEMO - sample data" : "Live"],
    ["Boutique", snapshot.boutiqueName], ["As of", snapshot.asOf], ["Currency", snapshot.currency],
    ["Active products", snapshot.summary.activeProducts], ["Total bookings", snapshot.summary.totalBookings],
    ["Pending requests", snapshot.summary.pendingRequests], ["Upcoming pickups", snapshot.summary.upcomingPickups],
    ["Upcoming returns", snapshot.summary.upcomingReturns], ["Completed rentals", snapshot.summary.completedRentals],
    ["Completed rental revenue (minor units)", snapshot.summary.completedRentalRevenueMinor],
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
