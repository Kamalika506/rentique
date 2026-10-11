import assert from "node:assert/strict";
import { test } from "node:test";
import { productFormSchema, type ProductFormValues } from "../src/features/boutiques/inventory/schema";
import { createDemoProductService, demoProducts, validateImageFiles } from "../src/features/boutiques/adapters/mock/products";
import { ProductServiceError, productStockStatus, formatINR } from "../src/features/boutiques/inventory/service";

const form: ProductFormValues = { name: " Ivory saree ", description: "A carefully curated ivory silk saree for special occasions.", category: "Ethnic wear", occasionTags: "Wedding, Wedding, Reception", colours: "Ivory, Gold", size: "Free size", fabricStyle: "Silk / classic", rentalPriceMinor: "3200.50", depositMinor: "0", quantity: "0", images: [] };
test("product validation converts INR precisely and rejects invalid stock, prices, tags and images", () => {
  const input = productFormSchema.parse(form);
  assert.equal(input.rentalPriceMinor, 320050); assert.equal(input.quantity, 0); assert.equal(input.name, "Ivory saree"); assert.deepEqual(input.occasionTags, ["Wedding", "Reception"]);
  for (const invalid of [{ ...form, rentalPriceMinor: "1.234" }, { ...form, rentalPriceMinor: "0" }, { ...form, depositMinor: "-1" }, { ...form, quantity: "1.5" }, { ...form, quantity: "10001" }, { ...form, colours: " " }, { ...form, category: "Invalid" }, { ...form, description: "short" }, { ...form, images: [{ id: "x", url: "javascript:alert(1)", alt: "x" }] }]) assert.equal(productFormSchema.safeParse(invalid).success, false);
  assert.equal(formatINR(input.rentalPriceMinor), "₹3,200.50");
  assert.equal(productFormSchema.safeParse({ ...form, size: "M" }).success, true);
});
test("create, edit, archive and unarchive persist only within one demo service", async () => {
  const service = createDemoProductService({ delayMs: 0, initialProducts: [] });
  const created = await service.createProduct(productFormSchema.parse(form)); assert.equal(created.boutiqueId, service.boutique.id);
  const edited = await service.updateProduct(created.id, { ...created, quantity: 3 }, created.version); assert.equal(productStockStatus(edited), "In stock");
  const archived = await service.setArchived(edited.id, true, edited.version); assert.equal(productStockStatus(archived), "Archived");
  const restored = await service.setArchived(archived.id, false, archived.version); assert.equal(restored.quantity, 3); assert.equal(productStockStatus(restored), "In stock");
  const copy = await service.getProduct(restored.id); copy.name = "Changed copy"; assert.notEqual((await service.getProduct(restored.id)).name, "Changed copy");
  assert.equal((await createDemoProductService({ delayMs: 0, initialProducts: [] }).listProducts()).length, 0);
});
test("foreign and missing products cannot be read, edited or archived", async () => {
  const foreign = { ...demoProducts[0], boutiqueId: "another-boutique" };
  const service = createDemoProductService({ delayMs: 0, initialProducts: [foreign] });
  assert.deepEqual(await service.listProducts(), []);
  for (const id of [foreign.id, "missing"]) {
    await assert.rejects(service.getProduct(id), ProductServiceError);
    await assert.rejects(service.updateProduct(id, productFormSchema.parse(form), 1), ProductServiceError);
    await assert.rejects(service.setArchived(id, true, 1), ProductServiceError);
  }
});
test("stale updates cannot overwrite newer edits or archived state", async () => {
  const service = createDemoProductService({ delayMs: 0 }); const original = await service.getProduct("PR-101");
  await service.updateProduct(original.id, { ...original, quantity: 5 }, original.version);
  await assert.rejects(service.setArchived(original.id, true, original.version), (error: unknown) => error instanceof ProductServiceError && error.code === "CONFLICT");
  assert.equal((await service.getProduct(original.id)).quantity, 5);
});
test("file validation rejects SVG, oversized images and too many files", () => {
  assert.throws(() => validateImageFiles([new File(["svg"], "x.svg", { type: "image/svg+xml" })]));
  assert.throws(() => validateImageFiles([new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" })]));
  assert.throws(() => validateImageFiles(Array.from({ length: 7 }, () => new File(["png"], "x.png", { type: "image/png" }))));
  assert.doesNotThrow(() => validateImageFiles([new File(["png"], "x.png", { type: "image/png" })]));
});
