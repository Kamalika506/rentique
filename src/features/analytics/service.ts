import type { BoutiqueBookingStatus } from "../boutiques/booking-management/service";

/** All records in the inclusive creation-month window, scoped by the server. */
export interface AnalyticsDataset {
  boutique: { id: string; name: string };
  asOf: string;
  timezone: string;
  startMonth: string;
  endMonth: string;
  complete: boolean;
  bookings: {
    id: string; boutiqueId: string; status: BoutiqueBookingStatus; createdAt: string;
    rentalMinor: number; depositMinor: number;
    products: { id: string; name: string; category: string; quantity: number }[];
  }[];
  utilization?: {
    startMonth: string; endMonth: string; asOf: string; timezone: string; complete: boolean;
    availableUnitDays: number; occupiedUnitDays: number;
  };
}

export interface BoutiqueAnalyticsService {
  mode: "demo" | "live";
  getDataset(): Promise<AnalyticsDataset>;
}
