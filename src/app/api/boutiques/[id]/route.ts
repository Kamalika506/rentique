import { ApiError, endpoint } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { categoryLabel } from "@/features/rentals/records";
import { publicBoutiqueSelect } from "@/features/boutiques/storefront/schema";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return endpoint(async () => {
    const boutique = await prisma.boutique.findFirst({ where: { id, status: "APPROVED", owner: { isActive: true } }, select: publicBoutiqueSelect });
    if (!boutique) throw new ApiError(404, "Boutique not found.");
    const { _count, ...profile } = boutique;
    return { ...profile, categories: boutique.categories.map(categoryLabel), productCount: _count.products };
  })(request);
}
