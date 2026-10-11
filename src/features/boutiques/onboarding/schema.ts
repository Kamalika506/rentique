import { z } from "zod";

export const boutiqueCategories = ["Bridal", "Ethnic wear", "Occasion wear", "Western wear", "Accessories"] as const;

const requiredText = (label: string, max = 120) => z.string().trim().min(2, `${label} must contain at least 2 characters.`).max(max, `Use no more than ${max} characters.`);

export const boutiqueRegistrationSchema = z.object({
  name: requiredText("Boutique name"),
  description: z.string().trim().min(20, "Tell us about your boutique in at least 20 characters.").max(1000, "Use no more than 1,000 characters."),
  contactEmail: z.string().trim().email("Enter a valid contact email."),
  phone: z.string().trim().regex(/^\+?[\d\s()-]+$/, "Enter a valid phone number.").refine((value) => { const digits = value.replace(/\D/g, ""); return digits.length >= 10 && digits.length <= 15; }, "Use a phone number with 10 to 15 digits."),
  address: requiredText("Address", 300),
  city: requiredText("City"),
  state: requiredText("State"),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/, "Enter a postal code between 3 and 12 characters."),
  categories: z.array(z.enum(boutiqueCategories)).min(1, "Select at least one category."),
  socialLink: z.string().trim().max(300, "Use no more than 300 characters.").refine((value) => { if (!value) return true; try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; } }, "Enter a full http or https link, or leave this blank."),
});

export type BoutiqueRegistration = z.infer<typeof boutiqueRegistrationSchema>;
