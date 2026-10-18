export interface StockReservation {
  quantity: number;
  booking: {
    pickupAt: Date; returnAt: Date; status?: string;
    requestExpiresAt?: Date | null; turnaroundMinutes?: number; stockReadyAt?: Date | null;
  };
}

/** Planned intervals plus known overdue/unclean stock. Never infer a physical return. */
export function reservationWindows(items: StockReservation[], now = new Date()): StockReservation[] {
  return items.flatMap(item => {
    const b = item.booking;
    if (["CANCELLED", "REJECTED", "EXPIRED"].includes(b.status ?? "")) return [];
    if (b.status === "PENDING" && b.requestExpiresAt && b.requestExpiresAt <= now) return [];
    if (b.stockReadyAt) return [];
    const cleaning = b.turnaroundMinutes ?? 0;
    if (b.status === "COMPLETED" && cleaning === 0) return [];
    const unknownReturn = b.status === "PICKED_UP" && b.returnAt <= now;
    const awaitingReadiness = ["RETURNED", "COMPLETED"].includes(b.status ?? "") && cleaning > 0;
    return [{ ...item, booking: { ...b, returnAt: unknownReturn || awaitingReadiness ? new Date(8640000000000000) : new Date(b.returnAt.getTime() + cleaning * 60000) } }];
  });
}

export function peakReserved(items: StockReservation[], pickupAt: Date, returnAt: Date) {
  const changes = items.filter(item => item.booking.pickupAt < returnAt && item.booking.returnAt > pickupAt).flatMap(item => [
    { time: Math.max(item.booking.pickupAt.getTime(), pickupAt.getTime()), units: item.quantity },
    { time: Math.min(item.booking.returnAt.getTime(), returnAt.getTime()), units: -item.quantity },
  ]).sort((a, b) => a.time - b.time || a.units - b.units);
  let current = 0, peak = 0;
  for (const change of changes) { current += change.units; peak = Math.max(peak, current); }
  return peak;
}
