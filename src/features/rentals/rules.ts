import type { BoutiqueBookingStatus, LifecycleAction } from "../boutiques/booking-management/service";

export const reservingStatuses: BoutiqueBookingStatus[] = ["PENDING", "CONFIRMED", "PICKED_UP"];
export function allowedActions(status: BoutiqueBookingStatus, inspected: boolean): LifecycleAction[] {
  switch (status) {
    case "PENDING": return ["CONFIRM", "REJECT", "CANCEL"];
    case "CONFIRMED": return ["PICK_UP", "CANCEL"];
    case "PICKED_UP": return ["RETURN"];
    case "RETURNED": return ["RECORD_INSPECTION", ...(inspected ? ["COMPLETE" as const] : []), "RECORD_REFUND"];
    default: return ["RECORD_REFUND"];
  }
}
export function rentalDays(pickup: Date, returned: Date, now = new Date()) {
  const duration = returned.getTime() - pickup.getTime();
  if (!Number.isFinite(duration) || pickup <= now || duration <= 0 || duration > 90 * 86400000) throw new Error("Choose future pickup and return dates, up to 90 days apart.");
  return Math.ceil(duration / 86400000);
}
export function lineAmounts(price: bigint, deposit: bigint, unit: string, days: number, quantity: number) {
  return { rentalMinor: price * BigInt(unit === "PER_DAY" ? days : 1) * BigInt(quantity), depositMinor: deposit * BigInt(quantity) };
}
