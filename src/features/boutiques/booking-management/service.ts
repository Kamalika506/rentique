/** UI/demo vocabulary only. Map Member 2's canonical definitions when supplied. */
export type BoutiqueBookingStatus = "PENDING" | "CONFIRMED" | "PICKED_UP" | "RETURNED" | "COMPLETED" | "CANCELLED" | "REJECTED";
export const bookingStatusLabels: Record<BoutiqueBookingStatus, string> = { PENDING: "Pending", CONFIRMED: "Confirmed", PICKED_UP: "Picked up", RETURNED: "Returned", COMPLETED: "Completed", CANCELLED: "Cancelled", REJECTED: "Rejected" };
export type InspectionCondition = "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE";
export type ManualRefundStatus = "PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED" | "WITHHELD" | "NOT_REQUIRED";
export type LifecycleAction = "CONFIRM" | "REJECT" | "PICK_UP" | "RETURN" | "COMPLETE" | "CANCEL" | "RECORD_INSPECTION" | "RECORD_REFUND";
export type LifecycleCommand = { action: "CONFIRM" | "PICK_UP" | "RETURN" | "COMPLETE" } | { action: "REJECT" | "CANCEL"; reason: string } | { action: "RECORD_INSPECTION"; condition: InspectionCondition; notes: string } | { action: "RECORD_REFUND"; status: ManualRefundStatus; notes: string };
export interface BoutiqueBooking {
  id: string; boutiqueId: string; status: BoutiqueBookingStatus; version: number;
  customer: { name: string; email: string; phone: string };
  products: { id: string; name: string; size: string; quantity: number; rentalMinor: number; depositMinor: number }[];
  pickupAt: string; returnAt: string; createdAt: string; rentalMinor: number; depositMinor: number;
  allowedActions: LifecycleAction[]; rejectionReason?: string; cancellationReason?: string;
  pickedUpAt?: string; returnedAt?: string; completedAt?: string;
  inspection?: { condition: InspectionCondition; notes: string; recordedAt: string };
  manualRefund?: { status: ManualRefundStatus; notes: string; recordedAt: string };
}
export interface BookingList { items: BoutiqueBooking[]; upcomingPickups: BoutiqueBooking[]; upcomingReturns: BoutiqueBooking[] }
export interface RentalCalendarEvent { bookingId: string; customer: string; productLabel: string; status: BoutiqueBookingStatus; startDate: string; endDate: string; pickupDate: string; returnDate: string }
export interface BoutiqueBookingService {
  readonly mode: "demo" | "live";
  readonly boutique: { id: string; name: string };
  readonly referenceDate: string;
  readonly timezone: string;
  listBookings(query: { search?: string; status?: BoutiqueBookingStatus }): Promise<BookingList>;
  getBooking(id: string): Promise<BoutiqueBooking>;
  decideBooking(id: string, decision: "CONFIRM" | "REJECT", version: number, reason?: string): Promise<BoutiqueBooking>;
  applyLifecycleAction(id: string, command: LifecycleCommand, version: number): Promise<BoutiqueBooking>;
  getCalendar(month: string): Promise<RentalCalendarEvent[]>;
}
export class BookingServiceError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "VALIDATION" | "UNAVAILABLE", message: string) { super(message); this.name = "BookingServiceError"; }
}
export const bookingError = (cause: unknown) => cause instanceof BookingServiceError ? cause.message : "Booking data couldn't be loaded or updated. Please try again.";
export const bookingMoney = (minor: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(minor / 100);
export const bookingDate = (value: string, timezone: string) => new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: timezone });
