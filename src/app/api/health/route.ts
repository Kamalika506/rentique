import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  await connection();
  try { await prisma.$queryRaw`SELECT 1`; return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
