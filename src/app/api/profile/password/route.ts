import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { endpoint, currentUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rateAllowed } from "@/lib/rate-limit";
import { passwordSchema } from "@/features/auth/contracts";

export const PATCH = endpoint(async request => {
  const user = await currentUser();
  const input = z.object({ currentPassword: z.string().min(1).max(128), password: passwordSchema }).strict().parse(await request.json());
  if (!await rateAllowed("change-password", user.id, 5, 15 * 60000)) throw new ApiError(429, "Too many attempts. Please try again later.");
  if (!user.passwordHash || !await compare(input.currentPassword, user.passwordHash)) throw new ApiError(400, "Current password is incorrect.");
  const passwordHash = await hash(input.password, 12);
  await prisma.$transaction(async tx => {
    const changed = await tx.user.updateMany({ where: { id: user.id, passwordHash: user.passwordHash, sessionVersion: user.sessionVersion, isActive: true }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "Your account changed. Sign in again and retry.");
    await tx.authToken.deleteMany({ where: { userId: user.id, type: "PASSWORD_RESET" } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id } });
  });
  return { message: "Password changed. Sign in again with your new password." };
});
