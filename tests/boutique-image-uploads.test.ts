import assert from "node:assert/strict";
import { test } from "node:test";
import { createSignedCloudinaryUploader } from "../src/features/boutiques/inventory/cloudinary-upload";
import { productImageSchema } from "../src/features/boutiques/inventory/schema";
import { reorderImages } from "../src/features/boutiques/inventory/image-upload";
import { createDemoProductService, demoProducts } from "../src/features/boutiques/adapters/mock/products";

const asset = { source: "cloudinary" as const, id: "verified-asset", publicId: "boutiques/scoped/image-1", secureUrl: "https://res.cloudinary.com/rentique/image/upload/v123/boutiques/scoped/image-1.png", url: "https://res.cloudinary.com/rentique/image/upload/v123/boutiques/scoped/image-1.png", alt: "Ivory" };
const signed = () => ({ intentId: "intent-1", cloudName: "rentique", apiKey: "public-key", signature: "a".repeat(40), expiresAt: Date.now() + 60000, parameters: { timestamp: Math.floor(Date.now() / 1000), public_id: asset.publicId, overwrite: "false" as const, upload_preset: "restricted-signed-preset" } });
const file = () => new File(["image"], "image.png", { type: "image/png" });
test("Cloudinary records require public IDs, HTTPS delivery URLs and matching preview URLs", () => {
  assert.equal(productImageSchema.safeParse(asset).success, true);
  for (const invalid of [{ ...asset, publicId: "" }, { ...asset, secureUrl: "not a URL" }, { ...asset, secureUrl: "http://res.cloudinary.com/rentique/image/upload/x" }, { ...asset, url: "https://example.com/x" }, { ...asset, source: "demo" }]) assert.equal(productImageSchema.safeParse(invalid).success, false);
  assert.equal(productImageSchema.safeParse({ source: "demo", id: "local", url: "data:image/png;base64,aW1hZ2U=", alt: "" }).success, true);
});
test("image reordering is immutable and Cloudinary metadata survives product saves", async () => {
  const ids = ["cover", "second", "third"];
  assert.deepEqual(reorderImages(ids, 2, -1), ["cover", "third", "second"]);
  assert.deepEqual(ids, ["cover", "second", "third"]);
  assert.deepEqual(reorderImages(ids, 0, -1), ids);
  const service = createDemoProductService({ delayMs: 0 });
  const product = await service.createProduct({ ...demoProducts[0], images: [asset] });
  assert.deepEqual((await service.getProduct(product.id)).images, [asset]);
});
test("upload validation and authorization denial happen before any transport or finalization", async () => {
  let calls = 0;
  const upload = createSignedCloudinaryUploader({ authorize: async () => { calls++; throw new Error("Unauthenticated"); }, finalize: async () => { throw new Error("Must not finalize"); } });
  await assert.rejects(upload([new File(["svg"], "bad.svg", { type: "image/svg+xml" })])); assert.equal(calls, 0);
  await assert.rejects(upload([file()]), /Unauthenticated/); assert.equal(calls, 1);
  await assert.rejects(createSignedCloudinaryUploader({ authorize: async () => ({ ...signed(), expiresAt: 1 }), finalize: async () => asset })([file()]));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(upload([file()], { signal: controller.signal }), /cancelled/); assert.equal(calls, 1);
});
test("signed transport uses fixed Cloudinary endpoint and accepts only backend-verified assets", async () => {
  const original = globalThis.XMLHttpRequest;
  let sent = 0; let finalized = 0; let progress = 0;
  class FakeXHR {
    upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
    status = 200; responseText = JSON.stringify({ public_id: asset.publicId, secure_url: asset.secureUrl, signature: "cloud-response" });
    onload?: () => void; onabort?: () => void; timeout = 0;
    open(method: string, url: string) { assert.equal(method, "POST"); assert.equal(url, "https://api.cloudinary.com/v1_1/rentique/image/upload"); }
    abort() { this.onabort?.(); }
    send(body: FormData) { sent++; assert.equal(body.get("overwrite"), "false"); assert.equal(body.get("api_secret"), null); assert.equal(body.get("signature"), "a".repeat(40)); this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 5 }); this.onload?.(); }
  }
  globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
  try {
    const upload = createSignedCloudinaryUploader({ authorize: async (request) => { assert.equal(request.productId, "PR-101"); return signed(); }, finalize: async ({ intentId, response }) => { finalized++; assert.equal(intentId, "intent-1"); assert.ok(response); return asset; } });
    assert.deepEqual(await upload([file()], { productId: "PR-101", onProgress: (loaded) => { progress = loaded; } }), [asset]); assert.equal(sent, 1); assert.equal(finalized, 1); assert.equal(progress, 5);
    await assert.rejects(createSignedCloudinaryUploader({ authorize: async () => signed(), finalize: async () => ({ ...asset, publicId: "another-product" }) })([file()]));
    await assert.rejects(createSignedCloudinaryUploader({ authorize: async () => signed(), finalize: async () => { throw new Error("Asset ownership rejected"); } })([file()]), /Asset ownership rejected/);
    await assert.rejects(createSignedCloudinaryUploader({ authorize: async () => ({ ...signed(), api_secret: "unexpected" }), finalize: async () => asset })([file()]));
    const controller = new AbortController();
    await assert.rejects(createSignedCloudinaryUploader({ authorize: async () => signed(), finalize: async () => { controller.abort(); return asset; } })([file()], { signal: controller.signal }), /cancelled/);
  } finally { globalThis.XMLHttpRequest = original; }
});
