/**
 * Seed script for boutique "Tifara"
 * ─────────────────────────────────
 * Seeds luxury designer ethnic, bridal, party wear and accessories for Tifara boutique.
 * Uploads high-resolution images to Cloudinary with stable IDs under `rentique/tifara/...`.
 *
 * Idempotent:
 *  • Skips products whose name already exists in the boutique.
 *  • Skips images if already linked.
 *
 * Run with: npx tsx scripts/seed-tifara.ts
 */

import { createHash } from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

import { PrismaClient } from "../src/generated/prisma/client.js";

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD || !KEY || !SECRET) {
  process.stderr.write("CLOUDINARY environment variables must be configured.\n");
  process.exit(1);
}

function signUpload(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(sorted + secret).digest("hex");
}

async function uploadToCloudinary(
  imageBuffer: Buffer,
  publicId: string,
  mimeType: string
): Promise<{ secureUrl: string; reused: boolean }> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp,
    overwrite: "false",
  };
  const signature = signUpload(params, SECRET!);

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(imageBuffer)], { type: mimeType }));
  formData.append("api_key", KEY!);
  formData.append("timestamp", timestamp);
  formData.append("public_id", publicId);
  formData.append("overwrite", "false");
  formData.append("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`;
  const response = await fetch(endpoint, { method: "POST", body: formData });

  if (response.ok) {
    const data = (await response.json()) as { secure_url: string };
    return { secureUrl: data.secure_url, reused: false };
  }

  // If already exists or conflict, fetch existing URL
  const authHeader = "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64");
  const infoEndpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/upload/${encodeURIComponent(publicId)}`;
  const infoRes = await fetch(infoEndpoint, { headers: { Authorization: authHeader } });
  if (infoRes.ok) {
    const info = (await infoRes.json()) as { secure_url: string };
    if (info.secure_url) return { secureUrl: info.secure_url, reused: true };
  }

  const errorText = await response.text().catch(() => "(no body)");
  throw new Error(`Cloudinary upload failed (${response.status}): ${errorText.slice(0, 200)}`);
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { "User-Agent": "Rentique-seed/1.0" },
  });
  if (!response.ok) throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mimeType = contentType.split(";")[0].trim();
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

interface SeedProduct {
  name: string;
  description: string;
  category: "ETHNIC_WEAR" | "WESTERN_WEAR" | "PARTY_WEAR" | "BRIDAL_WEAR" | "FORMAL_WEAR" | "ACCESSORIES" | "FOOTWEAR" | "OTHER";
  categoryId: string;
  fabricStyle: string;
  occasionTags: string[];
  colours: string[];
  rentalPriceMinor: bigint;
  depositMinor: bigint;
  rentalPriceUnit: "PER_DAY" | "PER_RENTAL";
  size: string;
  quantity: number;
  slug: string;
  images: Array<{ url: string; alt: string }>;
}

const TIFARA_PRODUCTS: SeedProduct[] = [
  {
    slug: "tifara-crimson-bridal-lehenga",
    name: "Crimson Raw Silk Handcrafted Bridal Lehenga",
    description:
      "A flagship couture piece from Tifara's bridal gallery. Meticulously handcrafted in crimson raw silk with antique gold zardozi, dabka, and pearl embellishments. Paired with a heavy artisanal blouse and a dual-dupatta set in tissue organza with scalloped borders.",
    category: "BRIDAL_WEAR",
    categoryId: "cat-bridal",
    fabricStyle: "Raw silk with antique gold zardozi and dabka hand embroidery",
    occasionTags: ["Bridal", "Wedding", "Reception"],
    colours: ["Crimson Red", "Antique Gold"],
    rentalPriceMinor: BigInt(450000), // ₹4,500
    depositMinor: BigInt(1800000),    // ₹18,000
    rentalPriceUnit: "PER_RENTAL",
    size: "M",
    quantity: 1,
    images: [
      {
        url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Crimson raw silk bridal lehenga full drape",
      },
      {
        url: "https://plus.unsplash.com/premium_photo-1682096060450-6ac06a3a0478?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Handcrafted zardozi detail on crimson lehenga",
      },
    ],
  },
  {
    slug: "tifara-kanjivaram-tissue-saree",
    name: "Heritage Gold Kanjivaram Tissue Silk Saree",
    description:
      "An heirloom tissue Kanjivaram silk saree woven in pure metallic gold thread with korvai temple borders in rich vermillion. Sourced from master weavers, this timeless classic radiates regal majesty, perfect for muhurtham and auspicious celebrations.",
    category: "ETHNIC_WEAR",
    categoryId: "cat-ethnic",
    fabricStyle: "Pure gold tissue silk, korvai zari weave",
    occasionTags: ["Wedding", "Muhurtham", "Traditional", "Puja"],
    colours: ["Gold", "Vermillion"],
    rentalPriceMinor: BigInt(220000), // ₹2,200
    depositMinor: BigInt(800000),     // ₹8,000
    rentalPriceUnit: "PER_DAY",
    size: "Free size",
    quantity: 2,
    images: [
      {
        url: "https://plus.unsplash.com/premium_photo-1682092632793-c7d75b23718e?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Gold Kanjivaram tissue saree with temple border",
      },
      {
        url: "https://images.unsplash.com/photo-1733937140732-2cc70a1d7017?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Close-up of intricate gold zari pallu weave",
      },
    ],
  },
  {
    slug: "tifara-champagne-couture-gown",
    name: "Champagne Shimmer Flared Couture Gown",
    description:
      "A red-carpet ready gown designed for high-glamour evening affairs. Featuring a corset-fitted bodice, intricate crystalline bugle beading, and a sweeping pleated metallic tulle skirt that glides effortlessly across the ballroom.",
    category: "PARTY_WEAR",
    categoryId: "cat-occasion",
    fabricStyle: "Metallic shimmer tulle with bugle bead embellishments",
    occasionTags: ["Cocktail", "Reception", "Gala", "Sangeet"],
    colours: ["Champagne", "Rose Gold"],
    rentalPriceMinor: BigInt(320000), // ₹3,200
    depositMinor: BigInt(1200000),    // ₹12,000
    rentalPriceUnit: "PER_RENTAL",
    size: "S",
    quantity: 1,
    images: [
      {
        url: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Champagne shimmer flared couture gown",
      },
      {
        url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Corset and beading detail on champagne evening gown",
      },
    ],
  },
  {
    slug: "tifara-sage-green-anarkali",
    name: "Sage Green Georgette Gota Patti Anarkali",
    description:
      "A serene pastel ensemble featuring fine Rajasthani gota patti and resham thread embroidery across a 48-kali flared skirt. Paired with a delicate bandhani printed dupatta and tailored silk churidar, ideal for mehendi and daytime celebrations.",
    category: "ETHNIC_WEAR",
    categoryId: "cat-ethnic",
    fabricStyle: "Flowing georgette with hand-stitched gota patti",
    occasionTags: ["Mehendi", "Sangeet", "Haldi", "Festival"],
    colours: ["Sage Green", "Silver"],
    rentalPriceMinor: BigInt(180000), // ₹1,800
    depositMinor: BigInt(600000),     // ₹6,000
    rentalPriceUnit: "PER_DAY",
    size: "L",
    quantity: 2,
    images: [
      {
        url: "https://images.unsplash.com/photo-1622495966027-e0173192c728?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Sage green georgette flared Anarkali suit",
      },
      {
        url: "https://images.unsplash.com/photo-1614251055880-ee96e4803393?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Gota patti neckline and hem detail",
      },
    ],
  },
  {
    slug: "tifara-emerald-polki-choker",
    name: "Colombian Emerald & Polki Diamond Choker Set",
    description:
      "An awe-inspiring royal statement jewelry set crafted with uncut polki stones set in 22kt gold plating, accented by natural uncut emerald drops and south sea pearls. Includes matching chandelier earrings and a maang tikka.",
    category: "ACCESSORIES",
    categoryId: "cat-accessories",
    fabricStyle: "22kt gold finish, uncut polki stones, simulated emerald beads",
    occasionTags: ["Bridal", "Wedding", "Reception"],
    colours: ["Emerald Green", "Gold", "Ivory"],
    rentalPriceMinor: BigInt(150000), // ₹1,500
    depositMinor: BigInt(500000),     // ₹5,000
    rentalPriceUnit: "PER_DAY",
    size: "Free size",
    quantity: 2,
    images: [
      {
        url: "https://images.unsplash.com/photo-1535556116002-6281ff3e9f36?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Polki and emerald bridal choker necklace set",
      },
      {
        url: "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Choker set earring and craftsmanship detail",
      },
    ],
  },
  {
    slug: "tifara-midnight-blue-sherwani",
    name: "Midnight Blue Velvet Designer Indowestern Set",
    description:
      "Tailored for distinguished modern gentlemen and cocktail occasions. An asymmetric midnight blue velvet bandhgala jacket with tonal thread embroidery on the collar and cuffs, paired with tapered breeches and an embroidered pocket square.",
    category: "ETHNIC_WEAR",
    categoryId: "cat-ethnic",
    fabricStyle: "Plush micro-velvet with tonal resham threadwork",
    occasionTags: ["Sangeet", "Cocktail", "Reception", "Party"],
    colours: ["Midnight Blue", "Navy"],
    rentalPriceMinor: BigInt(250000), // ₹2,500
    depositMinor: BigInt(900000),     // ₹9,000
    rentalPriceUnit: "PER_RENTAL",
    size: "42",
    quantity: 2,
    images: [
      {
        url: "https://images.unsplash.com/photo-1632149877166-f75d49000351?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Midnight blue structured designer Indowestern set",
      },
      {
        url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Collar embroidery and velvet texture detail",
      },
    ],
  },
];

const db = new PrismaClient();

async function seedProduct(boutiqueId: string, product: SeedProduct): Promise<"created" | "skipped"> {
  process.stdout.write(`\n-> "${product.name}"\n`);

  const existing = await db.product.findFirst({
    where: { boutiqueId, name: product.name },
    include: { images: true },
  });

  let productId: string;

  if (existing) {
    productId = existing.id;
    process.stdout.write(`   Already exists (id=${productId})\n`);
    if (existing.images.length > 0) {
      process.stdout.write(`   ${existing.images.length} image(s) already linked — skipped\n`);
      return "skipped";
    }
  } else {
    const created = await db.product.create({
      data: {
        boutiqueId,
        name: product.name,
        description: product.description,
        category: product.category,
        categoryId: product.categoryId,
        fabricStyle: product.fabricStyle,
        occasionTags: product.occasionTags,
        colours: product.colours,
        rentalPriceMinor: product.rentalPriceMinor,
        depositMinor: product.depositMinor,
        rentalPriceUnit: product.rentalPriceUnit,
        variants: {
          create: { size: product.size, quantity: product.quantity },
        },
      },
    });
    productId = created.id;
    process.stdout.write(`   Created (id=${productId})\n`);
  }

  const imageRecords: { publicId: string; secureUrl: string; alt: string; position: number }[] = [];

  for (let i = 0; i < product.images.length; i++) {
    const { url, alt } = product.images[i];
    const publicId = `rentique/tifara/${product.slug}-${i + 1}`;

    process.stdout.write(`   Img ${i + 1}: downloading…\n`);
    let imageBuffer: Buffer;
    let mimeType: string;
    try {
      ({ buffer: imageBuffer, mimeType } = await downloadImage(url));
    } catch (err) {
      process.stderr.write(`   Download failed: ${(err as Error).message}\n`);
      continue;
    }

    process.stdout.write(`   Img ${i + 1}: uploading to Cloudinary (${publicId})…\n`);
    let secureUrl: string;
    let reused: boolean;
    try {
      ({ secureUrl, reused } = await uploadToCloudinary(imageBuffer, publicId, mimeType));
    } catch (err) {
      process.stderr.write(`   Upload failed: ${(err as Error).message}\n`);
      continue;
    }

    const status = reused ? "reused" : "uploaded";
    process.stdout.write(`   Img ${i + 1}: ${status} -> ${secureUrl}\n`);
    imageRecords.push({ publicId, secureUrl, alt, position: i });
  }

  if (imageRecords.length > 0) {
    await db.productImage.createMany({
      data: imageRecords.map((r) => ({ ...r, productId })),
    });
    process.stdout.write(`   Linked ${imageRecords.length} image(s) to product\n`);
  }

  return existing ? "skipped" : "created";
}

async function main() {
  process.stdout.write("==========================================\n");
  process.stdout.write("Seeding data for boutique: Tifara\n");
  process.stdout.write("==========================================\n\n");

  const boutique = await db.boutique.findFirst({
    where: { name: { equals: "Tifara", mode: "insensitive" } },
  });

  if (!boutique) {
    process.stderr.write('Boutique "Tifara" not found in database!\n');
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Found boutique "${boutique.name}" (id: ${boutique.id}, status: ${boutique.status})\n`);

  if (boutique.status !== "APPROVED") {
    await db.boutique.update({
      where: { id: boutique.id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
    process.stdout.write(`Boutique "${boutique.name}" set to APPROVED.\n`);
  }

  let created = 0, skipped = 0, failed = 0;

  for (const product of TIFARA_PRODUCTS) {
    try {
      const res = await seedProduct(boutique.id, product);
      if (res === "created") created++;
      else skipped++;
    } catch (err) {
      process.stderr.write(`FAILED "${product.name}": ${(err as Error).message}\n`);
      failed++;
    }
  }

  process.stdout.write("\n==========================================\n");
  process.stdout.write(`Tifara seed complete: ${created} created, ${skipped} skipped, ${failed} failed\n`);

  const totalProducts = await db.product.count({ where: { boutiqueId: boutique.id } });
  const totalImages = await db.productImage.count({ where: { product: { boutiqueId: boutique.id } } });
  process.stdout.write(`Tifara Boutique Total: ${totalProducts} product(s), ${totalImages} image(s)\n`);
}

main()
  .catch((err) => {
    process.stderr.write(`Seed error: ${(err as Error).message}\n`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
