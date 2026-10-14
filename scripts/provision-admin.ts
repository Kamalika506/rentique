import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { hash } from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const email = z.string().trim().email().transform(value => value.toLowerCase()).parse(process.env.ADMIN_EMAIL);
  const db = new PrismaClient();
  const credentialPath = resolve(".tmp/admin-credentials.txt");
  let credentialsCreated = false;
  try {
    const existing = await db.user.findUnique({ where: { email }, include: { boutique: { select: { id: true } } } });
    if (existing?.boutique || existing?.role === "BOUTIQUE_OWNER") throw new Error("Use a separate administrator account from the boutique owner account.");
    if (existing && !existing.isActive) throw new Error("Activate the account through a trusted administrator before provisioning it.");
    if (!existing && !process.argv.includes("--create")) throw new Error("Register the administrator email first, or run with --create to generate a local initial password.");
    const password = existing ? null : randomBytes(24).toString("base64url");
    const passwordHash = password ? await hash(password, 12) : null;
    if (password) {
      mkdirSync(resolve(".tmp"), { recursive: true });
      // Never overwrite credentials or print the generated password in a terminal.
      writeFileSync(credentialPath, `Email: ${email}\nPassword: ${password}\nLogin: /login?intent=admin\nChange this password after signing in at /change-password.\n`, { flag: "wx", mode: 0o600 });
      credentialsCreated = true;
    }
    await db.$transaction(async tx => {
      const admin = existing
        ? await tx.user.update({ where: { id: existing.id }, data: { role: "ADMIN", sessionVersion: { increment: 1 } } })
        : await tx.user.create({ data: { email, name: "Rentique administrator", role: "ADMIN", isActive: true, passwordHash } });
      if (existing) await tx.session.deleteMany({ where: { userId: admin.id } });
      await tx.auditLog.create({ data: { actorId: admin.id, action: "ADMIN_PROVISIONED", entityType: "User", entityId: admin.id, details: { method: "trusted-local-script" } } });
    });
    process.stdout.write(existing ? "Administrator role provisioned. Sign in with the account's existing credentials.\n" : "Administrator created. Initial credentials are in ignored .tmp/admin-credentials.txt. Change the password after signing in.\n");
  } catch (error) {
    if (credentialsCreated) unlinkSync(credentialPath);
    // Provider and database errors can contain connection credentials.
    const safe = error instanceof Error && ["Use a separate administrator account", "Activate the account through", "Register the administrator email"].some(prefix => error.message.startsWith(prefix));
    process.stderr.write(safe ? `${(error as Error).message}\n` : "Administrator provisioning failed. Verify configuration and database access; existing local credentials are never overwritten.\n");
    process.exitCode = 1;
  } finally { await db.$disconnect(); }
}

main().catch(() => { process.stderr.write("Set ADMIN_EMAIL to a valid existing email address. No secrets were printed.\n"); process.exitCode = 1; });
