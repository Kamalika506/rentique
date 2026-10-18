import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { boutiqueRegistrationSchema } from "../onboarding/schema";

export const boutiqueSettingsSchema = boutiqueRegistrationSchema.omit({ categories: true }).extend({
  openingHours: z.string().trim().max(1000).optional(),
  rentalPolicy: z.string().trim().max(3000).optional(),
  version: z.number().int().positive(),
  timezone: z.string().trim().max(64).refine((value) => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return Boolean(value); } catch { return false; }
  }, "Enter a valid timezone, such as Asia/Kolkata."),
}).strict();

export const storefrontQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  city: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
});

export type BoutiqueSettingsInput = z.infer<typeof boutiqueSettingsSchema>;
export type BoutiqueSettings = BoutiqueSettingsInput & { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; updatedAt: string };
export interface PublicBoutique {
  id: string; name: string; description: string; contactEmail: string; phone: string;
  address: string; city: string; state: string; postalCode: string; categories: string[];
  socialLink: string | null; timezone: string; productCount: number; openingHours?: string; rentalPolicy?: string;
}

// Explicit projection keeps owner accounts and application-review details private.
export const publicBoutiqueSelect = {
  id: true, name: true, description: true, contactEmail: true, phone: true, address: true,
  city: true, state: true, postalCode: true, categories: true, socialLink: true, timezone: true,
  _count: { select: { products: { where: { archived: false, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }] } } } },
  openingHours: true, rentalPolicy: true,
} satisfies Prisma.BoutiqueSelect;
export const boutiqueSettingsSelect = {
  id: true, name: true, description: true, contactEmail: true, phone: true, address: true,
  city: true, state: true, postalCode: true, socialLink: true, timezone: true, version: true,
  status: true, updatedAt: true,
  openingHours: true, rentalPolicy: true,
} satisfies Prisma.BoutiqueSelect;
