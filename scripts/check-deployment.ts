import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { applicationUrl, mailConfiguration } from "../src/lib/mail";

// Match Next's environment precedence without replacing deployment variables.
const mode = process.argv.includes("--local") ? "development" : process.env.NODE_ENV ?? "production";
dotenv.config({ path: [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"], quiet: true });
type Check = { name: string; passed: boolean; required: boolean; message: string };
const checks: Check[] = [];
const configured = (name: string) => {
  const value = process.env[name]?.trim();
  return Boolean(value && !/^(?:your[_ -]|replace[_ -]|change[_ -]|example|placeholder)/i.test(value));
};
const check = (name: string, passed: boolean, required: boolean, message: string) => checks.push({ name, passed, required, message });

async function main() {
  let validDatabase = false;
  try { const url = new URL(process.env.DATABASE_URL ?? ""); validDatabase = ["postgresql:", "postgres:"].includes(url.protocol) && Boolean(url.hostname && url.pathname.length > 1); } catch { /* Invalid configuration is reported below without its contents. */ }
  check("PostgreSQL configuration", validDatabase, true, "Set DATABASE_URL to a PostgreSQL database connection.");
  check("Authentication secret", configured("AUTH_SECRET") && (process.env.AUTH_SECRET?.length ?? 0) >= 32, true, "Set AUTH_SECRET to a random secret of at least 32 characters.");
  const publicUrl = process.env.AUTH_URL ?? process.env.APP_URL;
  let validPublicUrl = false;
  try { const url = new URL(publicUrl ?? ""); validPublicUrl = mode === "development" ? ["http:", "https:"].includes(url.protocol) : url.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname); } catch { /* Never include configuration values in output. */ }
  check("Public application URL", validPublicUrl, mode === "production", "Set AUTH_URL or APP_URL to the production HTTPS origin.");
  check("Cloudinary configuration", ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].every(configured), true, "Set the Cloudinary cloud name, API key, and API secret to enable boutique image uploads.");
  const geminiKey = configured("GEMINI_API_KEY"), geminiModel = configured("GEMINI_MODEL");
  check("Gemini configuration", geminiKey && geminiModel, geminiKey || geminiModel, "Set both GEMINI_API_KEY and GEMINI_MODEL for AI preferences. Without either, styling uses the rules fallback.");
  const mailKeys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"], anyMail = mailKeys.some(configured), completeMail = mailKeys.every(configured) && mailConfiguration() !== null;
  check("Optional email notifications", completeMail, false, "Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD to send using your existing email account. Approval works without email.");
  check("Email verification policy", process.env.REQUIRE_EMAIL_VERIFICATION !== "true" || (completeMail && applicationUrl() !== null), process.env.REQUIRE_EMAIL_VERIFICATION === "true", "Configure SMTP and a valid APP_URL before requiring verification, or keep REQUIRE_EMAIL_VERIFICATION=false.");
  check("SMTP port", !anyMail || [465, 587].includes(Number(process.env.SMTP_PORT ?? 587)), anyMail, "Use SMTP_PORT=587 (STARTTLS) or 465 (TLS).");
  const googleId = configured("AUTH_GOOGLE_ID"), googleSecret = configured("AUTH_GOOGLE_SECRET");
  check("Google sign-in configuration", googleId === googleSecret, googleId || googleSecret, "Set both AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET, or leave both unset.");
  const exposed = Object.keys(process.env).filter(name => /^NEXT_PUBLIC_/i.test(name) && /SECRET|PASSWORD|PRIVATE|API_KEY|DATABASE_URL/i.test(name) && configured(name));
  check("Server secret exposure", exposed.length === 0, true, "Remove server credentials from NEXT_PUBLIC_ variables.");
  check("Generated Prisma client", existsSync(resolve("src/generated/prisma/client.ts")), true, "Run npm run db:generate.");

  if (validDatabase) {
    const db = new PrismaClient();
    try {
      await db.$queryRaw`SELECT 1`;
      check("Database connectivity", true, true, "Database connection succeeded.");
      try {
        const migrations = await db.$queryRaw<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
        const expected = readdirSync(resolve("prisma/migrations"), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
        const applied = new Set(migrations.filter(migration => migration.finished_at && !migration.rolled_back_at).map(migration => migration.migration_name));
        const missing = expected.filter(name => !applied.has(name));
        const unfinished = migrations.some(migration => !migration.finished_at && !migration.rolled_back_at);
        check("Database migrations", missing.length === 0 && !unfinished, true, `${missing.length} migrations pending${unfinished ? "; an unfinished migration needs attention" : ""}. Run npm run db:migrate.`);
      } catch { check("Database migrations", false, true, "Migration history is unavailable. Run npm run db:migrate against the deployment database."); }
      try {
        const [categories, admins] = await Promise.all([db.category.count({ where: { isActive: true } }), db.user.count({ where: { role: "ADMIN", isActive: true, ...(configured("ADMIN_EMAIL") ? { email: process.env.ADMIN_EMAIL!.trim().toLowerCase() } : {}) } })]);
        check("Category schema", true, true, `${categories} active category records. Original categories initialize on the first category request.`);
        check("Administrator account", admins > 0, true, "Provision the ADMIN_EMAIL account as an active administrator using npm run admin:provision.");
      } catch { check("Application schema", false, true, "Application tables are unavailable. Generate Prisma and apply all database migrations."); }
    } catch { check("Database connectivity", false, true, "Database connection failed. Verify credentials, network access, and SSL settings."); }
    finally { await db.$disconnect(); }
  }

  for (const item of checks) process.stdout.write(`${item.passed ? "PASS" : item.required ? "FAIL" : "OPTIONAL"} ${item.name}${item.passed ? "" : `: ${item.message}`}\n`);
  process.stdout.write("Checks are read-only. External uploads, AI responses, email delivery, hosting, backups, and monitoring still need deployment verification.\n");
  if (checks.some(item => item.required && !item.passed)) process.exitCode = 1;
}

main().catch(() => { process.stderr.write("Deployment checks could not finish. No credentials were printed.\n"); process.exitCode = 1; });
