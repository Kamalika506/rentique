import type { Prisma } from "@/generated/prisma/client";
import { endpoint } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { categoryLabel } from "@/features/rentals/records";
import { publicBoutiqueSelect, storefrontQuerySchema } from "@/features/boutiques/storefront/schema";

export const GET = endpoint(async (request) => {
  const { q, city, page, pageSize } = storefrontQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const where: Prisma.BoutiqueWhereInput = {
    status: "APPROVED", owner: { isActive: true },
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(q ? { OR: ["name", "description", "city"].map((key) => ({ [key]: { contains: q, mode: "insensitive" } })) } : {}),
  };
  const [boutiques, total] = await prisma.$transaction([
    prisma.boutique.findMany({ where, select: publicBoutiqueSelect, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.boutique.count({ where }),
  ]);
  return { items: boutiques.map(({ _count, ...boutique }) => ({ ...boutique, categories: boutique.categories.map(categoryLabel), productCount: _count.products })), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
});
