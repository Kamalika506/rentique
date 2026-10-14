import { ApiError, endpoint, ownedBoutique } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { boutiqueSettingsSchema, boutiqueSettingsSelect } from "@/features/boutiques/storefront/schema";

export const GET = endpoint(async () => {
  const { boutique } = await ownedBoutique(false);
  return prisma.boutique.findUniqueOrThrow({ where: { id: boutique.id }, select: boutiqueSettingsSelect });
});

export const PATCH = endpoint(async (request) => {
  const { boutique } = await ownedBoutique(false);
  const { version, ...details } = boutiqueSettingsSchema.parse(await request.json());
  return prisma.$transaction(async (db) => {
    const result = await db.boutique.updateMany({
      where: { id: boutique.id, ownerId: boutique.ownerId, version },
      data: { ...details, socialLink: details.socialLink || null, version: { increment: 1 } },
    });
    if (!result.count) throw new ApiError(409, "Your boutique profile changed. Reload the latest profile before saving.");
    return db.boutique.findUniqueOrThrow({ where: { id: boutique.id }, select: boutiqueSettingsSelect });
  });
});
