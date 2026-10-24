/** Legacy requests without a deadline expire when pickup starts. */
export function requestExpired(booking: { status?: string; requestExpiresAt?: Date | null; pickupAt: Date }, now = new Date()) {
  return booking.status === "PENDING" && (booking.requestExpiresAt ?? booking.pickupAt) <= now;
}

export function effectiveBookingStatus<T extends string>(booking: { status: T; requestExpiresAt?: Date | null; pickupAt: Date }, now = new Date()): T | "EXPIRED" {
  return requestExpired(booking, now) ? "EXPIRED" : booking.status;
}
