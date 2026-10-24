/** UI/demo vocabulary only. Map Member 2's canonical definitions when supplied. */
export type BoutiqueBookingStatus = "PENDING" | "CONFIRMED" | "PICKED_UP" | "RETURNED" | "COMPLETED" | "CANCELLED" | "REJECTED" | "EXPIRED";
export const bookingStatusLabels: Record<BoutiqueBookingStatus, string> = { PENDING: "Requested", CONFIRMED: "Confirmed", PICKED_UP: "Collected", RETURNED: "Returned; awaiting inspection", COMPLETED: "Completed", CANCELLED: "Cancelled", REJECTED: "Rejected", EXPIRED: "Expired" };
export type InspectionCondition = "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE";
export type ManualRefundStatus = "PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED" | "WITHHELD" | "NOT_REQUIRED";
export type LifecycleAction = "CONFIRM" | "REJECT" | "PICK_UP" | "RETURN" | "COMPLETE" | "CANCEL" | "RECORD_INSPECTION" | "RECORD_REFUND" | "MARK_READY";
export type LifecycleCommand = { action: "CONFIRM" | "PICK_UP" | "COMPLETE" | "MARK_READY" } | { action: "RETURN"; items?: { itemId: string; quantity?: number; unitIds?: string[] }[] } | { action: "REJECT" | "CANCEL"; reason: string } | { action: "RECORD_INSPECTION"; condition: InspectionCondition; photos?: string[]; notes: string } | { action: "RECORD_REFUND"; status: ManualRefundStatus; notes: string };
export interface BoutiqueBooking {
  id: string; boutiqueId: string; status: BoutiqueBookingStatus; version: number;
  customer: { name: string; email: string; phone: string };
  products: { id: string; itemId?: string; returnedQuantity?: number; image?: string; name: string; size: string; quantity: number; rentalMinor: number; depositMinor: number; units?: { id: string; code: string; status: string; returnedAt?: string; releasedAt?: string }[] }[];
  collection?: { name: string; address: string; city: string; phone: string; contactEmail: string; openingHours: string; collectionInstructions: string; cancellationPolicy: string; returnPolicy: string; rentalPolicy: string; savedAtBooking: boolean };
  partiallyReturned?: boolean; requestExpiresAt?: string;
  reviews?: { productId: string; rating: number; isHidden: boolean }[];
  timeline?: { id: string; action: string; fromStatus: string | null; toStatus: string | null; createdAt: string }[];
  pickupAt: string; returnAt: string; createdAt: string; rentalMinor: number; depositMinor: number;
  allowedActions: LifecycleAction[]; rejectionReason?: string; cancellationReason?: string;
  pickedUpAt?: string; returnedAt?: string; completedAt?: string; stockReadyAt?: string;
  inspection?: { condition: InspectionCondition; photos?: string[]; notes: string; recordedAt: string };
  manualRefund?: { status: ManualRefundStatus; notes: string; recordedAt: string };
}
export interface BookingList { page?: number; pageSize?: number; total?: number; totalPages?: number; items: BoutiqueBooking[]; upcomingPickups: BoutiqueBooking[]; upcomingReturns: BoutiqueBooking[] }
export interface RentalCalendarEvent { bookingId: string; customer: string; productLabel: string; status: BoutiqueBookingStatus; startDate: string; endDate: string; pickupDate: string; returnDate: string }
export interface BoutiqueBookingService {
  readonly mode: "demo" | "live";
  readonly boutique: { id: string; name: string };
  readonly referenceDate: string;
  readonly timezone: string;
  listBookings(query: { search?: string; status?: BoutiqueBookingStatus; page?: number }): Promise<BookingList>;
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
