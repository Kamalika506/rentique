import { buildDemoDashboardSnapshot } from "../../adapters/mock/dashboard";
import { BookingServiceError, type BoutiqueBooking, type BoutiqueBookingService, type LifecycleAction, type LifecycleCommand } from "../../booking-management/service";
import { lifecycleCommandSchema } from "../../booking-management/lifecycle";
import { calendarDays } from "../../rental-calendar/dates";

/** Fixture-only workflow. Real transitions and refund policy belong to Member 2. */
function demoActions(booking: Pick<BoutiqueBooking, "status" | "inspection">): LifecycleAction[] {
  switch (booking.status) {
    case "PENDING": return ["CONFIRM", "REJECT", "CANCEL"];
    case "CONFIRMED": return ["PICK_UP", "CANCEL"];
    case "PICKED_UP": return ["RETURN"];
    case "RETURNED": return ["RECORD_INSPECTION", ...(booking.inspection ? ["COMPLETE" as const] : []), "RECORD_REFUND"];
    case "COMPLETED": case "CANCELLED": case "REJECTED": return ["RECORD_REFUND"];
    case "EXPIRED": return [];
  }
}
export const demoBookings: BoutiqueBooking[] = buildDemoDashboardSnapshot().recentBookings.map((booking, index) => ({
  id: booking.id, boutiqueId: "demo-boutique", status: booking.status, version: 1,
  customer: { name: booking.customer, email: `customer${index + 1}@example.com`, phone: "+91 90000 00000" },
  products: [{ id: `sample-product-${index}`, name: booking.product, size: "M", quantity: 1, rentalMinor: booking.rentalAmountMinor, depositMinor: 200000 }],
  pickupAt: booking.pickupAt, returnAt: booking.returnAt, createdAt: booking.createdAt, rentalMinor: booking.rentalAmountMinor, depositMinor: 200000,
  allowedActions: demoActions({ status: booking.status }),
}));
export function createDemoBookingService({ delayMs = 250, initialBookings = demoBookings }: { delayMs?: number; initialBookings?: BoutiqueBooking[] } = {}): BoutiqueBookingService {
  const boutique = { id: "demo-boutique", name: "The Silk Atelier" };
  const records = new Map(structuredClone(initialBookings).map((booking) => [booking.id, booking]));
  const pause = () => new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  const owned = (id: string) => { const booking = records.get(id); if (!booking || booking.boutiqueId !== boutique.id) throw new BookingServiceError("NOT_FOUND", "This booking is unavailable for this boutique."); return booking; };
  const all = () => [...records.values()].filter((booking) => booking.boutiqueId === boutique.id);
  const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  async function applyLifecycleAction(id: string, input: LifecycleCommand, version: number) {
    const parsed = lifecycleCommandSchema.safeParse(input);
    if (!parsed.success) throw new BookingServiceError("VALIDATION", parsed.error.issues[0].message);
    await pause();
    const booking = owned(id); const command = parsed.data;
    if (booking.version !== version || !demoActions(booking).includes(command.action) || !booking.allowedActions.includes(command.action)) throw new BookingServiceError("CONFLICT", "This action is no longer permitted or the booking has changed. Reload the booking.");
    const updated = structuredClone(booking); const now = new Date().toISOString();
    switch (command.action) {
      case "CONFIRM": updated.status = "CONFIRMED"; break;
      case "REJECT": updated.status = "REJECTED"; updated.rejectionReason = command.reason; break;
      case "CANCEL": updated.status = "CANCELLED"; updated.cancellationReason = command.reason; break;
      case "PICK_UP": updated.status = "PICKED_UP"; updated.pickedUpAt = now; break;
      case "RETURN": updated.status = "RETURNED"; updated.returnedAt = now; break;
      case "COMPLETE": updated.status = "COMPLETED"; updated.completedAt = now; break;
      case "RECORD_INSPECTION": updated.inspection = { photos: command.photos ?? updated.inspection?.photos ?? [], condition: command.condition, notes: command.notes, recordedAt: now }; break;
      case "RECORD_REFUND": updated.manualRefund = { status: command.status, notes: command.notes, recordedAt: now }; break;
    }
    updated.version++; updated.allowedActions = demoActions(updated); records.set(id, updated); return structuredClone(updated);
  }
  return {
    mode: "demo", boutique, referenceDate: "2026-10-11", timezone: "Asia/Kolkata",
    async listBookings(query) { await pause(); const bookings = all(); const inWindow = (iso: string) => Date.parse(iso) >= Date.parse("2026-10-10T18:30:00Z") && Date.parse(iso) < Date.parse("2026-10-17T18:30:00Z"); const search = query.search?.trim().toLowerCase() ?? "";
      return structuredClone({ items: bookings.filter((booking) => (!query.status || booking.status === query.status) && `${booking.id} ${booking.customer.name} ${booking.customer.email} ${booking.products.map((product) => product.name).join(" ")}`.toLowerCase().includes(search)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), upcomingPickups: bookings.filter((booking) => booking.status === "CONFIRMED" && inWindow(booking.pickupAt)).sort((a, b) => a.pickupAt.localeCompare(b.pickupAt)), upcomingReturns: bookings.filter((booking) => ["CONFIRMED", "PICKED_UP"].includes(booking.status) && inWindow(booking.returnAt)).sort((a, b) => a.returnAt.localeCompare(b.returnAt)) }); },
    async getBooking(id) { await pause(); return structuredClone(owned(id)); },
    applyLifecycleAction,
    async decideBooking(id, decision, version, reason) { return applyLifecycleAction(id, decision === "CONFIRM" ? { action: "CONFIRM" } : { action: "REJECT", reason: reason ?? "" }, version); },
    async getCalendar(month) { const days = calendarDays(month); await pause(); return all().filter((booking) => !["CANCELLED", "REJECTED"].includes(booking.status) && localDay(booking.pickupAt) <= days[days.length - 1] && localDay(booking.returnAt) >= days[0]).map((booking) => ({ bookingId: booking.id, customer: booking.customer.name, productLabel: booking.products.map((product) => product.name).join(", "), status: booking.status, startDate: localDay(booking.pickupAt), endDate: localDay(booking.returnAt), pickupDate: localDay(booking.pickupAt), returnDate: localDay(booking.returnAt) })); },
  };
}
