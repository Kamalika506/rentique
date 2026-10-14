import { createHash, randomUUID } from "node:crypto";
import { endpoint, ownedBoutique, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { imageTypes, MAX_IMAGES, MAX_IMAGE_BYTES } from "@/features/boutiques/inventory/schema";

export const POST = endpoint(async request => {
  const { boutique } = await ownedBoutique();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new ApiError(503, "Image uploads are not configured.");
  const length = Number(request.headers.get("content-length"));
  if (length > MAX_IMAGES * MAX_IMAGE_BYTES + 65536) throw new ApiError(413, "Upload is too large.");
  const body = await request.formData(), files = body.getAll("files");
  const productId = body.get("productId");
  if (productId && (typeof productId !== "string" || !await prisma.product.findFirst({ where: { id: productId, boutiqueId: boutique.id } }))) throw new ApiError(404, "Product unavailable.");
  if (!files.length || files.length > MAX_IMAGES || files.some(file => !(file instanceof File) || !imageTypes.includes(file.type) || !file.size || file.size > MAX_IMAGE_BYTES)) throw new ApiError(400, "Use up to six JPG, PNG or WebP images, each under 5 MB.");
  const images = [];
  for (const file of files as File[]) {
    const publicId = `rentique/${boutique.id}/${randomUUID()}`, timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1").update(`overwrite=false&public_id=${publicId}&timestamp=${timestamp}${secret}`).digest("hex");
    const upload = new FormData();
    upload.set("file", file); upload.set("public_id", publicId); upload.set("timestamp", String(timestamp)); upload.set("overwrite", "false"); upload.set("api_key", key); upload.set("signature", signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, { method: "POST", body: upload, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new ApiError(503, "Image upload failed. Please retry.");
    const asset = await response.json();
    if (asset.public_id !== publicId || !asset.secure_url?.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)) throw new ApiError(503, "Uploaded image could not be verified.");
    images.push({ id: publicId, source: "cloudinary", publicId, url: asset.secure_url, secureUrl: asset.secure_url, alt: file.name.slice(0, 160) });
  }
  return images;
}, 201);
