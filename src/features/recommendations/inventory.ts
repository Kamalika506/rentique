import { prisma } from "@/lib/prisma";
import { lineAmounts } from "../rentals/rules";
import { availableInventoryForVariants } from "../rentals/inventory-units";
import type { RecommendationInventoryAdapter, InventoryCandidate } from "./contracts";

export const databaseInventory: RecommendationInventoryAdapter = {
  async search(input, signal) {
    if (!input.rentalDates || signal.aborted) return [];
    const { start, end } = input.rentalDates;
    const pickupAt = new Date(`${start}T00:00:00+05:30`), returnAt = new Date(`${end}T00:00:00+05:30`);
    if (pickupAt <= new Date() || returnAt <= pickupAt) return [];
    const days = Math.ceil((returnAt.getTime() - pickupAt.getTime()) / 86400000);
    if (days > 14 || pickupAt.getTime() < Date.now() + 24 * 3600000 || pickupAt.getTime() > Date.now() + 180 * 86400000) return [];
    const products = await prisma.product.findMany({ where: { archived: false, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }], boutique: { status: "APPROVED", owner: { isActive: true }, ...(input.city ? { city: { equals: input.city, mode: "insensitive" } } : {}) } },
      include: { boutique: true, variants: { where: { archived: false } } }, take: 200, orderBy: { createdAt: "desc" } });
    if (signal.aborted) return [];
    const variants = products.flatMap(product => product.variants.map(variant => ({ product, variant })));
    const available = await availableInventoryForVariants(prisma, variants.map(({ variant }) => variant.id), pickupAt, new Date(returnAt.getTime() + 86400000));
    return products.flatMap(product => {
      const jewellery = product.garmentType === "jewellery" || (product.category === "ACCESSORIES" && product.garmentType !== "accessory");
      if (product.garmentType === "accessory" || product.category === "FOOTWEAR") return [];
      const productVariants = product.variants.filter(variant => jewellery || !input.size || variant.size.toLowerCase() === input.size.toLowerCase()).map(variant => ({ variant, available: available.get(variant.id)?.length ?? 0, quote: Number(lineAmounts(variant.rentalPriceMinor ?? product.rentalPriceMinor, BigInt(0), product.rentalPriceUnit, days, 1).rentalMinor) })).filter(variant => variant.available > 0).sort((a, b) => a.quote - b.quote);
      if (!productVariants.length) return [];
      const text = `${product.name} ${product.fabricStyle} ${product.description}`.toLowerCase();
      const candidate: InventoryCandidate = { id: product.id, name: product.name, boutiqueId: product.boutiqueId, boutiqueName: product.boutique.name, boutiqueStatus: product.boutique.status, archived: product.archived,
        kind: jewellery ? "jewellery" : "outfit", outfitType: product.garmentType !== "other" ? product.garmentType : text.match(/\b(saree|lehenga|gown|suit|dress)\b/)?.[1] ?? "other", colours: product.colours, jewelleryType: text.includes("gold") ? "gold" : text.includes("silver") ? "silver" : "other", city: product.boutique.city, occasionTags: product.occasionTags, styleTags: ["traditional", "minimal", "festive", "formal", "contemporary"].filter(tag => new RegExp(`\\b${tag}\\b`).test(text)), rentalMinor: productVariants[0].quote,
        availableSizes: productVariants.map(item => item.variant.size), variantId: productVariants[0].variant.id, size: productVariants[0].variant.size,
        availability: { status: "AVAILABLE", availableUnits: productVariants[0].available, start, end, checkedAt: new Date().toISOString() } };
      return [candidate];
    });
  },
};
