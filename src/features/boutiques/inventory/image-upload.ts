import { imageTypes, MAX_IMAGES, MAX_IMAGE_BYTES } from "./schema";
import { ProductServiceError } from "./service";
export function validateImageFiles(files: File[]) {
  if (!files.length || files.length > MAX_IMAGES) throw new ProductServiceError("VALIDATION", "Choose between 1 and 6 images.");
  for (const file of files) if (!imageTypes.includes(file.type) || file.size > MAX_IMAGE_BYTES || file.size === 0) throw new ProductServiceError("VALIDATION", "Use non-empty JPG, PNG or WebP images, each up to 5 MB.");
}
export function reorderImages<T>(images: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (index < 0 || index >= images.length || next < 0 || next >= images.length) return [...images];
  const result = [...images]; [result[index], result[next]] = [result[next], result[index]]; return result;
}
