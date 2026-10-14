import { randomBytes, createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { rateAllowed } from "@/lib/rate-limit";
import { applicationUrl, sendMail, smtpConfigured } from "@/lib/mail";
import type { AuthTokenType } from "@/generated/prisma/client";

import { passwordSchema } from "./contracts";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function createRecoveryToken(userId: string, type: AuthTokenType) {
  const token = randomBytes(32).toString("hex");
  await prisma.$transaction([prisma.authToken.deleteMany({ where: { userId, type } }), prisma.authToken.create({ data: { userId, type, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + (type === "PASSWORD_RESET" ? 30 * 60000 : 24 * 3600000)) } })]);
  return token;
}
export function mailConfigured() { return smtpConfigured() && applicationUrl() !== null; }
export async function deliverRecovery(userId: string, email: string, type: AuthTokenType) {
  if (!mailConfigured()) throw new ApiError(503, "Email delivery is not configured. Please contact support.");
  const base = applicationUrl()!;
  const token = await createRecoveryToken(userId, type), reset = type === "PASSWORD_RESET";
  const url = new URL(reset ? "/reset-password" : "/verify-email", base); url.searchParams.set("token", token);
  try { await sendMail({ to: email, subject: reset ? "Reset your Rentique password" : "Verify your Rentique email", text: `${reset ? "Reset your password" : "Verify your email"}: ${url.toString()}\nIf you did not request this, ignore this email.` }); }
  catch { await prisma.authToken.deleteMany({ where: { tokenHash: tokenHash(token) } }); throw new ApiError(503, "Email could not be sent. Please try again later."); }
}
export async function requestRecovery(request: Request, type: AuthTokenType) {
  const { email } = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()) }).parse(await request.json());
  if (!await rateAllowed(type, email, 3, 15 * 60000)) throw new ApiError(429, "Too many requests. Please try again later.");
  if (!mailConfigured()) throw new ApiError(503, "Email delivery is not configured. Please contact support.");
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.isActive && (type !== "EMAIL_VERIFICATION" || !user.emailVerified) && (type !== "PASSWORD_RESET" || user.passwordHash)) await deliverRecovery(user.id, email, type);
  return { message: "If the account is eligible, an email has been sent. Check your inbox." };
}
export async function consumeRecovery(request: Request, type: AuthTokenType) {
  const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema.optional() }).parse(await request.json());
  if (type === "PASSWORD_RESET" && !input.password) throw new ApiError(400, "Enter a new password.");
  const candidate = await prisma.authToken.findUnique({ where: { tokenHash: tokenHash(input.token) }, select: { type: true, expiresAt: true, user: { select: { isActive: true } } } });
  if (!candidate || candidate.type !== type || candidate.expiresAt <= new Date() || !candidate.user.isActive) throw new ApiError(400, "This link is invalid or expired. Request a new one.");
  const passwordHash = input.password && type === "PASSWORD_RESET" ? await hash(input.password, 12) : undefined;
  await prisma.$transaction(async tx => {
    const record = await tx.authToken.findUnique({ where: { tokenHash: tokenHash(input.token) }, include: { user: { select: { isActive: true } } } });
    if (!record || record.type !== type || record.expiresAt <= new Date() || !record.user.isActive) throw new ApiError(400, "This link is invalid or expired. Request a new one.");
    const consumed = await tx.authToken.deleteMany({ where: { id: record.id, expiresAt: { gt: new Date() } } });
    if (!consumed.count) throw new ApiError(400, "This link has already been used.");
    await tx.user.update({ where: { id: record.userId }, data: type === "PASSWORD_RESET" ? { passwordHash, sessionVersion: { increment: 1 } } : { emailVerified: new Date() } });
    if (type === "PASSWORD_RESET") await tx.authToken.deleteMany({ where: { userId: record.userId, type } });
    await tx.auditLog.create({ data: { actorId: record.userId, action: type === "PASSWORD_RESET" ? "PASSWORD_RESET" : "EMAIL_VERIFIED", entityType: "User", entityId: record.userId } });
  });
  return { message: type === "PASSWORD_RESET" ? "Password reset. Sign in with your new password." : "Your email has been verified." };
}
