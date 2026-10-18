import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { connection } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function endpoint(handler: (request: Request) => Promise<unknown>, status = 200) {
  return async (request: Request) => {
    // Keep live/authenticated responses out of the static shell. This also
    // leaves Next's prerender interruption outside the application error catch.
    await connection();
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        const origin = request.headers.get("origin");
        // Next can normalize request.url to its internal hostname. The Host
        // header preserves the browser-facing host, including the port.
        if (origin && new URL(origin).host !== (request.headers.get("host") ?? new URL(request.url).host)) throw new ApiError(403, "Request origin is not allowed.");
      }
      const result = await handler(request);
      return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ error: error instanceof z.ZodError ? error.issues[0].message : "Invalid JSON body." }, { status: 400 });
      if (typeof error === "object" && error && "code" in error && ["P2034", "P2002"].includes(String(error.code))) return Response.json({ error: "The record changed. Refresh and try again." }, { status: 409 });
      console.error("API request failed", error);
      return Response.json({ error: "Service unavailable. Please try again." }, { status: 503 });
    }
  };
}
export async function currentUser(role?: "CUSTOMER" | "ADMIN") {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Please sign in to continue.");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isActive || (role && user.role !== role && !(role === "CUSTOMER" && user.role === "BOUTIQUE_OWNER"))) throw new ApiError(403, "You do not have access to this operation.");
  return user;
}
export async function ownedBoutique(approved = true) {
  const user = await currentUser();
  const boutique = await prisma.boutique.findUnique({ where: { ownerId: user.id } });
  if (!boutique || user.role !== "BOUTIQUE_OWNER" || (approved && boutique.status !== "APPROVED")) throw new ApiError(403, "An approved boutique is required. Check your application status.");
  return { user, boutique };
}
