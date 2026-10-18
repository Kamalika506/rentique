import { config } from "dotenv";
import { runNotificationJobs } from "../src/features/notifications/server";
import { prisma } from "../src/lib/prisma";
async function main() {
  config({ path: [".env.local", ".env"], quiet: true });
  try { console.log(await runNotificationJobs()); }
  finally { await prisma.$disconnect(); }
}
void main().catch(() => { console.error("Reservation jobs failed. Check database and provider configuration."); process.exitCode = 1; });
