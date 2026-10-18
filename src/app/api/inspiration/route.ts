import sharp from "sharp";
import { endpoint, currentUser, ApiError } from "@/lib/api";
import { rateAllowed } from "@/lib/rate-limit";
import { imageMime, interpretInspiration } from "@/features/recommendations/inspiration";

export const POST = endpoint(async request => {
  const user = await currentUser("CUSTOMER");
  if (!await rateAllowed("inspiration", user.id, 5, 3600000)) throw new ApiError(429, "Image styling is limited to five requests per hour.");
  const apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new ApiError(503, "Image styling is not configured. You can still choose your preferences manually.");
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;")) throw new ApiError(415, "Upload a JPEG, PNG, or WebP image.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Choose an image.");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > 6 * 1024 * 1024) { await reader.cancel(); throw new ApiError(413, "Upload an image under 5 MB."); }
    chunks.push(value);
  }
  const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": contentType } }).formData();
  if (form.get("consent") !== "true") throw new ApiError(400, "Confirm permission to process this image.");
  const file = form.get("image");
  if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) throw new ApiError(400, "Choose an image under 5 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!imageMime(bytes)) throw new ApiError(415, "Only real JPEG, PNG, and WebP images are supported.");
  let normalized: Buffer;
  try {
    normalized = await sharp(bytes, { limitInputPixels: 25000000, animated: false }).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg().toBuffer();
  } catch { throw new ApiError(400, "This image could not be decoded. Choose a valid image below 25 megapixels."); }
  try {
    const attributes = await interpretInspiration({ imageBase64: normalized.toString("base64"), apiKey, model, signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    return { attributes, message: "Review these suggestions before applying them. Your image was processed in memory and was not stored by Rentique." };
  } catch { throw new ApiError(503, "Image styling could not interpret this image. Try another image or choose preferences manually."); }
});
