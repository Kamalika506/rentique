import { z } from "zod";
import { endpoint, currentUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateAllowed } from "@/lib/rate-limit";
export const GET = endpoint(async () => {
  const user = await currentUser("CUSTOMER");
  return prisma.supportRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
});
export const POST = endpoint(async request => {
  const user = await currentUser("CUSTOMER");
  if (!await rateAllowed("support", user.id, 5, 3600000)) throw new ApiError(429, "Please wait before submitting another report.");
  const input = z.object({ bookingId: z.string().min(1).optional(), subject: z.string().trim().min(5).max(160), message: z.string().trim().min(10).max(3000) }).strict().parse(await request.json());
  if (input.bookingId && !await prisma.booking.findFirst({ where: { id: input.bookingId, customerId: user.id } })) throw new ApiError(404, "Reservation unavailable.");
  return prisma.$transaction(async tx => {
    const report = await tx.supportRequest.create({ data: { ...input, userId: user.id } });
    const admins = await tx.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    await tx.notification.createMany({ data: admins.map(admin => ({ userId: admin.id, dedupeKey: "support:" + report.id + ":" + admin.id, type: "SUPPORT", title: "Customer problem report", message: input.subject, href: "/admin/support" })) });
    return report;
  });
}, 201);
