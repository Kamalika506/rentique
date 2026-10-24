/** Set the five public shop-detail fields for the sample Tifara boutique only. */
import { mkdir, writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { tifaraShopDetails } from "./data/tifara-shop-details";

dotenv.config({ path: [".env.local", ".env"], quiet: true });
const db = new PrismaClient();
async function main() {
  const matches = await db.boutique.findMany({
    where: { name: { equals: "Tifara", mode: "insensitive" } },
    select: { id: true, name: true, version: true, openingHours: true, rentalPolicy: true, collectionInstructions: true, cancellationPolicy: true, returnPolicy: true },
  });
  if (matches.length !== 1) throw new Error("Expected exactly one Tifara boutique; no changes made.");
  const boutique = matches[0];
  await mkdir(".tmp/shop-details-backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeFile(`.tmp/shop-details-backups/tifara-${stamp}.json`, JSON.stringify(boutique, null, 2));
  const result = await db.boutique.updateMany({ where: { id: boutique.id, version: boutique.version }, data: { ...tifaraShopDetails, version: { increment: 1 } } });
  if (result.count !== 1) throw new Error("Boutique changed concurrently. Reload before retrying.");
  const updated = await db.boutique.findUniqueOrThrow({ where: { id: boutique.id }, select: { name: true, openingHours: true, rentalPolicy: true, collectionInstructions: true, cancellationPolicy: true, returnPolicy: true } });
  console.log(JSON.stringify(updated, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Update failed."); process.exitCode = 1; }).finally(() => db.$disconnect());
