import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import type { ProductCategory } from "@/generated/prisma/client";

export const canonicalCategories: { slug: string; name: string; legacyKey: ProductCategory }[] = [
  { slug: "ethnic-wear", name: "Ethnic wear", legacyKey: "ETHNIC_WEAR" },
  { slug: "western-wear", name: "Western wear", legacyKey: "WESTERN_WEAR" },
  { slug: "formal-wear", name: "Formal wear", legacyKey: "FORMAL_WEAR" },
  { slug: "occasion-wear", name: "Occasion wear", legacyKey: "PARTY_WEAR" },
  { slug: "bridal", name: "Bridal", legacyKey: "BRIDAL_WEAR" },
  { slug: "accessories", name: "Accessories", legacyKey: "ACCESSORIES" },
  { slug: "footwear", name: "Footwear", legacyKey: "FOOTWEAR" },
  { slug: "other", name: "Other", legacyKey: "OTHER" },
];

/** Add the original categories once, preserving any administrator edits. */
export async function ensureCategories() {
  const existing = await prisma.category.findMany({ select: { legacyKey: true } });
  const known = new Set(existing.map(category => category.legacyKey));
  const missing = canonicalCategories.filter(category => !known.has(category.legacyKey));
  if (missing.length) await prisma.category.createMany({ data: missing, skipDuplicates: true });
}

export async function listCategories(activeOnly = true) {
  await ensureCategories();
  return prisma.category.findMany({
    where: activeOnly ? { isActive: true } : {},
    select: { id: true, slug: true, name: true, legacyKey: true, isActive: true, version: true },
    orderBy: { name: "asc" },
  });
}

export async function resolveCategory(value: string) {
  await ensureCategories();
  const legacy = canonicalCategories.find(category => category.legacyKey === value || category.name.toLowerCase() === value.toLowerCase() || category.slug === value);
  const direct = await prisma.category.findFirst({ where: { OR: [{ id: value }, { slug: value }, { name: { equals: value, mode: "insensitive" } }] } });
  const category = direct ?? (legacy ? await prisma.category.findUnique({ where: { legacyKey: legacy.legacyKey } }) : null);
  if (!category?.isActive) throw new ApiError(400, "Choose an active product category.");
  return category;
}
