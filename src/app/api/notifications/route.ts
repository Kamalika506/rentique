import { z } from "zod";
import { endpoint, currentUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { visibleNoticeWhere } from "@/features/notifications/server";
export const GET = endpoint(async () => {
  const user = await currentUser();
  return prisma.notification.findMany({ where: { ...visibleNoticeWhere, scheduledFor: { lte: new Date() }, userId: user.id }, orderBy: { scheduledFor: "desc" }, take: 100, select: { id: true, title: true, message: true, href: true, readAt: true, scheduledFor: true } });
});
export const PATCH = endpoint(async request => {
  const user = await currentUser();
  const { id } = z.object({ id: z.string().min(1) }).strict().parse(await request.json());
  await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { readAt: new Date() } });
  return { marked: true };
});
