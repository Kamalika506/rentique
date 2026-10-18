import { z } from "zod";
import { endpoint, currentUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export const GET = endpoint(async () => {
  await currentUser("ADMIN");
  return prisma.supportRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, email: true } } } });
});
export const PATCH = endpoint(async request => {
  const admin = await currentUser("ADMIN");
  const input = z.object({ id: z.string(), version: z.number().int().positive(), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]), response: z.string().trim().min(3).max(3000) }).strict().parse(await request.json());
  return prisma.$transaction(async tx => {
    const changed = await tx.supportRequest.updateMany({ where: { id: input.id, version: input.version }, data: { status: input.status, response: input.response, version: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "This report changed. Reload it.");
    const report = await tx.supportRequest.findUniqueOrThrow({ where: { id: input.id } });
    await tx.auditLog.create({ data: { actorId: admin.id, action: "SUPPORT_UPDATED", entityType: "SupportRequest", entityId: report.id, details: { status: report.status } } });
    await tx.notification.create({ data: { userId: report.userId, dedupeKey: "support:" + report.id + ":" + report.version, type: "SUPPORT", title: "Your report has an update", message: report.response, href: "/support" } });
    return report;
  });
});
