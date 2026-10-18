import { z } from "zod";
import { boutiqueCategories } from "../onboarding/schema";

export const productCategories = boutiqueCategories;
const categoryInput = z.union([z.enum(productCategories), z.string().regex(/^(c[a-z0-9]{20,30}|cat-[a-z0-9-]+)$/, "Choose a category from the platform catalog.")]);
export const MAX_IMAGES = 6;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const cloudinaryUrl = z.string().url().refine((value) => { try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password; } catch { return false; } }, "Use a secure Cloudinary delivery URL.");
const imageBase = { id: z.string().min(1), alt: z.string().max(160) };
export const productImageSchema = z.discriminatedUnion("source", [
  z.object({ ...imageBase, source: z.literal("demo"), url: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/) }),
  z.object({ ...imageBase, source: z.literal("cloudinary"), url: cloudinaryUrl, secureUrl: cloudinaryUrl, publicId: z.string().min(1).max(255) }).refine((image) => image.url === image.secureUrl, "Preview and secure delivery URLs must match."),
]);
const text = (label: string, max = 120) => z.string().trim().min(2, `${label} must have at least 2 characters.`).max(max, `Use no more than ${max} characters.`);
const tokens = (required: boolean) => z.string().max(300).transform((value) => [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))]).pipe(z.array(z.string().max(40, "Each tag must be at most 40 characters.")).min(required ? 1 : 0, "Enter at least one colour.").max(10, "Use no more than 10 tags."));
const price = (positive: boolean) => z.string().trim().regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a valid INR amount with up to 2 decimal places.").transform((value) => Math.round(Number(value) * 100)).pipe(z.number().int().min(positive ? 1 : 0, "Rental price must be greater than zero.").max(100000000, "Amount cannot exceed ₹10,00,000."));
export const productFormSchema = z.object({
  garmentType: z.enum(["other", "saree", "lehenga", "gown", "suit", "dress", "jewellery", "accessory"]).optional(),
  includedPieces: tokens(false).optional(), measurements: z.string().trim().max(1000).optional(),
  name: text("Product name"), description: text("Description", 2000).refine((value) => value.length >= 20, "Use at least 20 characters."),
  category: categoryInput, rentalPriceUnit: z.enum(["PER_DAY", "PER_RENTAL"]).optional(), occasionTags: tokens(false), colours: tokens(true), size: z.string().trim().min(1, "Enter a size.").max(80), fabricStyle: text("Fabric / style", 200),
  rentalPriceMinor: price(true), depositMinor: price(false), quantity: z.string().trim().regex(/^\d{1,5}$/, "Enter a whole stock quantity from 0 to 10,000.").transform(Number).pipe(z.number().int().min(0).max(10000)),
  images: z.array(productImageSchema).max(MAX_IMAGES, "Use no more than 6 images."),
});
export type ProductFormValues = z.input<typeof productFormSchema>;
export type ProductInput = z.output<typeof productFormSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
/** Validate adapter payloads independently of string-based form values. */
export const productInputSchema = z.object({
  garmentType: z.enum(["other", "saree", "lehenga", "gown", "suit", "dress", "jewellery", "accessory"]).optional(),
  includedPieces: z.array(z.string().trim().min(1).max(40)).max(10).optional(), measurements: z.string().trim().max(1000).optional(),
  name: text("Product name"), description: text("Description", 2000).min(20), category: categoryInput, rentalPriceUnit: z.enum(["PER_DAY", "PER_RENTAL"]).optional(),
  occasionTags: z.array(z.string().trim().min(1).max(40)).max(10), colours: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
  size: z.string().trim().min(1).max(80), fabricStyle: text("Fabric / style", 200), rentalPriceMinor: z.number().int().min(1).max(100000000), depositMinor: z.number().int().min(0).max(100000000), quantity: z.number().int().min(0).max(10000), images: z.array(productImageSchema).max(MAX_IMAGES),
});
