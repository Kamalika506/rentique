import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"], quiet: true });
import { PrismaClient } from "../src/generated/prisma/client.js";
const db = new PrismaClient();
async function main() {
  const boutiques = await db.boutique.findMany({
    select: { id: true, name: true, status: true, ownerId: true, city: true, state: true },
    orderBy: { createdAt: "asc" },
  });
  const products = await db.product.findMany({
    select: { id: true, name: true, category: true, boutiqueId: true, _count: { select: { images: true } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(JSON.stringify({ boutiques, productCount: products.length }, null, 2));
}
main().catch(console.error).finally(() => db.$disconnect());
