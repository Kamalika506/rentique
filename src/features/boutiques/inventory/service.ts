import type { ProductImage, ProductInput } from "./schema";
export interface BoutiqueProduct extends ProductInput { id: string; boutiqueId: string; archived: boolean; version: number; updatedAt: string; categoryId?: string | null; variants?: { id: string; size: string; quantity: number; rentalPriceMinor: number; depositMinor: number }[] }
export interface BoutiqueProductService {
  readonly mode: "demo" | "live";
  readonly boutique: { id: string; name: string };
  listProducts(): Promise<BoutiqueProduct[]>;
  getProduct(id: string): Promise<BoutiqueProduct>;
  createProduct(input: ProductInput): Promise<BoutiqueProduct>;
  updateProduct(id: string, input: ProductInput, version: number): Promise<BoutiqueProduct>;
  setArchived(id: string, archived: boolean, version: number): Promise<BoutiqueProduct>;
  uploadImages(files: File[], options?: ProductUploadOptions): Promise<ProductImage[]>;
}
export interface ProductUploadOptions { productId?: string; signal?: AbortSignal; onProgress?: (loaded: number, total: number) => void }
export class ProductServiceError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "UNAVAILABLE" | "VALIDATION", message: string) { super(message); this.name = "ProductServiceError"; }
}
export function productStockStatus(product: Pick<BoutiqueProduct, "archived" | "quantity">) { return product.archived ? "Archived" : product.quantity === 0 ? "Out of stock" : "In stock"; }
export const formatINR = (minor: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(minor / 100);
export function toFormValues(product: ProductInput & { categoryId?: string | null }) { return { ...product, category: product.categoryId ?? product.category, occasionTags: product.occasionTags.join(", "), colours: product.colours.join(", "), rentalPriceMinor: (product.rentalPriceMinor / 100).toFixed(2), depositMinor: (product.depositMinor / 100).toFixed(2), quantity: String(product.quantity) }; }
