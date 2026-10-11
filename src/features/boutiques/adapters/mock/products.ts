import { productInputSchema, type ProductInput, type ProductImage } from "../../inventory/schema";
import { ProductServiceError, type BoutiqueProduct, type BoutiqueProductService } from "../../inventory/service";
import { validateImageFiles } from "../../inventory/image-upload";
export { validateImageFiles } from "../../inventory/image-upload";

const base: ProductInput = { name: "Ivory embroidered lehenga", description: "An ivory occasion lehenga with delicate embroidery and a flowing silhouette.", category: "Bridal", occasionTags: ["Wedding", "Reception"], colours: ["Ivory", "Gold"], size: "M", fabricStyle: "Silk / embroidered", rentalPriceMinor: 850000, depositMinor: 500000, quantity: 2, images: [] };
export const demoProducts: BoutiqueProduct[] = [
  { ...base, id: "PR-101", boutiqueId: "demo-boutique", archived: false, version: 1, updatedAt: "2026-10-11T00:00:00Z" },
  { ...base, id: "PR-102", name: "Plum silk saree", category: "Ethnic wear", colours: ["Plum"], size: "Free size", rentalPriceMinor: 320000, depositMinor: 200000, quantity: 3, boutiqueId: "demo-boutique", archived: false, version: 1, updatedAt: "2026-10-11T00:00:00Z" },
  { ...base, id: "PR-103", name: "Champagne evening gown", category: "Occasion wear", colours: ["Champagne"], rentalPriceMinor: 480000, quantity: 0, boutiqueId: "demo-boutique", archived: false, version: 1, updatedAt: "2026-10-11T00:00:00Z" },
  { ...base, id: "PR-104", name: "Pearl occasion clutch", category: "Accessories", colours: ["Ivory"], size: "One size", rentalPriceMinor: 90000, quantity: 4, boutiqueId: "demo-boutique", archived: false, version: 1, updatedAt: "2026-10-11T00:00:00Z" },
  { ...base, id: "PR-105", name: "Rose organza saree", colours: ["Rose"], category: "Ethnic wear", rentalPriceMinor: 280000, quantity: 0, boutiqueId: "demo-boutique", archived: true, version: 1, updatedAt: "2026-10-11T00:00:00Z" },
];
export function createDemoProductService({ delayMs = 300, initialProducts = demoProducts }: { delayMs?: number; initialProducts?: BoutiqueProduct[] } = {}): BoutiqueProductService {
  const boutique = { id: "demo-boutique", name: "The Silk Atelier" };
  const records = new Map(structuredClone(initialProducts).map((product) => [product.id, product]));
  const pause = () => new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  const owned = (id: string) => { const product = records.get(id); if (!product || product.boutiqueId !== boutique.id) throw new ProductServiceError("NOT_FOUND", "This product is unavailable for this boutique."); return product; };
  const checkVersion = (product: BoutiqueProduct, version: number) => { if (product.version !== version) throw new ProductServiceError("CONFLICT", "This product has changed. Reload it before saving again."); };
  return {
    mode: "demo", boutique,
    async listProducts() { await pause(); return structuredClone([...records.values()].filter((product) => product.boutiqueId === boutique.id)); },
    async getProduct(id) { await pause(); return structuredClone(owned(id)); },
    async createProduct(input) { const parsed = productInputSchema.parse(input); await pause(); const product = { ...parsed, id: `PR-${crypto.randomUUID()}`, boutiqueId: boutique.id, archived: false, version: 1, updatedAt: new Date().toISOString() }; records.set(product.id, product); return structuredClone(product); },
    async updateProduct(id, input, version) { const parsed = productInputSchema.parse(input); await pause(); const current = owned(id); checkVersion(current, version); const product = { ...current, ...parsed, version: current.version + 1, updatedAt: new Date().toISOString() }; records.set(id, product); return structuredClone(product); },
    async setArchived(id, archived, version) { await pause(); const current = owned(id); checkVersion(current, version); const product = { ...current, archived, version: current.version + 1, updatedAt: new Date().toISOString() }; records.set(id, product); return structuredClone(product); },
    async uploadImages(files, options) {
      validateImageFiles(files); if (options?.productId) owned(options.productId);
      return Promise.all(files.map((file) => new Promise<ProductImage>((resolve, reject) => {
        if (options?.signal?.aborted) { reject(new ProductServiceError("UNAVAILABLE", "Image reading cancelled.")); return; }
        const reader = new FileReader();
        const abort = () => reader.abort();
        const cleanup = () => options?.signal?.removeEventListener("abort", abort);
        options?.signal?.addEventListener("abort", abort, { once: true });
        reader.onprogress = (event) => { if (event.lengthComputable) options?.onProgress?.(event.loaded, event.total); };
        reader.onload = () => { cleanup(); options?.onProgress?.(file.size, file.size); resolve({ source: "demo", id: crypto.randomUUID(), url: String(reader.result), alt: file.name.slice(0, 160) }); };
        reader.onerror = () => { cleanup(); reject(new ProductServiceError("UNAVAILABLE", "This image couldn't be read. Please retry or choose another file.")); };
        reader.onabort = () => { cleanup(); reject(new ProductServiceError("UNAVAILABLE", "Image reading cancelled.")); };
        reader.readAsDataURL(file);
      })));
    },
  };
}
