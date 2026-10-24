/** Preview: npx tsx scripts/correct-tifara-images.ts
 * Apply after inspecting .tmp/tifara-image-review/contact-sheet.jpg: append --apply.
 * Only replaces the six named sample products' image records; retains old assets and a local JSON backup.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import { tifaraProductImages } from "./data/tifara-product-images";

dotenv.config({ path: [".env.local", ".env"], quiet: true });
const directory = path.resolve(".tmp/tifara-image-review");

async function preview() {
  await mkdir(directory, { recursive: true });
  const panels = [];
  for (const [index, image] of tifaraProductImages.entries()) {
    const response = await fetch(image.url, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`Image download failed for ${image.slug}: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    // Decoding rejects HTML/error responses; keep originals for upload after visual review.
    await sharp(buffer).metadata();
    await writeFile(path.join(directory, `${image.slug}.image`), buffer);
    const panel = await sharp(buffer).rotate().resize(320, 440, { fit: "contain", background: "#f7f5f1" }).jpeg().toBuffer();
    panels.push({ input: panel, left: (index % 3) * 320, top: Math.floor(index / 3) * 440 });
    console.log(`${index + 1}. ${image.name}`);
  }
  await sharp({ create: { width: 960, height: 880, channels: 3, background: "#f7f5f1" } }).composite(panels).jpeg({ quality: 90 }).toFile(path.join(directory, "contact-sheet.jpg"));
  console.log("Preview saved to .tmp/tifara-image-review/contact-sheet.jpg (left to right, top to bottom).");
}

async function apply() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error("Cloudinary configuration is missing.");
  const db = new PrismaClient();
  try {
    const products = await db.product.findMany({
      where: { boutique: { name: { equals: "Tifara", mode: "insensitive" } }, name: { in: tifaraProductImages.map(image => image.name) } },
      select: { id: true, name: true, version: true, images: { orderBy: { position: "asc" } } },
    });
    if (products.length !== tifaraProductImages.length || new Set(products.map(product => product.name)).size !== products.length) throw new Error("Expected exactly one Tifara product for each of the six titles. No records changed.");
    await mkdir(directory, { recursive: true });
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(path.join(directory, `before-${runId}.json`), JSON.stringify(products, null, 2));
    const replacements: { product: (typeof products)[number]; publicId: string; secureUrl: string; alt: string }[] = [];
    for (const image of tifaraProductImages) {
      const buffer = await readFile(path.join(directory, `${image.slug}.image`));
      const normalized = await sharp(buffer).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
      const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
      const publicId = `rentique/tifara/corrected/${image.slug}-${digest}`;
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = createHash("sha1").update(`overwrite=false&public_id=${publicId}&timestamp=${timestamp}${secret}`).digest("hex");
      const form = new FormData();
      form.set("file", new Blob([new Uint8Array(normalized)], { type: "image/jpeg" }), `${image.slug}.jpg`);
      form.set("public_id", publicId); form.set("timestamp", timestamp); form.set("overwrite", "false"); form.set("api_key", key); form.set("signature", signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error(`Cloudinary upload failed for ${image.slug}: ${response.status}. Database images remain unchanged.`);
      const asset = await response.json() as { public_id: string; secure_url: string };
      if (asset.public_id !== publicId || !asset.secure_url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)) throw new Error("Unexpected upload response.");
      replacements.push({ product: products.find(product => product.name === image.name)!, publicId, secureUrl: asset.secure_url, alt: image.alt });
      console.log(`Uploaded: ${image.name}`);
    }
    // All assets are ready before the atomic image swap. Reject concurrent product/image edits.
    await db.$transaction(async tx => {
      for (const replacement of replacements) {
        const { product, publicId, secureUrl, alt } = replacement;
        const current = await tx.productImage.findMany({ where: { productId: product.id }, orderBy: { position: "asc" } });
        if (JSON.stringify(current) !== JSON.stringify(product.images)) throw new Error(`Images changed concurrently for ${product.name}. Retry after review.`);
        const updated = await tx.product.updateMany({ where: { id: product.id, version: product.version }, data: { version: { increment: 1 } } });
        if (updated.count !== 1) throw new Error(`Product changed concurrently: ${product.name}`);
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.create({ data: { productId: product.id, publicId, secureUrl, alt, position: 0 } });
      }
    }, { isolationLevel: "Serializable", timeout: 15000 });
    const verified = await db.product.findMany({ where: { id: { in: products.map(product => product.id) } }, select: { name: true, images: { select: { secureUrl: true, alt: true }, orderBy: { position: "asc" } } } });
    console.log(JSON.stringify(verified, null, 2));
    console.log("Replaced all six product galleries. Original metadata is backed up locally; old Cloudinary assets were retained.");
  } finally { await db.$disconnect(); }
}

(process.argv.includes("--apply") ? apply() : preview()).catch(error => { console.error(error instanceof Error ? error.message : "Image correction failed."); process.exitCode = 1; });
