import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail, smtpConfigured, applicationUrl } from "@/lib/mail";

type BookingNotice = { id: string; customerId: string; boutiqueId: string; pickupAt: Date; returnAt: Date; version: number };
export async function notifyBooking(tx: Prisma.TransactionClient, booking: BookingNotice, type: string, title: string, message: string) {
  const shop = await tx.boutique.findUniqueOrThrow({ where: { id: booking.boutiqueId }, select: { ownerId: true } });
  const recipients = [{ id: booking.customerId, href: "/my-rentals#" + booking.id }, { id: shop.ownerId, href: "/boutique/bookings/" + booking.id }];
  await tx.notification.createMany({ data: recipients.map(recipient => ({
    userId: recipient.id, bookingId: booking.id, dedupeKey: booking.id + ":" + type + ":" + booking.version + ":" + recipient.id,
    type, title, message, href: recipient.href,
  })), skipDuplicates: true });
  if (type === "CONFIRMED") await tx.notification.createMany({
    data: recipients.flatMap(recipient => [
      { userId: recipient.id, bookingId: booking.id, type: "PICKUP_REMINDER", title: "Upcoming shop pickup", message: "Your reservation is ready to plan for. Check the agreed pickup time and shop hours.", href: recipient.href, scheduledFor: new Date(Math.max(Date.now(), booking.pickupAt.getTime() - 86400000)), dedupeKey: booking.id + ":pickup:" + recipient.id },
      { userId: recipient.id, bookingId: booking.id, type: "RETURN_REMINDER", title: "Upcoming shop return", message: "Please return all reserved items at the agreed shop and time.", href: recipient.href, scheduledFor: new Date(Math.max(Date.now(), booking.returnAt.getTime() - 86400000)), dedupeKey: booking.id + ":return:" + recipient.id },
    ]), skipDuplicates: true,
  });
}

export const visibleNoticeWhere: Prisma.NotificationWhereInput = {
  scheduledFor: { lte: new Date() },
  OR: [
    { type: { notIn: ["PICKUP_REMINDER", "RETURN_REMINDER"] } },
    { type: "PICKUP_REMINDER", booking: { status: "CONFIRMED" } },
    { type: "RETURN_REMINDER", booking: { status: { in: ["CONFIRMED", "PICKED_UP"] } } },
  ],
};

export async function runNotificationJobs() {
  const due = await prisma.booking.findMany({ where: { status: "PENDING", requestExpiresAt: { lte: new Date() } }, take: 100 });
  let expired = 0;
  for (const booking of due) await prisma.$transaction(async tx => {
    const result = await tx.booking.updateMany({ where: { id: booking.id, status: "PENDING", requestExpiresAt: { lte: new Date() }, version: booking.version }, data: { status: "EXPIRED", version: { increment: 1 } } });
    if (!result.count) return;
    await tx.bookingEvent.create({ data: { bookingId: booking.id, action: "EXPIRED", fromStatus: "PENDING", toStatus: "EXPIRED" } });
    await notifyBooking(tx, { ...booking, version: booking.version + 1 }, "EXPIRED", "Reservation request expired", "The boutique did not confirm before the deadline. The stock hold has been released.");
    expired++;
  });
  const overdue = await prisma.booking.findMany({ where: { status: "PICKED_UP", returnAt: { lt: new Date() } }, take: 100 });
  for (const booking of overdue) await prisma.$transaction(tx => notifyBooking(tx, booking, "OVERDUE", "Shop return overdue", "One or more items have not been acknowledged as returned. Please contact the boutique."));
  await prisma.bookingQuote.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86400000) } } });
  const origin = applicationUrl();
  if (!smtpConfigured() || !origin) return { expired, sent: 0, email: "not_configured" };
  const notices = await prisma.notification.findMany({ where: { ...visibleNoticeWhere, scheduledFor: { lte: new Date() }, emailedAt: null, attempts: { lt: 5 }, AND: [{ OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }] }, include: { user: { select: { email: true, isActive: true } } }, take: 50, orderBy: { scheduledFor: "asc" } });
  let sent = 0;
  for (const notice of notices) {
    if (!notice.user.isActive || !notice.user.email) continue;
    const claimed = await prisma.notification.updateMany({ where: { id: notice.id, emailedAt: null, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseUntil: new Date(Date.now() + 5 * 60000), attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      await sendMail({ to: notice.user.email, subject: notice.title, text: notice.message + "\n" + new URL(notice.href, origin).href });
      await prisma.notification.update({ where: { id: notice.id }, data: { emailedAt: new Date(), leaseUntil: null } }); sent++;
    } catch { /* Durable retry after lease expiry; booking state is unaffected. */ }
  }
  return { expired, sent, email: "configured" };
}
