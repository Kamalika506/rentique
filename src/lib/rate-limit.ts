import { createHash } from "node:crypto";
import { prisma } from "./prisma";

/** Database-backed fixed windows work across multiple application instances. */
export async function rateAllowed(scope: string, identity: string, limit: number, windowMs: number) {
  const key = `${scope}:${createHash("sha256").update(identity).digest("hex")}`;
  const now = new Date(), resetAt = new Date(now.getTime() + windowMs);
  await prisma.rateLimitBucket.upsert({ where: { key }, create: { key, count: 0, resetAt }, update: {} });
  await prisma.rateLimitBucket.updateMany({ where: { key, resetAt: { lte: now } }, data: { count: 0, resetAt } });
  const bucket = await prisma.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
  return bucket.count <= limit;
}
