import { z } from "zod";
export const passwordSchema = z.string().min(8).refine(value => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes.");
