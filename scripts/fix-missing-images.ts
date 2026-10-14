/**
 * Fix missing images for products that had 404 Unsplash downloads in the first seed run.
 * Only runs for products that have 0 images in the database.
 * Idempotent — safe to run multiple times.
 */

import { createHash } from "node:crypto";
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"], quiet: true });

import { PrismaClient } from "../src/generated/prisma/client.js";

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY   = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD || !KEY || !SECRET) {
  process.stderr.write("Cloudinary env vars missing.\n");
  process.exit(1);
}

function signUpload(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(sorted + secret).digest("hex");
}

async function uploadToCloudinary(imageBuffer: Buffer, publicId: string, mimeType: string): Promise<{ secureUrl: string; reused: boolean }> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { overwrite: "false", public_id: publicId, timestamp };
  const signature = signUpload(params, SECRET!);
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), "image.jpg");
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("overwrite", "false");
  form.set("api_key", KEY!);
  form.set("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD!)}/image/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(90_000) });
  if (response.ok) {
    const asset = await response.json() as { secure_url: string };
    return { secureUrl: asset.secure_url, reused: false };
  }
  if (response.status === 420 || response.status === 400) {
    const infoRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD!)}/resources/image/upload/${encodeURIComponent(publicId)}`, { headers: { Authorization: `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}` }, signal: AbortSignal.timeout(15_000) });
    if (infoRes.ok) { const info = await infoRes.json() as { secure_url: string }; if (info.secure_url) return { secureUrl: info.secure_url, reused: true }; }
  }
  const txt = await response.text().catch(() => "");
  throw new Error(`Cloudinary upload failed (${response.status}): ${txt.slice(0, 200)}`);
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "Rentique-seed/1.0" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  return { buffer: Buffer.from(await response.arrayBuffer()), mimeType: contentType.split(";")[0].trim() };
}

// Products that had 404s + replacement verified Unsplash URLs (w=800 API format)
const FIX_TARGETS = [
  {
    name: "Royal Silk Banarasi Saree",
    slug: "royal-silk-saree",
    images: [
      { url: "https://plus.unsplash.com/premium_photo-1682092632793-c7d75b23718e?w=800&h=1000&fit=crop&auto=format&q=85", alt: "Royal Red Banarasi Silk Saree with gold zari border" },
      { url: "https://images.unsplash.com/photo-1733937140732-2cc70a1d7017?w=800&h=1000&fit=crop&auto=format&q=85", alt: "Saree draped detail showing intricate weave" },
    ],
  },
  {
    name: "Ivory Embroidered Bridal Lehenga",
    slug: "ivory-lehenga",
    images: [
      { url: "https://plus.unsplash.com/premium_photo-1682096060450-6ac06a3a0478?w=800&h=1000&fit=crop&auto=format&q=85", alt: "Ivory embroidered bridal lehenga set full view" },
      { url: "https://plus.unsplash.com/premium_photo-1724762178439-1f93ad3f3cb6?w=800&h=1000&fit=crop&auto=format&q=85", alt: "Embroidery close-up on bridal lehenga" },
    ],
  },
  {
    name: "Pastel Pink Sharara Set",
    slug: "pastel-sharara",
    // Only image 2 failed (was a duplicate URL reuse). Image 1 already uploaded as pastel-sharara-1.
    startIndex: 2, // upload as pastel-sharara-2
    images: [
      { url: "https://plus.unsplash.com/premium_photo-1724762182780-000d248f9301?w=800&h=1000&fit=crop&auto=format&q=85", alt: "Sharara set dupatta detail" },
    ],
  },
  {
    name: "Emerald Green Block Print Salwar Kameez",
    slug: "emerald-salwar",
    images: [
      { url: "https://plus.unsplash.com/premium_photo-1682092632793-c7d75b23718e?w=800&h=1000&fit=crop&auto=format&q=85", alt: "Emerald green block-print salwar kameez" },
      { url: "https://images.unsplash.com/photo-1733937140732-2cc70a1d7017?w=800&h=1000&fit=crop&auto=format&q=85", alt: "Block print detail on emerald salwar kameez" },
    ],
  },
];

const db = new PrismaClient();

async function main() {
  const boutique = await db.boutique.findFirst({ orderBy: { createdAt: "asc" } });
  if (!boutique) { process.stderr.write("No boutique found.\n"); process.exitCode = 1; return; }

  for (const target of FIX_TARGETS) {
    const product = await db.product.findFirst({ where: { boutiqueId: boutique.id, name: target.name }, include: { images: true } });
    if (!product) { process.stdout.write(`SKIP: Product "${target.name}" not found.\n`); continue; }

    const startIndex = (target as { startIndex?: number }).startIndex ?? 1;
    const existingCount = product.images.length;

    // For pastel-sharara, only add image 2 if there's exactly 1 image already
    if (target.slug === "pastel-sharara" && existingCount >= 2) {
      process.stdout.write(`SKIP: "${target.name}" already has ${existingCount} image(s).\n`);
      continue;
    }
    // For others, skip entirely if any images already present
    if (target.slug !== "pastel-sharara" && existingCount > 0) {
      process.stdout.write(`SKIP: "${target.name}" already has ${existingCount} image(s).\n`);
      continue;
    }

    process.stdout.write(`\nFix: "${target.name}" (${product.id})\n`);
    const records: { publicId: string; secureUrl: string; alt: string; position: number }[] = [];

    for (let i = 0; i < target.images.length; i++) {
      const { url, alt } = target.images[i];
      const imgIndex = startIndex + i;
      const publicId = `rentique/seed/${target.slug}-${imgIndex}`;
      process.stdout.write(`  Img ${imgIndex}: downloading…\n`);
      try {
        const { buffer, mimeType } = await downloadImage(url);
        process.stdout.write(`  Img ${imgIndex}: uploading (${publicId})…\n`);
        const { secureUrl, reused } = await uploadToCloudinary(buffer, publicId, mimeType);
        process.stdout.write(`  Img ${imgIndex}: ${reused ? "reused" : "uploaded"} -> ${secureUrl}\n`);
        records.push({ publicId, secureUrl, alt, position: existingCount + i });
      } catch (err) {
        process.stderr.write(`  Img ${imgIndex}: FAILED — ${(err as Error).message}\n`);
      }
    }

    if (records.length > 0) {
      await db.productImage.createMany({ data: records.map((r) => ({ ...r, productId: product.id })) });
      process.stdout.write(`  Linked ${records.length} image(s).\n`);
    }
  }

  const totalImages = await db.productImage.count();
  process.stdout.write(`\nDone. Total images in DB: ${totalImages}\n`);
}

main()
  .catch((err) => { process.stderr.write(`Error: ${(err as Error).message}\n`); process.exitCode = 1; })
  .finally(() => db.$disconnect());
