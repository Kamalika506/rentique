import { z } from "zod";
import { productImageSchema, type ProductImage } from "./schema";
import { ProductServiceError, type ProductUploadOptions } from "./service";
import { validateImageFiles } from "./image-upload";

/** Implement both callbacks with authenticated, approved-boutique backend contracts. No URLs are assumed. */
export interface CloudinaryUploadBackend {
  authorize(request: { productId?: string; file: { name: string; type: string; size: number } }, signal?: AbortSignal): Promise<unknown>;
  finalize(request: { intentId: string; response: unknown }, signal?: AbortSignal): Promise<unknown>;
}
const authorizationSchema = z.object({
  intentId: z.string().min(1), cloudName: z.string().regex(/^[a-zA-Z0-9_-]+$/), apiKey: z.string().min(1), signature: z.string().regex(/^[a-f0-9]{40}$|^[a-f0-9]{64}$/i), expiresAt: z.number().int().positive(),
  parameters: z.object({ timestamp: z.number().int().positive(), public_id: z.string().min(1), overwrite: z.literal("false"), upload_preset: z.string().min(1) }).strict(),
}).strict();
/** A signature alone does not verify asset ownership: finalize must validate the asset on the backend. */
export function createSignedCloudinaryUploader(backend: CloudinaryUploadBackend) {
  return async (files: File[], options?: ProductUploadOptions): Promise<ProductImage[]> => {
    validateImageFiles(files);
    const ensureActive = () => { if (options?.signal?.aborted) throw new ProductServiceError("UNAVAILABLE", "Image upload was cancelled."); };
    ensureActive();
    const images: ProductImage[] = [];
    for (const file of files) {
      const authorization = authorizationSchema.parse(await backend.authorize({ productId: options?.productId, file: { name: file.name, type: file.type, size: file.size } }, options?.signal));
      if (authorization.expiresAt <= Date.now() || options?.signal?.aborted) throw new ProductServiceError("FORBIDDEN", "Upload authorization expired or was cancelled. Please retry.");
      const response = await new Promise<unknown>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const abort = () => xhr.abort();
        const cleanup = () => options?.signal?.removeEventListener("abort", abort);
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${authorization.cloudName}/image/upload`);
        xhr.timeout = 120000;
        xhr.upload.onprogress = (event) => { if (event.lengthComputable) options?.onProgress?.(event.loaded, event.total); };
        const fail = () => { cleanup(); reject(new ProductServiceError("UNAVAILABLE", "Image upload failed or timed out. Please retry.")); };
        xhr.onerror = fail; xhr.ontimeout = fail; xhr.onabort = fail;
        xhr.onload = () => { cleanup(); if (xhr.status < 200 || xhr.status >= 300) { fail(); return; } try { resolve(JSON.parse(xhr.responseText)); } catch { fail(); } };
        const body = new FormData(); body.append("file", file); body.append("api_key", authorization.apiKey); body.append("signature", authorization.signature);
        for (const [key, value] of Object.entries(authorization.parameters)) body.append(key, String(value));
        options?.signal?.addEventListener("abort", abort, { once: true }); xhr.send(body);
      });
      // Untrusted Cloudinary client response is never accepted directly into the product draft.
      ensureActive();
      const verified = productImageSchema.parse(await backend.finalize({ intentId: authorization.intentId, response }, options?.signal));
      ensureActive();
      if (verified.source !== "cloudinary" || verified.publicId !== authorization.parameters.public_id || !new URL(verified.secureUrl).pathname.startsWith(`/${authorization.cloudName}/image/upload/`)) throw new ProductServiceError("FORBIDDEN", "The uploaded image could not be verified for this product.");
      images.push(verified);
    }
    return images;
  };
}
