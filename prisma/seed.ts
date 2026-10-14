/**
 * Rentique development seed
 * ─────────────────────────
 * Creates sample boutique products and uploads cover images to Cloudinary.
 *
 * Idempotent:
 *  • Skips products whose name already exists in the boutique.
 *  • Uses Cloudinary `overwrite=false` + reads existing resource on 420 so no
 *    duplicate uploads occur on re-runs.
 *  • Does not delete or modify any existing database records.
 *
 * Image source: Unsplash (https://unsplash.com/license) — free for commercial
 * use without attribution required.
 *
 * Run with:  npm run db:seed
 */

import { createHash } from "node:crypto";
import dotenv from "dotenv";

// Match Next.js environment precedence.
dotenv.config({ path: [".env.local", ".env"], quiet: true });

import { PrismaClient } from "../src/generated/prisma/client.js";

// ── Cloudinary helpers ────────────────────────────────────────────────────────

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY   = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD || !KEY || !SECRET) {
  process.stderr.write(
    "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set.\n"
  );
  process.exit(1);
}

/** Build a v1 signed-upload signature (SHA-1 of sorted params + secret). */
function signUpload(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(sorted + secret).digest("hex");
}

/**
 * Upload a Buffer to Cloudinary under `publicId`.
 * - Uses `overwrite=false` so a second run reuses the existing asset.
 * - On HTTP 420 / 400 the existing resource is fetched via the Admin API.
 * Returns the secure delivery URL and whether the asset was reused.
 */
async function uploadToCloudinary(
  imageBuffer: Buffer,
  publicId: string,
  mimeType: string
): Promise<{ secureUrl: string; reused: boolean }> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params: Record<string, string> = {
    overwrite: "false",
    public_id: publicId,
    timestamp,
  };
  const signature = signUpload(params, SECRET!);

  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), "image.jpg");
  form.set("public_id", publicId);
  form.set("timestamp",  timestamp);
  form.set("overwrite",  "false");
  form.set("api_key",    KEY!);
  form.set("signature",  signature);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD!)}/image/upload`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(90_000),
  });

  if (response.ok) {
    const asset = await response.json() as { secure_url: string; public_id: string };
    if (!asset.secure_url?.startsWith(`https://res.cloudinary.com/${CLOUD}/image/upload/`)) {
      throw new Error(`Unexpected Cloudinary response for ${publicId}`);
    }
    return { secureUrl: asset.secure_url, reused: false };
  }

  // 420 / 400 = resource already exists when overwrite=false
  if (response.status === 420 || response.status === 400) {
    const infoUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD!)}/resources/image/upload/${encodeURIComponent(publicId)}`;
    const infoRes = await fetch(infoUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (infoRes.ok) {
      const info = await infoRes.json() as { secure_url: string };
      if (info.secure_url) return { secureUrl: info.secure_url, reused: true };
    }
  }

  const errorText = await response.text().catch(() => "(no body)");
  throw new Error(`Cloudinary upload failed (${response.status}): ${errorText.slice(0, 200)}`);
}

/** Download an image from a URL, following redirects. Returns raw bytes + MIME. */
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

// ── Seed manifest ─────────────────────────────────────────────────────────────

interface SeedProduct {
  name: string;
  description: string;
  category: "ETHNIC_WEAR" | "WESTERN_WEAR" | "PARTY_WEAR" | "BRIDAL_WEAR" | "FORMAL_WEAR" | "ACCESSORIES" | "FOOTWEAR" | "OTHER";
  categoryId: string;
  fabricStyle: string;
  occasionTags: string[];
  colours: string[];
  rentalPriceMinor: bigint; // paise
  depositMinor: bigint;     // paise
  rentalPriceUnit: "PER_DAY" | "PER_RENTAL";
  size: string;
  quantity: number;
  slug: string;
  images: Array<{ url: string; alt: string }>;
}

const PRODUCTS: SeedProduct[] = [
  {
    slug: "royal-silk-saree",
    name: "Royal Silk Banarasi Saree",
    description:
      "An opulent Banarasi silk saree woven with intricate zari motifs and a contrast woven border. Comes with an unstitched blouse piece in matching silk. Perfect for weddings, receptions, and festive celebrations. Dry clean only.",
    category: "ETHNIC_WEAR",
    categoryId: "cat-ethnic",
    fabricStyle: "Banarasi silk, zari weave",
    occasionTags: ["Wedding", "Festival", "Reception"],
    colours: ["Red", "Gold"],
    rentalPriceMinor: BigInt(120000),
    depositMinor: BigInt(500000),
    rentalPriceUnit: "PER_DAY",
    size: "Free size",
    quantity: 2,
    images: [
      {
        url: "https://plus.unsplash.com/premium_photo-1682092632793-c7d75b23718e?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Royal Red Banarasi Silk Saree with gold zari border",
      },
      {
        url: "https://images.unsplash.com/photo-1733937140732-2cc70a1d7017?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Saree draped detail showing intricate weave",
      },
    ],
  },
  {
    slug: "ivory-lehenga",
    name: "Ivory Embroidered Bridal Lehenga",
    description:
      "A stunning ivory lehenga set crafted from heavy georgette, embellished with dense thread embroidery and sequin work throughout. The set includes a fully-lined skirt, a matching embroidered blouse, and a sheer dupatta with scalloped edges. Ideal for brides and bridesmaids.",
    category: "BRIDAL_WEAR",
    categoryId: "cat-bridal",
    fabricStyle: "Heavy georgette, thread and sequin embroidery",
    occasionTags: ["Bridal", "Wedding", "Sangeet"],
    colours: ["Ivory", "Gold"],
    rentalPriceMinor: BigInt(350000),
    depositMinor: BigInt(1500000),
    rentalPriceUnit: "PER_RENTAL",
    size: "S",
    quantity: 1,
    images: [
      {
        url: "https://plus.unsplash.com/premium_photo-1682096060450-6ac06a3a0478?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Ivory embroidered bridal lehenga set full view",
      },
      {
        url: "https://plus.unsplash.com/premium_photo-1724762178439-1f93ad3f3cb6?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Embroidery close-up on bridal lehenga",
      },
    ],
  },
  {
    slug: "teal-anarkali",
    name: "Teal Anarkali Suit",
    description:
      "A floor-length teal Anarkali suit featuring a layered flared silhouette with mirror-work accents on the yoke and cuffs. Lightweight crepe fabric makes it comfortable for long events. Comes with matching churidar and a contrast dupatta. Perfect for Eid, family functions, and Diwali parties.",
    category: "ETHNIC_WEAR",
    categoryId: "cat-ethnic",
    fabricStyle: "Lightweight crepe, mirror work",
    occasionTags: ["Eid", "Festival", "Family function", "Diwali"],
    colours: ["Teal", "Silver"],
    rentalPriceMinor: BigInt(80000),
    depositMinor: BigInt(300000),
    rentalPriceUnit: "PER_DAY",
    size: "M",
    quantity: 3,
    images: [
      {
        url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Teal Anarkali floor-length suit",
      },
      {
        url: "https://images.unsplash.com/photo-1622495966027-e0173192c728?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Embroidery detail on Anarkali suit",
      },
    ],
  },
  {
    slug: "burgundy-gown",
    name: "Burgundy Velvet Evening Gown",
    description:
      "A statement velvet evening gown in deep burgundy with a fitted bodice, draped neckline, and a subtle train. The structured boning provides elegant shape without discomfort. Back zip closure with a covered hook. Best suited for gala dinners, award nights, and cocktail parties.",
    category: "WESTERN_WEAR",
    categoryId: "cat-western",
    fabricStyle: "Crushed velvet, structured boning",
    occasionTags: ["Gala", "Cocktail", "Award night"],
    colours: ["Burgundy"],
    rentalPriceMinor: BigInt(200000),
    depositMinor: BigInt(800000),
    rentalPriceUnit: "PER_RENTAL",
    size: "M",
    quantity: 1,
    images: [
      {
        url: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Burgundy velvet evening gown full length",
      },
      {
        url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Gown back detail showing structured silhouette",
      },
    ],
  },
  {
    slug: "pastel-sharara",
    name: "Pastel Pink Sharara Set",
    description:
      "A dreamy pastel pink sharara set featuring a cropped kurti top with intricate chikankari embroidery and wide-leg sharara trousers. Lightweight muslin fabric. Includes a sheer organza dupatta with delicate lace border.",
    category: "ETHNIC_WEAR",
    categoryId: "cat-ethnic",
    fabricStyle: "Muslin, chikankari embroidery, organza dupatta",
    occasionTags: ["Mehendi", "Baby shower", "Haldi", "Festival"],
    colours: ["Pastel Pink", "White"],
    rentalPriceMinor: BigInt(75000),
    depositMinor: BigInt(250000),
    rentalPriceUnit: "PER_DAY",
    size: "S",
    quantity: 2,
    images: [
      {
        url: "https://images.unsplash.com/photo-1614251055880-ee96e4803393?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Pastel pink sharara set full look",
      },
      {
        url: "https://plus.unsplash.com/premium_photo-1724762182780-000d248f9301?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Sharara set dupatta detail",
      },
    ],
  },
  {
    slug: "navy-blazer-dress",
    name: "Navy Power Blazer Dress",
    description:
      "A sharp, structured blazer dress in navy blue with contrast stitching and gold-tone buttons. Features padded shoulders, a nipped waist belt, and side pockets. Pairs with heels for formal or sneakers for business casual.",
    category: "WESTERN_WEAR",
    categoryId: "cat-western",
    fabricStyle: "Ponte fabric, structured tailoring",
    occasionTags: ["Office", "Formal", "Conference", "Date night"],
    colours: ["Navy Blue", "Gold"],
    rentalPriceMinor: BigInt(90000),
    depositMinor: BigInt(300000),
    rentalPriceUnit: "PER_DAY",
    size: "L",
    quantity: 2,
    images: [
      {
        url: "https://images.unsplash.com/photo-1632149877166-f75d49000351?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Navy blazer dress front view with belt",
      },
      {
        url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Blazer dress styled for formal event",
      },
    ],
  },
  {
    slug: "gold-kundan-necklace",
    name: "Gold Kundan Statement Necklace Set",
    description:
      "A handcrafted Kundan necklace set featuring a graduated multi-layered design with polki stones and meenakari reverse. Includes matching jhumki earrings and maang tikka. Presented in a padded jewellery box.",
    category: "ACCESSORIES",
    categoryId: "cat-accessories",
    fabricStyle: "Gold-plated base, Kundan polki, meenakari enamel",
    occasionTags: ["Wedding", "Festival", "Bridal"],
    colours: ["Gold", "Red"],
    rentalPriceMinor: BigInt(50000),
    depositMinor: BigInt(200000),
    rentalPriceUnit: "PER_DAY",
    size: "Free size",
    quantity: 3,
    images: [
      {
        url: "https://images.unsplash.com/photo-1535556116002-6281ff3e9f36?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Gold Kundan statement necklace set with earrings",
      },
      {
        url: "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Kundan necklace detail showing polki stones",
      },
    ],
  },
  {
    slug: "emerald-salwar",
    name: "Emerald Green Block Print Salwar Kameez",
    description:
      "A vibrant emerald green salwar kameez with an all-over block print in contrasting gold. Straight-cut kameez features a keyhole neck with tie-up detail. Comes with a printed dupatta in coordinating tones.",
    category: "ETHNIC_WEAR",
    categoryId: "cat-ethnic",
    fabricStyle: "Cotton silk, block print",
    occasionTags: ["Eid", "Casual outing", "Festival"],
    colours: ["Emerald Green", "Gold"],
    rentalPriceMinor: BigInt(45000),
    depositMinor: BigInt(150000),
    rentalPriceUnit: "PER_DAY",
    size: "L",
    quantity: 4,
    images: [
      {
        url: "https://plus.unsplash.com/premium_photo-1682092632793-c7d75b23718e?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Emerald green block-print salwar kameez",
      },
      {
        url: "https://images.unsplash.com/photo-1733937140732-2cc70a1d7017?w=800&h=1000&fit=crop&auto=format&q=85",
        alt: "Block print detail on emerald salwar kameez",
      },
    ],
  },
];

// ── Seed logic ────────────────────────────────────────────────────────────────

const db = new PrismaClient();

async function ensureBoutiqueApproved(boutiqueId: string): Promise<void> {
  const boutique = await db.boutique.findUniqueOrThrow({ where: { id: boutiqueId } });
  if (boutique.status !== "APPROVED") {
    await db.boutique.update({
      where: { id: boutiqueId },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
    process.stdout.write(`  Boutique "${boutique.name}" -> APPROVED\n`);
  } else {
    process.stdout.write(`  Boutique "${boutique.name}" is already APPROVED\n`);
  }
}

async function seedProduct(boutiqueId: string, product: SeedProduct): Promise<"created" | "skipped"> {
  process.stdout.write(`\n-> "${product.name}"\n`);

  // 1. Check if product already exists
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
    process.stdout.write(`   No images yet — will upload\n`);
  } else {
    // 2. Create the product
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

  // 3. Upload images to Cloudinary and save to DB
  const imageRecords: { publicId: string; secureUrl: string; alt: string; position: number }[] = [];

  for (let i = 0; i < product.images.length; i++) {
    const { url, alt } = product.images[i];
    const publicId = `rentique/seed/${product.slug}-${i + 1}`;

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
  } else {
    process.stdout.write(`   WARNING: No images were uploaded for this product\n`);
  }

  return existing ? "skipped" : "created";
}

async function main() {
  process.stdout.write("Rentique seed — development database only\n");
  process.stdout.write("==========================================\n\n");

  const boutique = await db.boutique.findFirst({ orderBy: { createdAt: "asc" } });
  if (!boutique) {
    process.stderr.write(
      "No boutique found. Register a boutique owner and submit a boutique first.\n"
    );
    process.exitCode = 1;
    return;
  }

  await ensureBoutiqueApproved(boutique.id);

  let created = 0, skipped = 0, failed = 0;

  for (const product of PRODUCTS) {
    try {
      const result = await seedProduct(boutique.id, product);
      if (result === "created") created++;
      else skipped++;
    } catch (err) {
      process.stderr.write(`   FAILED "${product.name}": ${(err as Error).message}\n`);
      failed++;
    }
  }

  process.stdout.write("\n==========================================\n");
  process.stdout.write(`Seed complete: ${created} created, ${skipped} skipped, ${failed} failed\n`);

  const totalProducts = await db.product.count({ where: { boutiqueId: boutique.id } });
  const totalImages   = await db.productImage.count();
  process.stdout.write(`Database: ${totalProducts} product(s), ${totalImages} image(s)\n`);
}

main()
  .catch((err) => {
    process.stderr.write(`Seed error: ${(err as Error).message}\n`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
