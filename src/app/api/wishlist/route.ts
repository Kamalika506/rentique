import { z } from "zod";
import { endpoint, currentUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

async function ids(userId: string) { return (await prisma.wishlist.findMany({ where: { userId }, select: { productId: true } })).map(item => item.productId); }
export const GET = endpoint(async () => ids((await currentUser("CUSTOMER")).id));
export const POST = endpoint(async request => {
  const user = await currentUser("CUSTOMER");
  const { productId } = z.object({ productId: z.string().min(1) }).parse(await request.json());
  if (!await prisma.product.findFirst({ where: { id: productId, archived: false, boutique: { status: "APPROVED", owner: { isActive: true } } } })) throw new ApiError(404, "Product unavailable.");
  await prisma.wishlist.upsert({ where: { userId_productId: { userId: user.id, productId } }, create: { userId: user.id, productId }, update: {} });
  return ids(user.id);
});
export const DELETE = endpoint(async request => {
  const user = await currentUser("CUSTOMER");
  const { productId } = z.object({ productId: z.string().min(1) }).parse(await request.json());
  await prisma.wishlist.deleteMany({ where: { userId: user.id, productId } });
  return ids(user.id);
});
