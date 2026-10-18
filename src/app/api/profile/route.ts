import { endpoint, currentUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const GET = endpoint(async () => {
  const user = await currentUser();
  return { name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", role: user.role, emailVerified: Boolean(user.emailVerified) };
});
export const PATCH = endpoint(async request => {
  const user = await currentUser();
  const input = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(32) }).parse(await request.json());
  const updated = await prisma.user.update({ where: { id: user.id }, data: input });
  return { name: updated.name ?? "", email: updated.email ?? "", phone: updated.phone ?? "", role: updated.role, emailVerified: Boolean(updated.emailVerified) };
});
