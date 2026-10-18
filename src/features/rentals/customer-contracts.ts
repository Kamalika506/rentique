import { z } from "zod";

export const selectionSchema = z.object({
  items: z.array(z.object({ variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(10) }).strict()).min(1).max(10),
  pickupAt: z.string().datetime({ offset: true }),
  returnAt: z.string().datetime({ offset: true }),
}).strict().refine(input => new Set(input.items.map(item => item.variantId)).size === input.items.length, "Each size can appear only once.");

export const reviewedQuoteSchema = selectionSchema.safeExtend({
  boutiqueId: z.string(), rentalMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  fingerprint: z.string(), policy: z.string(), openingHours: z.string(),
});
export type ReviewedQuote = z.infer<typeof reviewedQuoteSchema>;

export function validContactPhone(phone: string | null) {
  if (!phone || !/^\+?[\d ()-]{7,32}$/.test(phone)) return false;
  const length = phone.replace(/\D/g, "").length;
  return length >= 7 && length <= 15;
}

export function validateReturnItems(items: { id: string; quantity: number; returnedQuantity: number }[], returns: { itemId: string; quantity: number }[]) {
  if (!returns.length || new Set(returns.map(item => item.itemId)).size !== returns.length) throw new Error("Select each returned item only once.");
  for (const returned of returns) {
    const item = items.find(item => item.id === returned.itemId);
    if (!item || !Number.isInteger(returned.quantity) || returned.quantity < 1 || returned.quantity > item.quantity - item.returnedQuantity) throw new Error("Return quantity exceeds the outstanding quantity.");
  }
}
